import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';
import { CITIES_DATABASE } from './src/data/citiesData';
import { searchPlacesText, PlacesServiceError } from './src/server/placesService';
import { searchOpenStreetMap } from './src/server/osmService';
import { discoverCompanyEmail } from './src/server/emailDiscoveryService';
import { verifyCompanyJobs } from './src/server/jobVerificationService';
import { CountryCode } from './src/types/scraper';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// API Keys resolution (Optional: free OpenStreetMap and Chrome Extension work without any keys)
const mapsApiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY || '';
const geminiApiKey = process.env.GEMINI_API_KEY || '';

const ai = geminiApiKey ? new GoogleGenAI({ apiKey: geminiApiKey }) : null;

// Basic in-memory rate limiting / abuse protection
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 50;
const ipRequestCounts = new Map<string, { count: number; resetAt: number }>();

function rateLimiter(req: Request, res: Response, next: NextFunction) {
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const record = ipRequestCounts.get(clientIp);

  if (!record || now > record.resetAt) {
    ipRequestCounts.set(clientIp, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return next();
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    res.status(429).json({
      error: 'Rate limit exceeded. Please wait a moment before sending more requests.',
      code: 'RATE_LIMIT_EXCEEDED'
    });
    return;
  }

  record.count++;
  next();
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of ipRequestCounts.entries()) {
    if (now > record.resetAt) {
      ipRequestCounts.delete(ip);
    }
  }
}, 120000);

// Status endpoint
app.get('/api/status', (_req: Request, res: Response) => {
  res.json({
    status: 'online',
    hasMapsKey: Boolean(mapsApiKey),
    freeEngine: 'OpenStreetMap (Nominatim & Overpass)',
    extensionSupported: true,
    environment: process.env.NODE_ENV || 'development',
    serverTime: new Date().toISOString()
  });
});

// OpenStreetMap (Zero-Cost Free Engine) Endpoint
app.post('/api/osm/search', rateLimiter, async (req: Request, res: Response) => {
  try {
    const { city, query, country = 'DE', pageSize = 10 } = req.body;

    if (!city || typeof city !== 'string' || !city.trim()) {
      res.status(400).json({ error: 'Valid city parameter is required.', code: 'INVALID_ARGUMENT' });
      return;
    }

    if (!query || typeof query !== 'string' || !query.trim()) {
      res.status(400).json({ error: 'Valid search query parameter is required.', code: 'INVALID_ARGUMENT' });
      return;
    }

    const validCountries: CountryCode[] = ['DE', 'AT', 'CH'];
    const selectedCountry: CountryCode = validCountries.includes(country) ? country : 'DE';

    const result = await searchOpenStreetMap({
      query: query.trim(),
      city: city.trim(),
      country: selectedCountry,
      pageSize: Number(pageSize) || 10
    });

    res.json({
      success: true,
      city: city.trim(),
      query: query.trim(),
      country: selectedCountry,
      totalReturned: result.totalReturned,
      attribution: result.attribution,
      engine: 'osm_overpass',
      companies: result.companies
    });
  } catch (error: any) {
    console.error('[OSM Search Error]:', error.message);
    res.status(500).json({
      error: error.message || 'OpenStreetMap search failed',
      code: 'OSM_SEARCH_ERROR'
    });
  }
});

