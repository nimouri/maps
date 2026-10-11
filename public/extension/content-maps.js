// MapCareer Google Maps In-Page Scraper
// Executes inside the live Google Maps tab in the user's browser

(function() {
  console.log('[MapCareer Maps Scraper] Activated on Google Maps tab.');

  // Handle Google GDPR/Cookie consent popup if present
  function dismissConsent() {
    const consentButtons = [
      'button[aria-label*="Alle akzeptieren"]',
      'button[aria-label*="Accept all"]',
      'button[aria-label*="Tout accepter"]',
      'form[action*="consent"] button',
      'button.VfPpkd-LgbsSe[jsname]'
    ];

    for (const selector of consentButtons) {
      const btn = document.querySelector(selector);
      if (btn && btn.offsetParent !== null) {
        btn.click();
        console.log('[MapCareer] Dismissed cookie consent dialog.');
        break;
      }
    }
  }

  // Parses coordinates from URL string:
  // Primary pattern from card data: /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/
  // Secondary fallback pattern: /@(-?\d+\.\d+),(-?\d+\.\d+)/
  function parseCoordinates(url) {
    if (!url) {
      console.warn('[MapCareer] Coordinate parse skipped: empty URL');
      return null;
    }

    const dataMatch = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
    if (dataMatch) {
      return {
        lat: parseFloat(dataMatch[1]),
        lng: parseFloat(dataMatch[2])
      };
    }

    const atMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (atMatch) {
      return {
        lat: parseFloat(atMatch[1]),
        lng: parseFloat(atMatch[2])
      };
    }

    console.warn('[MapCareer] Could not parse coordinates from Maps URL:', url);
    return null;
  }

  // Parses Google Place ID from the result link: !1s(0x[0-9a-fA-F]+:[0-9a-fA-F]+)
  // or falls back to full URL
  function parsePlaceId(url) {
    if (!url) return null;
    const match = url.match(/!1s(0x[0-9a-fA-F]+:[0-9a-fA-F]+)/);
    if (match) {
      return match[1];
    }
    // Also support ChIJ format if present
    const chijMatch = url.match(/!1s(ChIJ[A-Za-z0-9_-]+)/);
    if (chijMatch) {
      return chijMatch[1];
    }
    return url;
  }

  // Scrapes the results feed
  async function scrapeFeed(maxResults = 10) {
    dismissConsent();

    // Check if Google Maps redirected directly to a single result
    const singleHeadline = document.querySelector('h1.DUwDvf');
    if (singleHeadline && !document.querySelector('div[role="feed"]')) {
      const name = singleHeadline.innerText.trim();
      const currentUrl = window.location.href;
      const coords = parseCoordinates(currentUrl);
      const placeId = parsePlaceId(currentUrl) || currentUrl;
      const addressBtn = document.querySelector('button[data-item-id="address"]');
      const phoneBtn = document.querySelector('button[data-item-id*="phone"]');
      const websiteLink = document.querySelector('a[data-item-id="authority"]');
      const ratingSpan = document.querySelector('span.MW4etd');
      const reviewsSpan = document.querySelector('span.UY7F9');

      const addressText = addressBtn?.innerText.trim();

      return [{
        id: placeId,
        placeId: placeId,
        name: name,
        address: addressText || undefined,
        phone: phoneBtn?.innerText.trim() || undefined,
        website: websiteLink?.href || undefined,
        rating: ratingSpan ? parseFloat(ratingSpan.innerText.replace(',', '.')) : undefined,
        reviewsCount: reviewsSpan ? parseInt(reviewsSpan.innerText.replace(/[^0-9]/g, ''), 10) : undefined,
        lat: coords?.lat,
        lng: coords?.lng,
        mapsUrl: currentUrl,
        placeTypes: [],
        providerAttribution: 'Google Maps (Live Browser Bridge)'
      }];
    }

    // Wait for the feed to appear
    let feed = null;
    for (let attempts = 0; attempts < 15; attempts++) {
      feed = document.querySelector('div[role="feed"]');
      if (feed) break;
      await new Promise(r => setTimeout(r, 400));
    }

    if (!feed) {
      console.warn('[MapCareer] Results feed not found on Google Maps.');
      return [];
    }

    // Scroll feed to load items up to maxResults
    let scrollTries = 0;
    while (scrollTries < 12) {
      const currentCards = feed.querySelectorAll('div.Nv2PK, a.hfpxzc');
      if (currentCards.length >= maxResults) break;

      feed.scrollTop = feed.scrollHeight;
      await new Promise(r => setTimeout(r, 600));
      scrollTries++;

      // Check for end of list marker
      if (document.querySelector('span.HlvSq')) break;
    }

    // Extract cards
    const cards = feed.querySelectorAll('div.Nv2PK');
    const results = [];
    const seenPlaceIds = new Set();

    for (const card of cards) {
      if (results.length >= maxResults) break;

      // Extract Name
      const nameEl = card.querySelector('.qBF1Pd, div.fontHeadlineSmall');
      const name = nameEl?.innerText.trim();
      if (!name) continue;

      // Extract Link & Place ID
      const linkEl = card.querySelector('a.hfpxzc');
      const mapsUrl = linkEl?.href || window.location.href;
      const placeId = parsePlaceId(mapsUrl) || mapsUrl;

      // Deduplicate results by genuine Place ID
      if (seenPlaceIds.has(placeId)) continue;
      seenPlaceIds.add(placeId);

      // Extract Coords
      const coords = parseCoordinates(mapsUrl);

      // Extract Rating & Reviews
      const ratingEl = card.querySelector('span.MW4etd');
      const reviewsEl = card.querySelector('span.UY7F9');
      const rating = ratingEl ? parseFloat(ratingEl.innerText.replace(',', '.')) : undefined;
      const reviewsCount = reviewsEl ? parseInt(reviewsEl.innerText.replace(/[^0-9]/g, ''), 10) : undefined;

      // Extract metadata lines (address, phone, type)
      const textLines = Array.from(card.querySelectorAll('.W4Efsd')).map(el => el.innerText.trim()).filter(Boolean);
      const combinedInfo = textLines.join(' · ');

      // Extract Website if link exists on card
      const websiteEl = card.querySelector('a[data-value="Website"], a.lcr4fd[href^="http"]');
      const website = websiteEl?.href || undefined;

      // Extract Phone number if present in text lines
      const phoneMatch = combinedInfo.match(/(?:\+49|0049|0[1-9][0-9\s/-]{5,20})/);
      const phone = phoneMatch ? phoneMatch[0].trim() : undefined;

      // Extract Address from line; if not readable leave undefined
      const addressLine = textLines.find(line => /\d+/.test(line) && !line.includes('·') && !line.includes('€')) || combinedInfo.split('·')[1]?.trim();
      const cleanAddress = addressLine && !addressLine.includes('Google Maps') ? addressLine : undefined;

      results.push({
        id: placeId,
        placeId: placeId,
        name: name,
        address: cleanAddress,
        phone: phone,
        website: website,
        rating: isNaN(rating) ? undefined : rating,
        reviewsCount: isNaN(reviewsCount) ? undefined : reviewsCount,
        lat: coords?.lat,
        lng: coords?.lng,
        mapsUrl: mapsUrl,
        placeTypes: [],
        providerAttribution: 'Google Maps (Live Browser Bridge)'
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
