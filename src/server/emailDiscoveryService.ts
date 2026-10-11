import { EmailDiscoveryStatus } from '../types/scraper';
import { safeFetch } from './ssrfGuard';

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
  const mailtoMatches = Array.from(html.matchAll(/mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi))
    .map(m => m[1].toLowerCase());

  const textMatches = Array.from(html.matchAll(/\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/gi))
    .map(m => m[1].toLowerCase());

  return Array.from(new Set([...mailtoMatches, ...textMatches])).filter(isValidEmail);
}

/**
 * Parses internal links from page HTML matching career, contact, or legal keywords.
 */
function extractRelevantLinks(html: string, baseUrl: string): string[] {
  const linkPattern = /<a[^>]+href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi;
  const discoveredUrls = new Set<string>();
  const keywords = ['karriere', 'jobs', 'ausbildung', 'kontakt', 'contact', 'impressum', 'stellen'];

  let match: RegExpExecArray | null;
  while ((match = linkPattern.exec(html)) !== null) {
    const href = match[1].trim();
    const anchorText = match[2].toLowerCase();

    // Skip mailto, tel, javascript, fragments
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) {
      continue;
    }

    try {
      const resolved = new URL(href, baseUrl);
      const isSameHost = resolved.hostname === new URL(baseUrl).hostname;
      if (!isSameHost) continue; // Only follow internal links

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
      notes: 'No official website provided in business record.'
    };
  }

  // 1. Initial homepage safe fetch (with SSRF protection)
  const homeFetch = await safeFetch(websiteUrl, { timeoutMs });
  if (!homeFetch || !homeFetch.ok) {
    return {
      status: 'no_email_found',
      discoveredAt: timestamp,
      allEmails: [],
      notes: 'Website could not be reached safely or was blocked by SSRF filter.'
    };
  }

  const discoveredMap = new Map<string, { email: string; sourceUrl: string; isRecruitment: boolean }>();

  // Extract emails from homepage
  const homeEmails = extractEmailsFromHtml(homeFetch.text);
  for (const email of homeEmails) {
    const localPart = email.split('@')[0].toLowerCase();
    const isRecruitment = RECRUITMENT_PREFIXES.some(prefix => localPart.startsWith(prefix));
    discoveredMap.set(email, { email, sourceUrl: homeFetch.finalUrl, isRecruitment });
  }

  // 2. Extract actual navigation links from the homepage (Fix: link-following crawler)
  const navigationLinks = extractRelevantLinks(homeFetch.text, homeFetch.finalUrl);

  // Fallback candidate paths if navigation links were sparse
  const origin = new URL(homeFetch.finalUrl).origin;
  const fallbackPaths = [`${origin}/impressum`, `${origin}/kontakt`, `${origin}/karriere`, `${origin}/jobs`];
  
  // Combine discovered real links with common fallback paths, deduplicated
  const urlsToProbe = Array.from(new Set([...navigationLinks, ...fallbackPaths]));

  // Probe up to 6 discovered relevant links (Fix: no more slice(0, 3) cutoff)
  for (const probeUrl of urlsToProbe.slice(0, 6)) {
    if (probeUrl === homeFetch.finalUrl) continue;

    const probeResult = await safeFetch(probeUrl, { timeoutMs: 4000 });
    if (!probeResult || !probeResult.ok) continue;

    const pageEmails = extractEmailsFromHtml(probeResult.text);
    const isCareerPage = /karriere|jobs|ausbildung|career/i.test(probeResult.finalUrl);

    for (const email of pageEmails) {
      const localPart = email.split('@')[0].toLowerCase();
      const isRecruitPrefix = RECRUITMENT_PREFIXES.some(prefix => localPart.startsWith(prefix));
      const isRecruitment = isRecruitPrefix || isCareerPage;

      if (!discoveredMap.has(email) || isRecruitment) {
        discoveredMap.set(email, {
          email,
          sourceUrl: probeResult.finalUrl,
          isRecruitment
        });
      }
    }

    // If a verified recruitment email is found on a career page, stop early to be efficient
    const hasRecruitment = Array.from(discoveredMap.values()).some(e => e.isRecruitment);
    if (hasRecruitment) break;
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
  const targetHost = new URL(websiteUrl).hostname.replace(/^www\./, '').toLowerCase();

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
