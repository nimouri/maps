import { AusbildungVerificationStatus, ConfirmedJobListing } from '../types/scraper';
import { safeFetch } from './ssrfGuard';

export interface JobVerificationResult {
  status: AusbildungVerificationStatus;
  listings: ConfirmedJobListing[];
  careerPortalUrl?: string;
  verifiedAt: string;
  notes: string;
}

const AUSBILDUNG_KEYWORDS = [
  'ausbildung',
  'ausbildungsplatz',
  'azubi',
  'duales studium',
  'lehrstelle',
  'lehrling',
  'berufsausbildung'
];

function sanitizeSnippet(text: string): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, 300);
}

/**
 * Extracts links matching career or job keywords from HTML
 */
function extractCareerLinks(html: string, baseUrl: string): string[] {
  const linkPattern = /<a[^>]+href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi;
  const discoveredUrls = new Set<string>();
  const keywords = ['karriere', 'jobs', 'ausbildung', 'stellen', 'career', 'stellenangebote', 'arbeiten', 'azubi'];

  let match: RegExpExecArray | null;
  while ((match = linkPattern.exec(html)) !== null) {
    const href = match[1].trim();
    const anchorText = match[2].toLowerCase();

    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) {
      continue;
    }

    try {
      const resolved = new URL(href, baseUrl);
      const isSameHost = resolved.hostname === new URL(baseUrl).hostname;
      if (!isSameHost) continue;

      const pathAndText = (resolved.pathname + ' ' + anchorText).toLowerCase();
      const isRelevant = keywords.some(kw => pathAndText.includes(kw));

      if (isRelevant) {
        discoveredUrls.add(resolved.href);
      }
    } catch {
      continue;
    }
  }

  return Array.from(discoveredUrls);
}

export async function verifyCompanyJobs(
  websiteUrl?: string,
  targetQuery?: string,
  timeoutMs: number = 7000
): Promise<JobVerificationResult> {
  const timestamp = new Date().toISOString();

  if (!websiteUrl || !websiteUrl.trim()) {
    return {
      status: 'unverified',
      listings: [],
      verifiedAt: timestamp,
      notes: 'No official website available in business record to verify vacancies.'
    };
  }

  let origin: string;
  try {
    const parsed = new URL(websiteUrl);
    origin = parsed.origin;
  } catch {
    return {
      status: 'unverified',
      listings: [],
      verifiedAt: timestamp,
      notes: 'Website URL provided in business record is invalid.'
    };
  }

  // 1. First safely fetch homepage to harvest actual navigation links
  const homeFetch = await safeFetch(websiteUrl, { timeoutMs: 5000 });
  const navigationLinks = homeFetch && homeFetch.ok ? extractCareerLinks(homeFetch.text, homeFetch.finalUrl) : [];

  // Fallback candidate career paths if navigation links were sparse
  const fallbackCareerUrls = [
    `${origin}/karriere`,
    `${origin}/jobs`,
    `${origin}/ausbildung`,
    `${origin}/stellenangebote`
  ];

  // Combine discovered links with common fallbacks, deduplicated
  const candidateCareerUrls = Array.from(new Set([...navigationLinks, ...fallbackCareerUrls, websiteUrl]));

  const confirmedListings: ConfirmedJobListing[] = [];
  let detectedCareerPortalUrl: string | undefined;

  // Probe candidates using SSRF-guarded safeFetch
  for (const careerUrl of candidateCareerUrls.slice(0, 6)) {
    try {
      let pageHtml = '';
      let pageFinalUrl = careerUrl;

      if (homeFetch && homeFetch.finalUrl === careerUrl) {
        pageHtml = homeFetch.text;
      } else {
        const fetchRes = await safeFetch(careerUrl, { timeoutMs: 5000 });
        if (!fetchRes || !fetchRes.ok) continue;
        pageHtml = fetchRes.text;
        pageFinalUrl = fetchRes.finalUrl;
      }

      detectedCareerPortalUrl = pageFinalUrl;

      // Extract job titles from headings and links
      // Common German patterns: e.g. "Ausbildung zur Pflegefachkraft (m/w/d)"
      const tagPattern = /<(?:h[1-4]|a|span|li)[^>]*>([^<]{10,120})<\/(?:h[1-4]|a|span|li)>/gi;
      let match: RegExpExecArray | null;

      while ((match = tagPattern.exec(pageHtml)) !== null) {
        const text = match[1].replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').trim();
        const lower = text.toLowerCase();

        // Ignore generic category titles or navigation labels
        const isGenericSectionHeader = /^(aktuelle|unsere|offene|freie|alle)?\s*(ausbildungsangebote|stellenangebote|ausbildungsplätze|stellen|jobs|berufsangebote|karriere)$/i.test(lower);
        if (isGenericSectionHeader) continue;

        // Check if contains gender diversity markers common in real DACH job titles
        const hasDiversityMarker = /\((?:m\/w\/d|w\/m\/d|d\/m\/w|gn)\)/i.test(text);
        const hasAusbildung = AUSBILDUNG_KEYWORDS.some(k => lower.includes(k));
        const matchesQuery = targetQuery && lower.includes(targetQuery.toLowerCase());

        if ((hasDiversityMarker || matchesQuery || (hasAusbildung && text.length > 25)) && text.length >= 10 && text.length <= 110) {
          // Avoid duplicate titles
          if (!confirmedListings.some(l => l.title.toLowerCase() === text.toLowerCase())) {
            
            // Check for published deadline in nearby text
            let deadline: string | undefined;
            const deadlineMatch = pageHtml.match(/(?:bewerbungsfrist|ende der bewerbungsfrist|frist|start):\s*([0-9]{1,2}\.[0-9]{1,2}\.[0-9]{4})/i);
            if (deadlineMatch) {
              deadline = deadlineMatch[1];
            }

            confirmedListings.push({
              title: text,
              jobType: hasAusbildung ? 'Ausbildung' : 'Vollzeit',
              sourceUrl: pageFinalUrl,
              verifiedAt: timestamp,
              deadline,
              snippet: sanitizeSnippet(text)
            });
          }
        }

        if (confirmedListings.length >= 6) break;
      }

      if (confirmedListings.length > 0) break;

    } catch {
      continue;
    }
  }

  const hasConfirmedAusbildung = confirmedListings.some(l => l.jobType === 'Ausbildung');

  return {
    status: hasConfirmedAusbildung ? 'confirmed_listing' : 'unverified',
    listings: confirmedListings,
    careerPortalUrl: detectedCareerPortalUrl,
    verifiedAt: timestamp,
    notes: hasConfirmedAusbildung
      ? `Confirmed ${confirmedListings.length} actual job/Ausbildung vacancies with attributable source URL on official portal.`
      : 'Business presence confirmed on map, but no active verified Ausbildung listing was detected on public career pages.'
  };
}
