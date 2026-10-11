import { CountryCode, ScrapedCompany } from '../types/scraper';

const COUNTRY_NAMES: Record<CountryCode, string> = {
  DE: 'Germany',
  AT: 'Austria',
  CH: 'Switzerland'
};

export async function searchOpenStreetMap(params: {
  query: string;
  city: string;
  country: CountryCode;
  pageSize?: number;
}): Promise<{
  companies: ScrapedCompany[];
  totalReturned: number;
  attribution: string;
}> {
  const { query, city, country, pageSize = 10 } = params;
  const countryName = COUNTRY_NAMES[country] || 'Germany';
  const limit = Math.min(Math.max(pageSize, 1), 20);

  // Use Nominatim search with extratags enabled (returns real websites, phones, emails if tagged in OSM)
  const searchUrl = new URL('https://nominatim.openstreetmap.org/search');
  searchUrl.searchParams.set('q', `${query} in ${city}, ${countryName}`);
  searchUrl.searchParams.set('format', 'json');
  searchUrl.searchParams.set('addressdetails', '1');
  searchUrl.searchParams.set('extratags', '1');
  searchUrl.searchParams.set('limit', limit.toString());
  searchUrl.searchParams.set('accept-language', 'de');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  let rawResults: any[] = [];
  try {
    const res = await fetch(searchUrl.href, {
      headers: {
        'User-Agent': 'MapCareerApp/2.0 (OpenStreetMap Business Discovery; contact@mapcareer.local)'
      },
      signal: controller.signal
    });
    clearTimeout(timer);

    if (res.ok) {
      rawResults = await res.json();
    }
  } catch (err: any) {
    clearTimeout(timer);
    console.warn(`[OSM Search Error]: ${err.message}`);
  }

  // If targeted query returned 0, try broader business/facility search in the city
  if (!rawResults || rawResults.length === 0) {
    const fallbackUrl = new URL('https://nominatim.openstreetmap.org/search');
    fallbackUrl.searchParams.set('q', `${query} ${city}`);
    fallbackUrl.searchParams.set('format', 'json');
    fallbackUrl.searchParams.set('addressdetails', '1');
    fallbackUrl.searchParams.set('extratags', '1');
    fallbackUrl.searchParams.set('limit', limit.toString());
    fallbackUrl.searchParams.set('accept-language', 'de');

    try {
      const resFallback = await fetch(fallbackUrl.href, {
        headers: {
          'User-Agent': 'MapCareerApp/2.0 (OpenStreetMap Business Discovery; contact@mapcareer.local)'
        }
      });
      if (resFallback.ok) {
        rawResults = await resFallback.json();
      }
    } catch {
      // Return empty safely
    }
  }

  const companies: ScrapedCompany[] = [];
  const seenIds = new Set<string>();

  for (const item of rawResults || []) {
    const osmId = `osm-${item.osm_type || 'node'}-${item.osm_id || item.place_id}`;
    if (seenIds.has(osmId)) continue;
    seenIds.add(osmId);

    const addr = item.address || {};
    const street = addr.road || addr.pedestrian || addr.footway || '';
    const houseNumber = addr.house_number || '';
    const postcode = addr.postcode || '';
    const itemCity = addr.city || addr.town || addr.village || city;
    const formattedAddress = [
      street ? `${street} ${houseNumber}`.trim() : '',
      postcode ? `${postcode} ${itemCity}`.trim() : itemCity,
      countryName
    ].filter(Boolean).join(', ');

    const extra = item.extratags || {};
    const website = extra.website || extra['contact:website'] || extra['url'] || undefined;
    const phone = extra.phone || extra['contact:phone'] || undefined;
    const directEmail = extra.email || extra['contact:email'] || undefined;

    const rawLat = parseFloat(item.lat);
    const rawLng = parseFloat(item.lon);
    if (isNaN(rawLat) || isNaN(rawLng)) {
      continue;
    }
    const lat = rawLat;
    const lng = rawLng;

    // Direct OSM link and Google Maps search link
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

    companies.push({
      id: osmId,
      placeId: osmId,
      name: item.name || item.display_name.split(',')[0],
      city: itemCity,
      state: addr.state || countryName,
      address: formattedAddress || undefined,
      country: country,
      website: website,
      phone: phone,
      rating: undefined,
      reviewsCount: undefined,
      lat: lat,
      lng: lng,
      mapsUrl: mapsUrl,
      placeTypes: [item.class, item.type].filter(Boolean),
      businessStatus: 'OPERATIONAL',
      providerAttribution: 'OpenStreetMap — not Google',
      discoveredAt: new Date().toISOString(),

      emailStatus: directEmail ? 'website_general_email' : 'not_checked',
      careerEmail: directEmail,
      emailSourceUrl: directEmail ? `https://www.openstreetmap.org/${item.osm_type}/${item.osm_id}` : undefined,
      allDiscoveredEmails: directEmail ? [directEmail] : []
    });
  }

  return {
    companies,
    totalReturned: companies.length,
    attribution: 'OpenStreetMap (Nominatim & Overpass)'
  };
}
