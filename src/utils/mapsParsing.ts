// Shared Google Maps parsing functions
// Used by background/content scraper and test suites

export function parseCoordinates(url: string): { lat?: number; lng?: number } {
  if (!url || typeof url !== 'string') {
    return { lat: undefined, lng: undefined };
  }

  // Primary: /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/
  const dataMatch = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (dataMatch) {
    const lat = parseFloat(dataMatch[1]);
    const lng = parseFloat(dataMatch[2]);
    if (!isNaN(lat) && !isNaN(lng)) {
      return { lat, lng };
    }
  }

  // Secondary fallback: @lat,lng
  const atMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (atMatch) {
    const lat = parseFloat(atMatch[1]);
    const lng = parseFloat(atMatch[2]);
    if (!isNaN(lat) && !isNaN(lng)) {
      return { lat, lng };
    }
  }

  console.warn('[MapCareer] Could not parse coordinates from Maps URL:', url);
  return { lat: undefined, lng: undefined };
}

export function parsePlaceId(url: string): string {
  if (!url || typeof url !== 'string') return '';
  const match = url.match(/!1s(0x[0-9a-fA-F]+:0x[0-9a-fA-F]+)/);
  if (match) {
    return match[1];
  }
  return url;
}

export function tokenizeCardText(cardText: string): string[] {
  if (!cardText || typeof cardText !== 'string') return [];
  return cardText
    .split(/[\n\r·]+/)
    .map(t => t.trim())
    .filter(Boolean);
}

export function isCandidatePhone(token: string): boolean {
  if (!token || typeof token !== 'string') return false;
  const clean = token.trim();
  if (!clean) return false;

  // Accept only a token made ONLY of digits, spaces, + ( ) / -
  if (!/^[0-9\s+()/-]+$/.test(clean)) {
    return false;
  }

  // With at least 8 digits
  const digitsOnly = clean.replace(/\D/g, '');
  return digitsOnly.length >= 8;
}

export function parsePhone(textOrTokens: string | string[]): string | undefined {
  const tokens = Array.isArray(textOrTokens) ? textOrTokens : tokenizeCardText(textOrTokens);
  for (const token of tokens) {
    if (isCandidatePhone(token)) {
      return token;
    }
  }
  return undefined;
}

export function isCandidateAddress(token: string): boolean {
  if (!token || typeof token !== 'string') return false;
  const clean = token.trim();
  if (!clean) return false;

  // Accept only a token matching /^[^\d]{3,}\s\d+\s?\w?(,|$)/
  if (!/^[^\d]{3,}\s\d+\s?\w?(,|$)/.test(clean)) {
    return false;
  }

  // Must not be a phone
  if (isCandidatePhone(clean)) {
    return false;
  }

  // Must not be opening hours or rating
  const lower = clean.toLowerCase();
  if (
    lower.includes('geöffnet') ||
    lower.includes('geschlossen') ||
    lower.includes('open') ||
    lower.includes('closed') ||
    lower.includes('uhr') ||
    lower.includes('hours') ||
    lower.includes('sterne') ||
    lower.includes('star') ||
    lower.includes('google maps') ||
    /^\d([.,]\d)?$/.test(clean)
  ) {
    return false;
  }

  return true;
}

export function parseAddress(textOrTokens: string | string[]): string | undefined {
  const tokens = Array.isArray(textOrTokens) ? textOrTokens : tokenizeCardText(textOrTokens);
  for (const token of tokens) {
    if (isCandidateAddress(token)) {
      return token;
    }
  }
  return undefined;
}
