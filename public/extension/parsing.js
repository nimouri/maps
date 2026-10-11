// MapCareer Shared Maps Parsing Functions
// Used as a browser content script (globalThis.MapCareerParsing)
// and in Node.js (CommonJS module.exports).

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    // Node.js CommonJS
    module.exports = factory();
  } else {
    // Browser global
    root.MapCareerParsing = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  /**
   * Parse accurate coordinates from Google Maps URL.
   * Primary: /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/
   * Secondary fallback: @lat,lng
   */
  function parseCoordinates(url) {
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

  /**
   * Extract real place ID from place link (!1s0x...:0x...).
   * Falls back to full URL if missing.
   */
  function parsePlaceId(url) {
    if (!url || typeof url !== 'string') return '';
    const match = url.match(/!1s(0x[0-9a-fA-F]+:0x[0-9a-fA-F]+)/);
    if (match) {
      return match[1];
    }
    return url;
  }

  /**
   * Split text into tokens by newlines and '·'.
   */
  function tokenizeText(text) {
    if (!text || typeof text !== 'string') return [];
    return text
      .split(/[\n\r·]+/)
      .map(t => t.trim())
      .filter(Boolean);
  }

  /**
   * Check if token qualifies as a phone number.
   * Must consist ONLY of digits, spaces, +, (, ), /, -
   * and must contain at least 8 digits.
   */
  function isPhoneToken(token) {
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

  /**
   * Parse phone from string or tokens list.
   */
  function parsePhone(textOrTokens) {
    const tokens = Array.isArray(textOrTokens) ? textOrTokens : tokenizeText(textOrTokens);
    for (const token of tokens) {
      if (isPhoneToken(token)) {
        return token;
      }
    }
    return undefined;
  }

  /**
   * Check if token qualifies as an address.
   * Matches /^[^\d]{3,}\s\d+\s?\w?(,|$)/ and is not phone, opening hours or rating.
   */
  function isAddressToken(token) {
    if (!token || typeof token !== 'string') return false;
    const clean = token.trim();
    if (!clean) return false;

    // Accept only a token matching /^[^\d]{3,}\s\d+\s?\w?(,|$)/
    if (!/^[^\d]{3,}\s\d+\s?\w?(,|$)/.test(clean)) {
      return false;
    }

    // Must not be a phone
    if (isPhoneToken(clean)) {
      return false;
    }

    // Must not be opening hours, rating, or google text
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

  /**
   * Parse address from string or tokens list.
   */
  function parseAddress(textOrTokens) {
    const tokens = Array.isArray(textOrTokens) ? textOrTokens : tokenizeText(textOrTokens);
    for (const token of tokens) {
      if (isAddressToken(token)) {
        return token;
      }
    }
    return undefined;
  }

  return {
    parseCoordinates,
    parsePlaceId,
    tokenizeText,
    isPhoneToken,
    parsePhone,
    isAddressToken,
    parseAddress,
    // Aliases for compatibility
    tokenizeCardText: tokenizeText,
    isCandidatePhone: isPhoneToken,
    isCandidateAddress: isAddressToken
  };
});
