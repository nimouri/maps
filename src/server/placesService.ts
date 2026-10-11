import { CountryCode, ScrapedCompany } from '../types/scraper';

export interface PlacesSearchParams {
  query: string;
  city: string;
  country: CountryCode;
  pageSize?: number;
  biasCoords?: { lat: number; lng: number };
  apiKey?: string;
  timeoutMs?: number;
}

export interface PlacesServiceError extends Error {
  code: 'MISSING_API_KEY' | 'AUTHENTICATION_FAILED' | 'QUOTA_EXCEEDED' | 'INVALID_ARGUMENT' | 'REQUEST_TIMEOUT' | 'PLACES_API_ERROR';
  status?: number;
  details?: any;
}

function createPlacesError(
  message: string, 
  code: PlacesServiceError['code'], 
  status?: number, 
  details?: any
): PlacesServiceError {
  const err = new Error(message) as PlacesServiceError;
  err.name = 'PlacesServiceError';
  err.code = code;
  err.status = status;
  err.details = details;
  return err;
}

const COUNTRY_FULL_NAMES: Record<CountryCode, string> = {
  DE: 'Germany',
  AT: 'Austria',
  CH: 'Switzerland'
};

export async function searchPlacesText(params: PlacesSearchParams): Promise<{
  companies: ScrapedCompany[];
  totalReturned: number;
  attribution: string;
}> {
  const {
    query,
    city,
    country,
    pageSize = 10,
    biasCoords,
    apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY,
    timeoutMs = 10000
  } = params;

  // 1. Validate mandatory inputs
  if (!apiKey || !apiKey.trim()) {
    throw createPlacesError(
      'Google Maps API Key is missing. Configure GOOGLE_MAPS_API_KEY in your server environment.',
      'MISSING_API_KEY'
    );
  }

  if (!city || !city.trim()) {
    throw createPlacesError('City parameter is required.', 'INVALID_ARGUMENT');
  }

  if (!query || !query.trim()) {
    throw createPlacesError('Search query parameter is required.', 'INVALID_ARGUMENT');
  }

  const cleanQuery = query.trim();
  const cleanCity = city.trim();
  const countryName = COUNTRY_FULL_NAMES[country] || 'Germany';
  const clampedPageSize = Math.min(Math.max(pageSize, 1), 20);

  // 2. Build official Places API (New) Text Search payload
  const endpoint = 'https://places.googleapis.com/v1/places:searchText';
  const fullTextQuery = `${cleanQuery} in ${cleanCity}, ${countryName}`;

  const requestBody: any = {
    textQuery: fullTextQuery,
    pageSize: clampedPageSize,
    languageCode: 'de'
  };

  if (biasCoords && typeof biasCoords.lat === 'number' && typeof biasCoords.lng === 'number') {
    requestBody.locationBias = {
      circle: {
        center: {
          latitude: biasCoords.lat,
          longitude: biasCoords.lng
        },
        radius: 35000.0 // 35km radius around target city center
      }
    };
  }

  // 3. Mandatory FieldMask for Places API (New)
  const fieldMask = [
    'places.id',
    'places.displayName',
    'places.formattedAddress',
    'places.location',
    'places.rating',
    'places.userRatingCount',
    'places.websiteUri',
    'places.nationalPhoneNumber',
    'places.internationalPhoneNumber',
    'places.googleMapsUri',
    'places.types',
    'places.businessStatus'
  ].join(',');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-Maps-Solution-ID': 'gmp_git_agentskills_v1',
        'X-Goog-FieldMask': fieldMask
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw createPlacesError(`Places API request timed out after ${timeoutMs}ms`, 'REQUEST_TIMEOUT');
    }
    throw createPlacesError(`Network connection to Places API failed: ${err.message}`, 'PLACES_API_ERROR');
  } finally {
    clearTimeout(timeoutId);
  }

  // 4. Handle HTTP Error Responses explicitly
  if (!response.ok) {
    let errorDetails: any = null;
    try {
      errorDetails = await response.json();
    } catch {
      // Body may not be JSON
    }

    const status = response.status;
    const errorMsg = errorDetails?.error?.message || `HTTP ${status}: ${response.statusText}`;

    if (status === 401 || status === 403) {
      throw createPlacesError(
        `Google Maps API authentication failed: ${errorMsg}`,
        'AUTHENTICATION_FAILED',
        status,
        errorDetails
      );
    }

    if (status === 429) {
      throw createPlacesError(
        `Google Maps Places API quota exceeded: ${errorMsg}`,
        'QUOTA_EXCEEDED',
        status,
        errorDetails
      );
    }

    if (status === 400) {
      throw createPlacesError(
        `Invalid request argument sent to Places API: ${errorMsg}`,
        'INVALID_ARGUMENT',
        status,
        errorDetails
      );
    }

    throw createPlacesError(
      `Google Places API request failed (${status}): ${errorMsg}`,
      'PLACES_API_ERROR',
      status,
      errorDetails
    );
  }

  // 5. Parse and process places
  const data = await response.json();
  const rawPlaces: any[] = data.places || [];

  if (rawPlaces.length === 0) {
    return {
      companies: [],
      totalReturned: 0,
      attribution: 'Google Maps'
    };
  }

  // Deduplicate results by place.id
  const seenPlaceIds = new Set<string>();
  const verifiedCompanies: ScrapedCompany[] = [];

  for (const place of rawPlaces) {
    const placeId = place.id;
    if (!placeId || seenPlaceIds.has(placeId)) {
      continue;
    }
    seenPlaceIds.add(placeId);

    // Extract valid coordinates or fallback
    const lat = place.location?.latitude ?? (biasCoords?.lat || 51.1657);
    const lng = place.location?.longitude ?? (biasCoords?.lng || 10.4515);

    // Extract verified Google Maps URI; if missing, generate canonical place ID URI
    const mapsUrl = place.googleMapsUri || `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(placeId)}`;

    const company: ScrapedCompany = {
      id: placeId,
      placeId: placeId,
      name: place.displayName?.text || 'Business Name Not Listed',
      city: cleanCity,
      state: countryName,
      address: place.formattedAddress || `${cleanCity}, ${countryName}`,
      country: country,
      website: place.websiteUri || undefined,
      phone: place.nationalPhoneNumber || place.internationalPhoneNumber || undefined,
      rating: typeof place.rating === 'number' ? place.rating : undefined,
      reviewsCount: typeof place.userRatingCount === 'number' ? place.userRatingCount : undefined,
      lat,
      lng,
      mapsUrl,
      placeTypes: Array.isArray(place.types) ? place.types : [],
      businessStatus: place.businessStatus || undefined,
      providerAttribution: 'Google Places API (New)',
      discoveredAt: new Date().toISOString(),

      // Strict initial statuses
      emailStatus: 'not_checked',
      allDiscoveredEmails: [],
      ausbildungStatus: 'not_checked',
      confirmedListings: []
    };

    verifiedCompanies.push(company);
  }

  return {
    companies: verifiedCompanies,
    totalReturned: verifiedCompanies.length,
    attribution: 'Google Maps'
  };
}
