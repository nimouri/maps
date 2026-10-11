// MapCareer Bridge Content Script
// Bridges the MapCareer Web App and the Google Maps Scraper Extension

(function() {
  console.log('[MapCareer Bridge] Extension content script attached to page.');

  // Announce presence to page
  function broadcastReady() {
    window.postMessage({
      type: 'MAPCAREER_EXTENSION_READY',
      version: '1.0.0',
      timestamp: Date.now()
    }, '*');
  }

  // Listen to messages from the MapCareer frontend
  window.addEventListener('message', function(event) {
    if (!event.data || typeof event.data !== 'object') return;

    // Heartbeat / ping check
    if (event.data.type === 'MAPCAREER_PING') {
      window.postMessage({
        type: 'MAPCAREER_PONG',
        installed: true,
        version: '1.0.0'
      }, '*');
      return;
    }

    // Live search request
    if (event.data.type === 'MAPCAREER_SCRAPE_REQUEST') {
      const { requestId, query, city, country, maxResults = 10 } = event.data;

      chrome.runtime.sendMessage({
        action: 'SCRAPE_MAPS',
        query,
        city,
        country,
        maxResults
      }, function(response) {
        if (chrome.runtime.lastError) {
          window.postMessage({
            type: 'MAPCAREER_SCRAPE_RESPONSE',
            requestId,
            success: false,
            error: chrome.runtime.lastError.message || 'Extension runtime error'
          }, '*');
          return;
        }

        window.postMessage({
          type: 'MAPCAREER_SCRAPE_RESPONSE',
          requestId,
          success: response?.success ?? false,
          companies: response?.companies || [],
          error: response?.error || null,
          source: 'google_maps_extension'
        }, '*');
      });
    }
  });

  // Broadcast readiness immediately and on load
  broadcastReady();
  document.addEventListener('DOMContentLoaded', broadcastReady);
})();
