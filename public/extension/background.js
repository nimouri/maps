// MapCareer Extension Service Worker (Manifest V3)

// Origins allowed to trigger scrape jobs
const ALLOWED_ORIGIN_PATTERNS = [
  /^http:\/\/localhost:3000\/?/,
  /^http:\/\/127\.0\.0\.1:3000\/?/,
  /^https:\/\/YOUR-DOMAIN-HERE\/?/,
  /^https:\/\/.*\.run\.app\/?/,
  /^https:\/\/.*\.aistudio\.google\.com\/?/
];

function isOriginAllowed(url) {
  if (!url) return false;
  return ALLOWED_ORIGIN_PATTERNS.some(pattern => pattern.test(url));
}

// Track pending scrape jobs by temporary window/tab id
const pendingJobs = new Map();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'SCRAPE_MAPS') {
    // Check sender origin
    const senderUrl = sender.tab?.url || sender.url || '';
    if (!isOriginAllowed(senderUrl)) {
      console.warn('[MapCareer Background] Rejected unauthorized scrape request from:', senderUrl);
      sendResponse({ success: false, error: 'Unauthorized origin.' });
      return false;
    }

    const { query, city, country, maxResults = 10 } = request;
    const targetUrl = `https://www.google.com/maps/search/${encodeURIComponent(`${query} in ${city}, ${country}`)}`;

    console.log(`[MapCareer Background] Launching popup window for "${query} in ${city}" (max: ${maxResults})...`);

    // Calculate watchdog timeout scaling with maxResults (min 20s, +1.5s per requested item, capped at 60s)
    const timeoutDuration = Math.min(Math.max(20000, 15000 + maxResults * 1500), 60000);

    // Open popup window to avoid Chrome background-tab throttling
    chrome.windows.create(
      {
        url: targetUrl,
        type: 'popup',
        focused: false,
        width: 900,
        height: 700
      },
      (createdWindow) => {
        if (!createdWindow || !createdWindow.tabs || !createdWindow.tabs[0]) {
          sendResponse({ success: false, error: 'Could not create Google Maps scraper window.' });
          return;
        }

        const windowId = createdWindow.id;
        const tabId = createdWindow.tabs[0].id;

        let isCompleted = false;

        const cleanup = () => {
          if (windowId) {
            chrome.windows.remove(windowId, () => {
              if (chrome.runtime.lastError) {
                // Window might already be closed by user
              }
            });
          }
          pendingJobs.delete(tabId);
        };

        // Watchdog timer
        const timeoutHandle = setTimeout(() => {
          if (isCompleted) return;
          isCompleted = true;
          chrome.tabs.onUpdated.removeListener(onUpdated);
          cleanup();
          sendResponse({
            success: false,
            error: `Google Maps scraping timed out after ${Math.round(timeoutDuration / 1000)}s.`
          });
        }, timeoutDuration);

        pendingJobs.set(tabId, { windowId, timeoutHandle });

        function onUpdated(updatedTabId, changeInfo) {
          if (updatedTabId === tabId && changeInfo.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(onUpdated);

            // Wait for dynamic React/JS render inside Google Maps tab
            setTimeout(() => {
              if (isCompleted) return;

              chrome.tabs.sendMessage(tabId, { action: 'EXECUTE_SCRAPE', maxResults }, (response) => {
                if (isCompleted) return;
                isCompleted = true;
                clearTimeout(timeoutHandle);
                cleanup();

                if (chrome.runtime.lastError) {
                  sendResponse({
                    success: false,
                    error: chrome.runtime.lastError.message || 'Scraping communication error.'
                  });
                  return;
                }

                sendResponse(response || { success: false, companies: [] });
              });
            }, 2500);
          }
        }

        chrome.tabs.onUpdated.addListener(onUpdated);
      }
    );

    return true; // Keep asynchronous message port open
  }
});
