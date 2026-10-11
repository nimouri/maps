# MapCareer Live Google Maps Chrome Extension (Manifest V3)

This extension enables real-time scraping of Google Maps search feeds directly in your browser without requiring a paid Google Cloud billing account or `GOOGLE_MAPS_API_KEY`.

---

## 🔒 Security & Origin Configuration

By design, `manifest.json` locks down execution origins to protect against unauthorized access.
Only your local development origin and your designated production domain are permitted.

In `manifest.json`:
```json
"matches": [
  "http://localhost:3000/*",
  "https://YOUR-DOMAIN-HERE/*"
]
```

**Before deploying to production:**
Replace `"https://YOUR-DOMAIN-HERE/*"` with your actual deployed app origin (e.g. `https://my-mapcareer-app.run.app/*`).

---

## 🚀 How to Install (Takes 30 Seconds)

1. **Open Google Chrome** (or any Chromium browser: Brave, Edge, Opera).
2. In the address bar, navigate to:  
   `chrome://extensions`
3. In the top-right corner, toggle **"Developer mode"** to **ON**.
4. Click the button labeled **"Load unpacked"** (top-left).
5. Select this extension directory (`public/extension` from the MapCareer workspace).
6. The extension **"MapCareer Google Maps Bridge"** is now active!

---

## ⚡ How It Operates

1. When you search for businesses in the MapCareer web app:
   - The web app sends a message to the extension bridge (`content-bridge.js`) via verified `window.postMessage`.
   - The extension opens a temporary popup window (`chrome.windows.create`, width: 900, height: 700) to `https://www.google.com/maps/search/...` (popups prevent background tab throttling in Chromium).
   - `content-maps.js` dismisses cookie dialogs, auto-scrolls the feed (`div[role="feed"]`), extracts real business data, parses coordinates from `/!3d...` data strings, and captures genuine Google Place IDs (`!1s0x...:0x...`).
   - The popup window automatically closes once scraping completes or upon timeout (timeout scales automatically with `maxResults`).
   - Real, deduplicated business records stream back to the UI.
2. **Zero Synthetic Data Guarantee**:
   - Missing coordinates remain `undefined` (never replaced with center coordinates).
   - Missing addresses remain empty (shown as `—` in the UI, never `'Address on Google Maps'`).
   - No `Date.now()` random IDs; only provider-supplied IDs.
3. **OpenStreetMap Fallback**:
   - If the extension is not active or you prefer server-side search, the built-in OpenStreetMap Overpass/Nominatim engine performs 100% free search with zero keys required.
