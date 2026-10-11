// MapCareer Google Maps In-Page Scraper
// Executes inside the live Google Maps tab in the user's browser

// update here if Google changes its HTML
const SELECTORS = {
  feed: 'div[role="feed"]',
  card: 'div.Nv2PK',
  cardLink: 'a.hfpxzc',
  name: '.qBF1Pd, div.fontHeadlineSmall',
  rating: 'span.MW4etd',
  reviewsCount: 'span.UY7F9',
  infoLines: '.W4Efsd',
  websiteLink: 'a[data-value="Website"], a.lcr4fd[href^="http"]',
  endOfListMarker: 'span.HlvSq, .PbZDve',
  consentAgreeButton: 'form[action*="consent"] button, button[aria-label*="Alle akzeptieren"], button[aria-label*="Accept all"]'
};

(function() {
  console.log('[MapCareer Maps Scraper] Activated on Google Maps tab.');

  // Handle Google GDPR/Cookie consent popup if present
  function handleConsentDialog() {
    try {
      const consentBtn = document.querySelector(SELECTORS.consentAgreeButton);
      if (consentBtn) {
        console.log('[MapCareer] Dismissing Google consent prompt...');
        consentBtn.click();
      }
    } catch (_) {}
  }

  // Parse accurate coordinates from URL
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

  // Extract real place ID from place link (!1s0x...:0x...)
  function parsePlaceId(url) {
    if (!url || typeof url !== 'string') return '';
    const match = url.match(/!1s(0x[0-9a-fA-F]+:0x[0-9a-fA-F]+)/);
    if (match) {
      return match[1];
    }
    return url;
  }

  // Split text into tokens by newlines and '·'
  function tokenizeText(text) {
    if (!text || typeof text !== 'string') return [];
    return text
      .split(/[\n\r·]+/)
      .map(t => t.trim())
      .filter(Boolean);
  }

  // Check if token qualifies as a phone number
  function isPhoneToken(token) {
    if (!token) return false;
    // Accept only a token made ONLY of digits, spaces, + ( ) / -
    if (!/^[0-9\s+()/-]+$/.test(token)) {
      return false;
    }
    // With at least 8 digits
    const digitsOnly = token.replace(/\D/g, '');
    return digitsOnly.length >= 8;
  }

  // Check if token qualifies as an address
  function isAddressToken(token) {
    if (!token) return false;
    // Accept only a token matching /^[^\d]{3,}\s\d+\s?\w?(,|$)/
    if (!/^[^\d]{3,}\s\d+\s?\w?(,|$)/.test(token)) {
      return false;
    }
    // Must not be a phone
    if (isPhoneToken(token)) {
      return false;
    }
    // Must not be opening hours, rating, or google text
    const lower = token.toLowerCase();
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
      /^\d([.,]\d)?$/.test(token)
    ) {
      return false;
    }
    return true;
  }

  // Check if end-of-list marker is visible
  function isEndOfList(feed) {
    if (document.querySelector(SELECTORS.endOfListMarker)) return true;
    const feedText = feed.innerText || '';
    if (
      feedText.includes('Ende der Liste') ||
      feedText.includes("You've reached the end of the list") ||
      feedText.includes('Sie haben das Ende der Liste erreicht')
    ) {
      return true;
    }
    return false;
  }

  // Main scraper function
  async function scrapeFeed(maxResults = 10) {
    handleConsentDialog();

    // Locate results feed
    let feed = null;
    for (let attempts = 0; attempts < 15; attempts++) {
      handleConsentDialog();
      feed = document.querySelector(SELECTORS.feed);
      if (feed) break;
      await new Promise(r => setTimeout(r, 400));
    }

    if (!feed) {
      console.warn('[MapCareer] Results feed not found on Google Maps.');
      return [];
    }

    // Scroll feed to load items up to maxResults
    let lastCount = 0;
    let stagnantScrolls = 0;

    while (true) {
      const currentCards = feed.querySelectorAll(SELECTORS.card);
      if (currentCards.length >= maxResults) break;
      if (isEndOfList(feed)) break;

      if (currentCards.length === lastCount) {
        stagnantScrolls++;
        if (stagnantScrolls >= 4) {
          console.log('[MapCareer] Card count has not grown for 4 consecutive scrolls, stopping.');
          break;
        }
      } else {
        stagnantScrolls = 0;
        lastCount = currentCards.length;
        try {
          chrome.runtime.sendMessage({ action: 'SCRAPE_PROGRESS', currentCount: currentCards.length });
        } catch (_) {}
      }

      feed.scrollTop = feed.scrollHeight;
      // Wait a random 900-1500 ms between scrolls
      const waitMs = Math.floor(Math.random() * (1500 - 900 + 1)) + 900;
      await new Promise(r => setTimeout(r, waitMs));
    }

    // Extract cards
    const cards = feed.querySelectorAll(SELECTORS.card);
    const results = [];
    const seenPlaceIds = new Set();

    for (const card of cards) {
      if (results.length >= maxResults) break;

      // Extract Name
      const nameEl = card.querySelector(SELECTORS.name);
      const name = nameEl?.innerText.trim();
      if (!name) continue;

      // Extract Link & Place ID
      const linkEl = card.querySelector(SELECTORS.cardLink);
      const mapsUrl = linkEl?.href || window.location.href;
      const placeId = parsePlaceId(mapsUrl) || mapsUrl;

      // Deduplicate results by Place ID
      if (seenPlaceIds.has(placeId)) continue;
      seenPlaceIds.add(placeId);

      // Extract Coordinates (no default fallback)
      const coords = parseCoordinates(mapsUrl);

      // Extract Rating & Reviews
      const ratingEl = card.querySelector(SELECTORS.rating);
      const reviewsEl = card.querySelector(SELECTORS.reviewsCount);
      const rating = ratingEl ? parseFloat(ratingEl.innerText.replace(',', '.')) : undefined;
      const reviewsCount = reviewsEl ? parseInt(reviewsEl.innerText.replace(/[^0-9]/g, ''), 10) : undefined;

      // Extract metadata tokens
      const textLines = Array.from(card.querySelectorAll(SELECTORS.infoLines))
        .map(el => el.innerText.trim())
        .filter(Boolean);
      const allTokens = tokenizeText(textLines.join('\n'));

      // Extract Website if link exists on card
      const websiteEl = card.querySelector(SELECTORS.websiteLink);
      const website = websiteEl?.href || undefined;

      // Phone: accept only a token made ONLY of digits, spaces, + ( ) / - with >= 8 digits
      let phone = undefined;
      for (const token of allTokens) {
        if (isPhoneToken(token)) {
          phone = token;
          break;
        }
      }

      // Address: accept only a token matching /^[^\d]{3,}\s\d+\s?\w?(,|$)/ that is not phone, opening hours or rating
      let address = undefined;
      for (const token of allTokens) {
        if (isAddressToken(token)) {
          address = token;
          break;
        }
      }

      results.push({
        id: placeId,
        placeId: placeId,
        name: name,
        address: address, // undefined if cannot be read
        phone: phone,     // undefined if cannot be read
        website: website,
        rating: isNaN(rating) ? undefined : rating,
        reviewsCount: isNaN(reviewsCount) ? undefined : reviewsCount,
        lat: coords?.lat,
        lng: coords?.lng,
        mapsUrl: mapsUrl,
        placeTypes: [],
        providerAttribution: 'Google Maps (extension)',
        discoveredAt: new Date().toISOString(),
        emailStatus: 'not_checked',
        allDiscoveredEmails: []
      });
    }

    return results;
  }

  // Listen for background requests
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'EXECUTE_SCRAPE') {
      scrapeFeed(request.maxResults || 10)
        .then(companies => {
          sendResponse({ success: true, companies });
        })
        .catch(err => {
          sendResponse({ success: false, error: err.message });
        });
      return true; // Keep message channel open for async response
    }
  });
})();
