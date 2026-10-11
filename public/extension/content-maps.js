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

  // Parses coordinates from URL string: e.g. /@48.137,11.575,15z
  function parseCoordinates(url) {
    if (!url) return null;
    const match = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (match) {
      return {
        lat: parseFloat(match[1]),
        lng: parseFloat(match[2])
      };
    }
    return null;
  }

  // Scrapes the results feed
  async function scrapeFeed(maxResults = 10) {
    dismissConsent();

    // Check if Google Maps redirected directly to a single result
    const singleHeadline = document.querySelector('h1.DUwDvf');
    if (singleHeadline && !document.querySelector('div[role="feed"]')) {
      const name = singleHeadline.innerText.trim();
      const coords = parseCoordinates(window.location.href);
      const addressBtn = document.querySelector('button[data-item-id="address"]');
      const phoneBtn = document.querySelector('button[data-item-id*="phone"]');
      const websiteLink = document.querySelector('a[data-item-id="authority"]');
      const ratingSpan = document.querySelector('span.MW4etd');
      const reviewsSpan = document.querySelector('span.UY7F9');

      return [{
        id: `gmap-single-${Date.now()}`,
        placeId: `gmap-single-${Date.now()}`,
        name: name,
        address: addressBtn?.innerText.trim() || 'Address on Google Maps',
        phone: phoneBtn?.innerText.trim() || undefined,
        website: websiteLink?.href || undefined,
        rating: ratingSpan ? parseFloat(ratingSpan.innerText.replace(',', '.')) : undefined,
        reviewsCount: reviewsSpan ? parseInt(reviewsSpan.innerText.replace(/[^0-9]/g, ''), 10) : undefined,
        lat: coords?.lat || 51.1657,
        lng: coords?.lng || 10.4515,
        mapsUrl: window.location.href,
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
    while (scrollTries < 10) {
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
    const seenNames = new Set();

    for (const card of cards) {
      if (results.length >= maxResults) break;

      // Extract Name
      const nameEl = card.querySelector('.qBF1Pd, div.fontHeadlineSmall');
      const name = nameEl?.innerText.trim();
      if (!name || seenNames.has(name)) continue;
      seenNames.add(name);

      // Extract Link & Coords
      const linkEl = card.querySelector('a.hfpxzc');
      const mapsUrl = linkEl?.href || window.location.href;
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

      // Extract Address from line
      const addressLine = textLines.find(line => /\d+/.test(line) && !line.includes('·') && !line.includes('€')) || combinedInfo.split('·')[1]?.trim() || 'Address on Google Maps';

      results.push({
        id: `gmap-${Date.now()}-${results.length}`,
        placeId: `gmap-${Date.now()}-${results.length}`,
        name: name,
        address: addressLine,
        phone: phone,
        website: website,
        rating: isNaN(rating) ? undefined : rating,
        reviewsCount: isNaN(reviewsCount) ? undefined : reviewsCount,
        lat: coords?.lat || 51.1657,
        lng: coords?.lng || 10.4515,
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
