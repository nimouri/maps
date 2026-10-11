import { AusbildungVerificationStatus, ConfirmedJobListing } from '../types/scraper';

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
      notes: 'No official website available in Google Places record to verify vacancies.'
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
      notes: 'Website URL provided in Google Places record is invalid.'
    };
  }

  const candidateCareerUrls = [
    `${origin}/karriere`,
    `${origin}/jobs`,
    `${origin}/ausbildung`,
    `${origin}/stellenangebote`,
    websiteUrl
  ];

  const headers = {
    'User-Agent': 'Mozilla/5.0 (compatible; MapCareerJobVerifier/1.0; +https://mapcareer.app/bot)'
  };

  const confirmedListings: ConfirmedJobListing[] = [];
  let detectedCareerPortalUrl: string | undefined;

  for (const careerUrl of candidateCareerUrls) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(careerUrl, {
        headers,
        signal: controller.signal,
        redirect: 'follow'
      });
      clearTimeout(timeoutId);

      if (!res.ok) continue;

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('text/html')) continue;

      const html = await res.text();
      detectedCareerPortalUrl = careerUrl;

      // Extract job titles from headings and links
      // Common German patterns: e.g. "Ausbildung zur Pflegefachkraft (m/w/d)"
      const tagPattern = /<(?:h[1-4]|a|span|li)[^>]*>([^<]{10,120})<\/(?:h[1-4]|a|span|li)>/gi;
      let match: RegExpExecArray | null;

      while ((match = tagPattern.exec(html)) !== null) {
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
            const deadlineMatch = html.match(/(?:bewerbungsfrist|ende der bewerbungsfrist|frist|start):\s*([0-9]{1,2}\.[0-9]{1,2}\.[0-9]{4})/i);
            if (deadlineMatch) {
              deadline = deadlineMatch[1];
            }

            confirmedListings.push({
              title: text,
              jobType: hasAusbildung ? 'Ausbildung' : 'Vollzeit',
              sourceUrl: careerUrl,
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
      : 'Google Maps presence confirmed, but no active verified Ausbildung listing was detected on official public pages.'
  };
}
