import { EmailDiscoveryStatus } from '../types/scraper';

export interface EmailDiscoveryResult {
  status: EmailDiscoveryStatus;
  primaryEmail?: string;
  sourceUrl?: string;
  discoveredAt: string;
  allEmails: string[];
  notes?: string;
}

// Ignore common dummy, CDN, tracker or third-party vendor false-positives
const IGNORED_DOMAINS = new Set([
  'example.com',
  'domain.com',
  'sentry.io',
  'wixpress.com',
  'wordpress.org',
  'schema.org',
  'googleapis.com',
  'cloudflare.com',
  'vimeo.com',
  'osmfoundation.org',
  'fontawesome.com',
  'defiant.com',
  'cookiebot.com',
  'usercentrics.eu',
  'usercentrics.com',
  'google.com',
  'facebook.com',
  'twitter.com',
  'apple.com'
]);

const RECRUITMENT_PREFIXES = ['bewerbung', 'jobs', 'karriere', 'personal', 'recruiting', 'hr', 'ausbildung'];

function isValidEmail(candidate: string): boolean {
  if (!candidate || candidate.length > 80) return false;
  // Exclude file extensions commonly matched in URLs
  if (/\.(png|jpg|jpeg|gif|svg|webp|css|js|woff|woff2)$/i.test(candidate)) return false;
  
  const parts = candidate.split('@');
  if (parts.length !== 2) return false;
  const domain = parts[1].toLowerCase();
  
  if (IGNORED_DOMAINS.has(domain)) return false;
  if (!domain.includes('.')) return false;
  
  return true;
}

function extractEmailsFromHtml(html: string): string[] {
  // Matches standard emails and mailto: links
  const mailtoMatches = Array.from(html.matchAll(/mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi))
    .map(m => m[1].toLowerCase());

  const textMatches = Array.from(html.matchAll(/\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/gi))
    .map(m => m[1].toLowerCase());

  const combined = Array.from(new Set([...mailtoMatches, ...textMatches]))
    .filter(isValidEmail);

  return combined;
}

export async function discoverCompanyEmail(
  websiteUrl?: string,
  timeoutMs: number = 6000
): Promise<EmailDiscoveryResult> {
  const timestamp = new Date().toISOString();

  if (!websiteUrl || !websiteUrl.trim()) {
    return {
      status: 'no_email_found',
      discoveredAt: timestamp,
      allEmails: [],
      notes: 'No official website provided in Google Places record.'
    };
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(websiteUrl);
  } catch {
    return {
      status: 'no_email_found',
      discoveredAt: timestamp,
      allEmails: [],
      notes: 'Website URL provided in Google Places record is invalid.'
    };
  }

  const origin = parsedUrl.origin;
  const urlsToProbe = [
    parsedUrl.href,
    `${origin}/impressum`,
    `${origin}/kontakt`,
    `${origin}/karriere`,
    `${origin}/jobs`
  ];

  const headers = {
    'User-Agent': 'Mozilla/5.0 (compatible; MapCareerJobVerifier/1.0; +https://mapcareer.app/bot)'
  };

  const discoveredMap = new Map<string, { email: string; sourceUrl: string; isRecruitment: boolean }>();

  // Probe pages sequentially with tight timeout
  for (const targetUrl of urlsToProbe.slice(0, 3)) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(targetUrl, {
        headers,
        signal: controller.signal,
        redirect: 'follow'
      });
      clearTimeout(timeoutId);

      if (!res.ok) continue;

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('text/html')) continue;

      const html = await res.text();
      const emails = extractEmailsFromHtml(html);

      const isCareerPage = /karriere|jobs|ausbildung|career/i.test(targetUrl);

      for (const email of emails) {
        const localPart = email.split('@')[0].toLowerCase();
        const isRecruitPrefix = RECRUITMENT_PREFIXES.some(prefix => localPart.startsWith(prefix));
        const isRecruitment = isRecruitPrefix || isCareerPage;

        if (!discoveredMap.has(email) || isRecruitment) {
          discoveredMap.set(email, {
            email,
            sourceUrl: targetUrl,
            isRecruitment
          });
        }
      }

      // If we found a verified recruitment email, we can stop early
      const foundRecruit = Array.from(discoveredMap.values()).some(e => e.isRecruitment);
      if (foundRecruit) break;

    } catch {
      // Ignore network errors on optional probes
      continue;
    }
  }

  if (discoveredMap.size === 0) {
    return {
      status: 'no_email_found',
      discoveredAt: timestamp,
      allEmails: [],
      notes: 'No public email found across crawled website and contact pages.'
    };
  }

  const entries = Array.from(discoveredMap.values());
  const targetHost = parsedUrl.hostname.replace(/^www\./, '').toLowerCase();

  // Prioritize domain-matching recruitment emails, then recruitment emails, then domain-matching general emails
  const sorted = entries.sort((a, b) => {
    const aHostMatch = a.email.toLowerCase().endsWith(targetHost) ? 1 : 0;
    const bHostMatch = b.email.toLowerCase().endsWith(targetHost) ? 1 : 0;
    const aScore = (a.isRecruitment ? 2 : 0) + aHostMatch;
    const bScore = (b.isRecruitment ? 2 : 0) + bHostMatch;
    return bScore - aScore;
  });

  const selected = sorted[0];

  return {
    status: selected.isRecruitment ? 'website_recruitment_email' : 'website_general_email',
    primaryEmail: selected.email,
    sourceUrl: selected.sourceUrl,
    discoveredAt: timestamp,
    allEmails: entries.map(e => e.email),
    notes: selected.isRecruitment
      ? 'Recruitment or HR email located directly on public career/contact page.'
      : 'General business contact email found on public website (not verified for direct applications).'
  };
}
