# MapCareer Live Google Maps Chrome Extension (Manifest V3)

This extension enables real-time scraping of Google Maps search feeds directly in your browser without requiring a paid Google Cloud billing account or `GOOGLE_MAPS_API_KEY`.

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
   - The web app sends a message to the extension bridge (`content-bridge.js`).
   - The extension opens a temporary tab to `https://www.google.com/maps/search/...`
   - It automatically accepts cookie consents, auto-scrolls the results feed (`div[role="feed"]`), and extracts business names, physical addresses, websites, phone numbers, ratings, review counts, and GPS coordinates parsed from the live URL.
   - It closes the temporary tab and returns the real data back to your table and interactive map.
2. **Zero Paid API Keys**: No Google Cloud billing or paid Places API required.
3. **If Extension is not loaded**: The app seamlessly falls back to the free **OpenStreetMap (Overpass / Nominatim)** engine, with clear attribution.