// Google Places API (New) Search Endpoint (with automated fallback to OpenStreetMap if key is not configured)
app.post('/api/places/search', rateLimiter, async (req: Request, res: Response) => {
  try {
    const { city, query, country = 'DE', pageSize = 10, engine = 'auto' } = req.body;

    if (!city || typeof city !== 'string' || !city.trim()) {
      res.status(400).json({ error: 'Valid city parameter is required.', code: 'INVALID_ARGUMENT' });
      return;
    }

    if (!query || typeof query !== 'string' || !query.trim()) {
      res.status(400).json({ error: 'Valid search query parameter is required.', code: 'INVALID_ARGUMENT' });
      return;
    }

    const validCountries: CountryCode[] = ['DE', 'AT', 'CH'];
    const selectedCountry: CountryCode = validCountries.includes(country) ? country : 'DE';

    // If explicit OSM requested or (auto mode and NO Google Maps API Key is provided)
    if (engine === 'osm' || (!mapsApiKey && engine !== 'google_places')) {
      const osmResult = await searchOpenStreetMap({
        query: query.trim(),
        city: city.trim(),
        country: selectedCountry,
        pageSize: Number(pageSize) || 10
      });

      res.json({
        success: true,
        city: city.trim(),
        query: query.trim(),
        country: selectedCountry,
        totalReturned: osmResult.totalReturned,
        attribution: 'OpenStreetMap (No API key needed)',
        engine: 'osm_overpass',
        companies: osmResult.companies
      });
      return;
    }

    // Google Places API (New) branch
    if (mapsApiKey && mapsApiKey.trim()) {
      const cityRecord = CITIES_DATABASE.find(
        c => c.name.toLowerCase() === city.trim().toLowerCase() && c.country === selectedCountry
      ) || CITIES_DATABASE.find(
        c => c.name.toLowerCase() === city.trim().toLowerCase()
      );

      const biasCoords = cityRecord ? { lat: cityRecord.lat, lng: cityRecord.lng } : undefined;

      const searchResult = await searchPlacesText({
        query,
        city: city.trim(),
        country: selectedCountry,
        pageSize: Number(pageSize) || 10,
        biasCoords,
        apiKey: mapsApiKey
      });

      res.json({
        success: true,
        city: city.trim(),
        query: query.trim(),
        country: selectedCountry,
        totalReturned: searchResult.totalReturned,
        attribution: searchResult.attribution,
        engine: 'google_places_api',
        companies: searchResult.companies
      });
      return;
    }

    // If explicitly requested Google Places without a key
    res.status(400).json({
      error: 'Google Maps API key is not configured on the server. Please select OpenStreetMap (Free, No Key) or configure GOOGLE_MAPS_API_KEY.',
      code: 'MISSING_API_KEY'
    });
    return;
  } catch (error: any) {
    const placesError = error as PlacesServiceError;
    console.error('[Places Search Error]', placesError.message);

    // If Google Places API failed or key was invalid, fall back to free OpenStreetMap
    try {
      const { city, query, country = 'DE', pageSize = 10 } = req.body;
      const validCountries: CountryCode[] = ['DE', 'AT', 'CH'];
      const selectedCountry: CountryCode = validCountries.includes(country) ? country : 'DE';

      const osmFallback = await searchOpenStreetMap({
        query: query.trim(),
        city: city.trim(),
        country: selectedCountry,
        pageSize: Number(pageSize) || 10
      });

      res.json({
        success: true,
        city: city.trim(),
        query: query.trim(),
        country: selectedCountry,
        totalReturned: osmFallback.totalReturned,
        attribution: 'OpenStreetMap (Free Fallback)',
        engine: 'osm_overpass',
        companies: osmFallback.companies,
        warning: `Places API unavailable (${placesError.message}). Served genuine OpenStreetMap data.`
      });
    } catch (osmErr: any) {
      res.status(500).json({
        error: placesError.message || 'Search failed',
        code: placesError.code || 'SEARCH_ERROR'
      });
    }
  }
});

// SSRF-Protected Email Discovery Endpoint
app.post('/api/places/discover-email', rateLimiter, async (req: Request, res: Response) => {
  try {
    const { websiteUrl } = req.body;

    if (!websiteUrl || typeof websiteUrl !== 'string') {
      res.status(400).json({ error: 'websiteUrl is required for email discovery.', code: 'INVALID_ARGUMENT' });
      return;
    }

    const discoveryResult = await discoverCompanyEmail(websiteUrl);
    res.json({
      success: true,
      result: discoveryResult
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Email discovery failed',
      code: 'EMAIL_DISCOVERY_ERROR'
    });
  }
});

