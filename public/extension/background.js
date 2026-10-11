// MapCareer Extension Service Worker (Manifest V3)

// Exact allowed origins only (strictly no wildcards, no run.app, no aistudio.google.com)
const ALLOWED_ORIGINS = new Set([
  'http://localhost:3000',
  'https://YOUR-DOMAIN-HERE'
]);

function isOriginAllowed(rawUrl) {
  if (!rawUrl) return false;
  try {
    const origin = new URL(rawUrl).origin;
    return ALLOWED_ORIGINS.has(origin);
  } catch (_) {
    return false;
  }
}

// Track pending scrape jobs by tab id
const pendingJobs = new Map();

// Helper to safely clean up a job's window and state
function cleanupJob(job) {
  if (job.timeoutHandle) {
    clearTimeout(job.timeoutHandle);
    job.timeoutHandle = null;
  }
  if (job.tabId) {
    pendingJobs.delete(job.tabId);
  }
  if (job.windowId) {
    chrome.windows.remove(job.windowId, () => {
      // Ignore error if already closed
      if (chrome.runtime.lastError) {}
    });
    job.windowId = null;
  }
}

// Window closure handler
chrome.windows.onRemoved.addListener((closedWindowId) => {
  for (const [tabId, job] of pendingJobs.entries()) {
    if (job.windowId === closedWindowId && !job.isCompleted) {
      job.isCompleted = true;
      if (job.timeoutHandle) clearTimeout(job.timeoutHandle);
      pendingJobs.delete(tabId);
      job.sendResponse({
        success: false,
        error: 'Scraper window was closed'
      });
    }
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Listen for progress messages from content-maps.js to extend watchdog timeout
  if (request.action === 'SCRAPE_PROGRESS') {
    const senderTabId = sender.tab?.id;
    if (senderTabId && pendingJobs.has(senderTabId)) {
      const job = pendingJobs.get(senderTabId);
      job.hasReceivedProgress = true;
      if (typeof request.currentCount === 'number') {
        job.lastProgressCount = request.currentCount;
      }
      if (!job.isCompleted) {
        if (job.timeoutHandle) clearTimeout(job.timeoutHandle);
        job.timeoutHandle = setTimeout(() => {
          if (job.isCompleted) return;
          job.isCompleted = true;
          cleanupJob(job);
          job.sendResponse({
            success: false,
            error: `Timed out while loading results (got ${job.lastProgressCount} so far)`,
            companies: []
          });
        }, job.baseTimeoutMs);
      }
    }
    return;
  }

  if (request.action === 'SCRAPE_MAPS') {
    // Check sender origin
    const senderUrl = sender.tab?.url || sender.url || '';
    if (!isOriginAllowed(senderUrl)) {
      console.warn('[MapCareer Background] Rejected unauthorized scrape request from origin:', senderUrl);
      sendResponse({ success: false, error: 'Unauthorized origin.' });
      return false;
    }

    const { query, city, country, maxResults = 10 } = request;
    const targetUrl = `https://www.google.com/maps/search/${encodeURIComponent(`${query} in ${city}, ${country}`)}`;

    console.log(`[MapCareer Background] Launching popup for "${query} in ${city}" (maxResults: ${maxResults})...`);

    // timeout = min(30s + 2s * maxResults, 150s)
    const baseTimeoutMs = Math.min((30 + 2 * maxResults) * 1000, 150000);

    // Open popup window to avoid background tab throttling
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

        const job = {
          tabId,
          windowId,
          baseTimeoutMs,
          isCompleted: false,
          hasReceivedProgress: false,
          lastProgressCount: 0,
          sendResponse,
          timeoutHandle: null
        };

        // Watchdog timeout handler
        job.timeoutHandle = setTimeout(() => {
          if (job.isCompleted) return;
          job.isCompleted = true;
          chrome.tabs.onUpdated.removeListener(onUpdated);
          cleanupJob(job);
          if (job.hasReceivedProgress) {
            job.sendResponse({
              success: false,
              error: `Timed out while loading results (got ${job.lastProgressCount} so far)`,
              companies: []
            });
          } else {
            job.sendResponse({
              success: false,
              error: 'Google Maps page did not load (consent screen, captcha or blocked)'
            });
          }
        }, baseTimeoutMs);

        pendingJobs.set(tabId, job);

        function onUpdated(updatedTabId, changeInfo) {
          if (updatedTabId === tabId && changeInfo.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(onUpdated);

            // Wait for Google Maps dynamic app hydration
            setTimeout(() => {
              if (job.isCompleted) return;

              chrome.tabs.sendMessage(tabId, { action: 'EXECUTE_SCRAPE', maxResults }, (response) => {
                if (job.isCompleted) return;
                job.isCompleted = true;
                cleanupJob(job);

                if (chrome.runtime.lastError || !response) {
                  if (job.hasReceivedProgress) {
                    job.sendResponse({
                      success: false,
                      error: `Timed out while loading results (got ${job.lastProgressCount} so far)`,
                      companies: []
                    });
                  } else {
                    job.sendResponse({
                      success: false,
                      error: 'Google Maps page did not load (consent screen, captcha or blocked)'
                    });
                  }
                  return;
                }

                job.sendResponse(response);
              });
            }, 2500);
          }
        }

        chrome.tabs.onUpdated.addListener(onUpdated);
      }
    );

    return true; // Keep message channel open for async response
  }
});
