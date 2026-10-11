// MapCareer Extension Service Worker (Manifest V3)

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'SCRAPE_MAPS') {
    const { query, city, country, maxResults = 10 } = request;
    const targetUrl = `https://www.google.com/maps/search/${encodeURIComponent(`${query} in ${city}, ${country}`)}`;

    console.log(`[MapCareer Background] Launching search for "${query} in ${city}"...`);

    // Create an active tab to perform live browser scraping
    chrome.tabs.create({ url: targetUrl, active: false }, (tab) => {
      const tabId = tab.id;
      if (!tabId) {
        sendResponse({ success: false, error: 'Could not create Google Maps tab.' });
        return;
      }

      let timeoutHandle;

      // Listener for tab loading complete
      function onUpdated(updatedTabId, changeInfo) {
        if (updatedTabId === tabId && changeInfo.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(onUpdated);

          // Give Google Maps 2 seconds to load feed
          setTimeout(() => {
            chrome.tabs.sendMessage(tabId, { action: 'EXECUTE_SCRAPE', maxResults }, (response) => {
              clearTimeout(timeoutHandle);
              // Close the temporary scraper tab
              chrome.tabs.remove(tabId, () => {});

              if (chrome.runtime.lastError) {
                sendResponse({
                  success: false,
                  error: chrome.runtime.lastError.message || 'Scraping timed out or feed unreadable.'
                });
                return;
              }

              sendResponse(response || { success: false, companies: [] });
            });
          }, 2000);
        }
      }

      chrome.tabs.onUpdated.addListener(onUpdated);

      // 25 second watchdog timeout
      timeoutHandle = setTimeout(() => {
        chrome.tabs.onUpdated.removeListener(onUpdated);
        chrome.tabs.remove(tabId, () => {});
        sendResponse({ success: false, error: 'Google Maps scraping timed out after 25s.' });
      }, 25000);
    });

    return true; // Keep asynchronous message port open
  }
});