// Job & Ausbildung Verification Endpoint
app.post('/api/places/verify-jobs', rateLimiter, async (req: Request, res: Response) => {
  try {
    const { websiteUrl, targetQuery } = req.body;

    if (!websiteUrl || typeof websiteUrl !== 'string') {
      res.status(400).json({ error: 'websiteUrl is required for job verification.', code: 'INVALID_ARGUMENT' });
      return;
    }

    const verificationResult = await verifyCompanyJobs(websiteUrl, targetQuery);
    res.json({
      success: true,
      result: verificationResult
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Job verification failed',
      code: 'JOB_VERIFICATION_ERROR'
    });
  }
});

// Truthful Application Draft Generator
app.post('/api/application/draft', async (req: Request, res: Response) => {
  try {
    const { 
      companyName, 
      city, 
      roleTitle, 
      jobType = 'ausbildung', 
      isAusbildungConfirmed = false,
      candidateNotes = '' 
    } = req.body;

    if (!companyName || !roleTitle) {
      res.status(400).json({ error: 'companyName and roleTitle are required' });
      return;
    }

    const isAusbildung = jobType === 'ausbildung';
    const isProactive = !isAusbildungConfirmed;

    const subject = isAusbildung
      ? `${isProactive ? 'Initiativbewerbung:' : 'Bewerbung um'} Ausbildungsplatz als ${roleTitle} - [Vorname Nachname]`
      : `${isProactive ? 'Initiativbewerbung als' : 'Bewerbung als'} ${roleTitle} - [Vorname Nachname]`;

    const body = `Sehr geehrte Damen und Herren,
liebes Recruiting-Team von ${companyName},

mit großem Interesse verfolge ich Ihre geschäftlichen Aktivitäten am Standort ${city}.

${isProactive 
  ? `Hiermit bewerbe ich mich bei Ihnen initiativ ${isAusbildung ? 'um einen Ausbildungsplatz im Bereich' : 'für eine Position als'} „${roleTitle}“. Da ich Ihr Unternehmen als attraktiven Arbeitgeber in unserer Region schätze, möchte ich mich Ihnen gerne proaktiv vorstellen.`
  : `Hiermit bewerbe ich mich mit großem Engagement bei Ihnen für die Position als „${roleTitle}“.`}

Ich zeichne mich durch Zuverlässigkeit, rasche Auffassungsgabe und ausgeprägtes Verantwortungsbewusstsein aus. Gerne möchte ich meine Motivation und praktischen Kenntnisse in Ihr Team einbringen.

Meine vollständigen Bewerbungsunterlagen habe ich dieser Nachricht beigefügt. Über die Gelegenheit, mich Ihnen in einem persönlichen Vorstellungsgespräch oder im Rahmen eines Probearbeitstages vorzustellen, freue ich mich sehr.

Mit freundlichen Grüßen,
[Ihr Vorname Nachname]
[Ihre Telefonnummer]
[Ihre E-Mail-Adresse]`;

    res.json({
      success: true,
      application: {
        subject,
        emailBody: body,
        notes: isProactive 
          ? 'Initiativbewerbung erstellt: Da keine verifizierte Stellenausschreibung vorliegt, ist das Anschreiben als proaktive Anfrage formuliert.'
          : 'Bewerbung für verifizierte Position formuliert.'
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Draft creation failed' });
  }
});

// Configure Vite middleware in dev or static files in production
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[MapCareer Scraper Server] Listening on http://0.0.0.0:${PORT} (env: ${process.env.NODE_ENV || 'development'})`);
    console.log(`[Free Engine] OpenStreetMap (Nominatim & Overpass API) active.`);
    console.log(`[Chrome Extension Bridge] Ready in /public/extension.`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
