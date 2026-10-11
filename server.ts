import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';
import { CITIES_DATABASE } from './src/data/citiesData';
import { searchPlacesText, PlacesServiceError } from './src/server/placesService';
import { discoverCompanyEmail } from './src/server/emailDiscoveryService';
import { verifyCompanyJobs } from './src/server/jobVerificationService';
import { CountryCode } from './src/types/scraper';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// API Keys resolution
const mapsApiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY || '';
const geminiApiKey = process.env.GEMINI_API_KEY || '';

const ai = geminiApiKey ? new GoogleGenAI({ apiKey: geminiApiKey }) : null;

// Basic in-memory rate limiting / abuse protection
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 40;
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

// Clean up stale rate limit entries periodically
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
    hasGeminiKey: Boolean(geminiApiKey),
    provider: 'Google Places API (New)',
    environment: process.env.NODE_ENV || 'development',
    serverTime: new Date().toISOString()
  });
});

// Real Google Places API (New) Search Endpoint
app.post('/api/places/search', rateLimiter, async (req: Request, res: Response) => {
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

    // Find bias coordinates for the target city if available
    const cityRecord = CITIES_DATABASE.find(
      c => c.name.toLowerCase() === city.trim().toLowerCase() && c.country === selectedCountry
    ) || CITIES_DATABASE.find(
      c => c.name.toLowerCase() === city.trim().toLowerCase()
    );

    const biasCoords = cityRecord ? { lat: cityRecord.lat, lng: cityRecord.lng } : undefined;

    // Search via official Google Places API (New) Text Search
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
      companies: searchResult.companies
    });
  } catch (error: any) {
    const placesError = error as PlacesServiceError;
    const statusCode = placesError.status || (placesError.code === 'MISSING_API_KEY' ? 503 : 500);

    console.error('[Places Search Error]', placesError.message);
    res.status(statusCode).json({
      error: placesError.message,
      code: placesError.code || 'PLACES_SEARCH_ERROR',
      details: placesError.details || null
    });
  }
});

// Verified Email Discovery Endpoint (Strictly on-demand or background, never fabricated)
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

// Genuine Job & Ausbildung Verification Endpoint
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

    // Use Gemini for high-level tone generation if available
    if (ai) {
      try {
        const prompt = `Write a formal, truthful German application letter for:
Company: "${companyName}" in "${city}"
Role: "${roleTitle}"
Type: ${isAusbildung ? 'Ausbildung' : 'Arbeitsplatz'}
Status: ${isProactive ? 'Initiativbewerbung (proactive application as no confirmed vacancy is listed)' : 'Direct application for confirmed opening'}
Candidate details: "${candidateNotes}".

Instructions:
- If proactive, clearly state that this is an "Initiativbewerbung" inquiring whether positions or apprenticeships are available.
- Do NOT falsely claim the candidate saw an advertised job reference code unless confirmed.
- Include placeholders: [Vorname Nachname], [Telefon], [E-Mail].

Return valid JSON:
{
  "subject": "...",
  "emailBody": "...",
  "notes": "..."
}`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt
        });

        const text = response.text || '';
        const match = text.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          res.json({ success: true, application: parsed });
          return;
        }
      } catch (geminiErr) {
        console.warn('Gemini draft generation error, using deterministic template:', geminiErr);
      }
    }

    // High quality truthful deterministic German template
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
    console.log(`[Maps Key] ${mapsApiKey ? 'Configured and ready' : 'NOT SET'}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
