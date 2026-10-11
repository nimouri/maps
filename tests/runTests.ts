/**
 * Automated Test Suite for MapCareer Discovery & Integrity
 * 
 * Verifies:
 * 1. Successful Places API response parsing & honest fields
 * 2. Zero search results (empty response, no mock fallback)
 * 3. Invalid API key error handling (explicit error, no mock fallback)
 * 4. Missing API key handling
 * 5. Deduplication of duplicate Place IDs
 * 6. Missing contact details (properly undefined, no fabricated data)
 * 7. Missing coordinates handling (no synthetic coordinates)
 * 8. Email discovery with mocked DNS lookup (no domain guessing, requires actual text match)
 * 9. No email found handling
 * 10. Missing website parameter handling
 * 11. Coordinate extraction from URL (!3d...!4d...)
 * 12. Secondary coordinate extraction fallback (@lat,lng)
 * 13. Rejection of street address as phone number
 * 14. Rejection of short prefix ("+49") as phone number
 * 15. Acceptance of valid phone number ("+49 89 123456")
 * 16. Acceptance of valid German street address
 * 17. Rejection of opening hours as address
 * 18. Extension manifest does not contain "<all_urls>"
 * 19. Extension manifest does not contain broad host permissions
 * 20. Place ID extraction from URL (!1s0x...:0x...)
 * 21. content-maps.js does not contain duplicate parsing function definitions
 * 22. SSRF guard blocks private/loopback IP resolution (127.0.0.1, 10.0.0.5)
 * 23. SSRF guard blocks redirect to metadata/private IP (169.254.169.254)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { searchPlacesText } from '../src/server/placesService';
import { discoverCompanyEmail } from '../src/server/emailDiscoveryService';
import { setDnsLookupForTests, safeFetch, validateSafeUrl } from '../src/server/ssrfGuard';

// Single source of truth for parsing logic: public/extension/parsing.js
// Imported dynamically or via createRequire
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const parsing = require('../public/extension/parsing.js');

const {
  parseCoordinates,
  parsePlaceId,
  parsePhone,
  parseAddress,
  isPhoneToken,
  isAddressToken,
  isCandidatePhone,
  isCandidateAddress
} = parsing;

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}${details ? ` -> ${details}` : ''}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n=== RUNNING AUTOMATED COMPLIANCE & INTEGRITY TESTS ===\n');

  // Backup original global fetch
  const originalFetch = global.fetch;

  // ----------------------------------------------------
  // TEST SUITE 1: Google Places API Service
  // ----------------------------------------------------
  console.log('[Suite 1: Google Places API Service]');

  // Test 1: Successful Places API response parsing
  {
    const mockApiResponse = {
      places: [
        {
          id: 'ChIJ2V-q_n11nkcRq8Xq_zXw48E',
          displayName: { text: 'Klinikum Rechts der Isar' },
          formattedAddress: 'Ismaninger Str. 22, 81675 München, Germany',
          location: { latitude: 48.136, longitude: 11.601 },
          rating: 4.4,
          userRatingCount: 1520,
          websiteUri: 'https://www.mri.tum.de',
          nationalPhoneNumber: '089 41400',
          googleMapsUri: 'https://maps.google.com/?cid=123456789',
          types: ['hospital', 'health', 'point_of_interest'],
          businessStatus: 'OPERATIONAL'
        }
      ]
    };

    global.fetch = async () => new Response(JSON.stringify(mockApiResponse), { status: 200, headers: { 'Content-Type': 'application/json' } });

    const result = await searchPlacesText({
      query: 'Klinikum',
      city: 'München',
      country: 'DE',
      apiKey: 'test-api-key'
    });

    assert(result.companies.length === 1, '1. Successful Places API response returns parsed place');
    const comp = result.companies[0];
    assert(comp.id === 'ChIJ2V-q_n11nkcRq8Xq_zXw48E', '1. Provider Place ID is preserved');
    assert(comp.name === 'Klinikum Rechts der Isar', '1. Business name is extracted');
    assert(comp.mapsUrl === 'https://maps.google.com/?cid=123456789', '1. Real provider Google Maps URL is returned');
    assert(comp.providerAttribution === 'Google Places API (New)', '1. Provider attribution is explicitly set');
    assert(comp.emailStatus === 'not_checked', '1. Email status starts as unverified (not fabricated)');
  }

  // Test 2: Zero search results handling
  {
    global.fetch = async () => new Response(JSON.stringify({ places: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });

    const result = await searchPlacesText({
      query: 'NonExistentXYZJob',
      city: 'SmallVillage',
      country: 'DE',
      apiKey: 'test-api-key'
    });

    assert(result.companies.length === 0, '2. Zero search results returns empty array (no synthetic mock fallback)');
    assert(result.totalReturned === 0, '2. Total returned is 0');
  }

  // Test 3: Invalid API key error handling
  {
    global.fetch = async () => new Response(JSON.stringify({
      error: { code: 403, message: 'The provided API key is invalid.' }
    }), { status: 403, headers: { 'Content-Type': 'application/json' } });

    let caughtError: any = null;
    try {
      await searchPlacesText({
        query: 'IT Support',
        city: 'Berlin',
        country: 'DE',
        apiKey: 'invalid-key'
      });
    } catch (err: any) {
      caughtError = err;
    }

    assert(caughtError !== null, '3. Invalid API key throws explicit error');
    assert(caughtError?.code === 'AUTHENTICATION_FAILED', '3. Error code is AUTHENTICATION_FAILED (no silent mock switch)');
  }

  // Test 4: Missing API key handling
  {
    let caughtError: any = null;
    try {
      await searchPlacesText({
        query: 'IT Support',
        city: 'Berlin',
        country: 'DE',
        apiKey: ''
      });
    } catch (err: any) {
      caughtError = err;
    }

    assert(caughtError !== null && caughtError.code === 'MISSING_API_KEY', '4. Missing API key throws MISSING_API_KEY error');
  }

  // Test 5: Duplicate Place IDs deduplication
  {
    const mockApiResponseWithDuplicates = {
      places: [
        { id: 'PLACE_DUPLICATE_1', displayName: { text: 'Company Alpha' }, formattedAddress: 'Address 1' },
        { id: 'PLACE_DUPLICATE_1', displayName: { text: 'Company Alpha Dup' }, formattedAddress: 'Address 1' },
        { id: 'PLACE_UNIQUE_2', displayName: { text: 'Company Beta' }, formattedAddress: 'Address 2' }
      ]
    };

    global.fetch = async () => new Response(JSON.stringify(mockApiResponseWithDuplicates), { status: 200, headers: { 'Content-Type': 'application/json' } });

    const result = await searchPlacesText({
      query: 'Company',
      city: 'Köln',
      country: 'DE',
      apiKey: 'test-api-key'
    });

    assert(result.companies.length === 2, '5. Duplicate Place IDs are properly deduplicated');
    assert(result.companies[0].id === 'PLACE_DUPLICATE_1' && result.companies[1].id === 'PLACE_UNIQUE_2', '5. Unique IDs preserved');
  }

  // Test 6: Missing contact details remain undefined (never fabricated)
  {
    const mockMinimalPlace = {
      places: [
        {
          id: 'PLACE_MINIMAL',
          displayName: { text: 'Sparse Company GmbH' },
          formattedAddress: 'Hauptstr. 1, 10115 Berlin'
        }
      ]
    };

    global.fetch = async () => new Response(JSON.stringify(mockMinimalPlace), { status: 200, headers: { 'Content-Type': 'application/json' } });

    const result = await searchPlacesText({
      query: 'Sparse',
      city: 'Berlin',
      country: 'DE',
      apiKey: 'test-api-key'
    });

    const sparse = result.companies[0];
    assert(sparse.website === undefined, '6. Missing website is undefined (not fabricated)');
    assert(sparse.phone === undefined, '6. Missing phone is undefined (not fabricated)');
    assert(sparse.rating === undefined, '6. Missing rating is undefined (not fabricated)');
    assert(sparse.careerEmail === undefined, '6. Missing email is undefined (not synthesized from domain)');
  }

  // Test 7: Missing coordinates handling
  {
    const mockPlaceNoLocation = {
      places: [
        {
          id: 'PLACE_NO_LOC',
          displayName: { text: 'Unknown Location GmbH' },
          formattedAddress: 'München'
        }
      ]
    };

    global.fetch = async () => new Response(JSON.stringify(mockPlaceNoLocation), { status: 200, headers: { 'Content-Type': 'application/json' } });

    const result = await searchPlacesText({
      query: 'Any',
      city: 'München',
      country: 'DE',
      apiKey: 'test-api-key',
      biasCoords: { lat: 48.1351, lng: 11.5820 }
    });

    assert(result.companies[0].lat === 48.1351, '7. Uses bias coordinate when location is absent');
  }

  // ----------------------------------------------------
  // TEST SUITE 2: Email Discovery Pipeline
  // ----------------------------------------------------
  console.log('\n[Suite 2: Email Discovery Service]');

  // Inject test DNS resolver for unit tests so tests never rely on external internet
  setDnsLookupForTests(async (hostname) => {
    return [{ address: '93.184.216.34', family: 4 }];
  });

  // Test 8: Extract email only from real HTML text
  {
    const mockHtml = `
      <html>
        <body>
          <h1>Karriere bei Musterfirma</h1>
          <p>Bewerbungen senden Sie bitte an: <a href="mailto:bewerbung@musterfirma.de">bewerbung@musterfirma.de</a></p>
          <footer>Kontakt: info@musterfirma.de</footer>
        </body>
      </html>
    `;

    global.fetch = async () => new Response(mockHtml, {
      status: 200,
      headers: { 'Content-Type': 'text/html' }
    });

    const result = await discoverCompanyEmail('https://www.musterfirma.de');
    assert(result.status === 'website_recruitment_email', '8. Identifies recruitment-specific email prefix');
    assert(result.primaryEmail === 'bewerbung@musterfirma.de', '8. Prioritizes recruitment email over general email');
    assert(result.allEmails.includes('info@musterfirma.de'), '8. Collects all public page emails');
    assert(result.sourceUrl !== undefined, '8. Stores attributable source URL');
  }

  // Test 9: No email found on website
  {
    const mockNoEmailHtml = '<html><body><h1>Kontakt</h1><p>Bitte nutzen Sie unser Kontaktformular.</p></body></html>';

    global.fetch = async () => new Response(mockNoEmailHtml, {
      status: 200,
      headers: { 'Content-Type': 'text/html' }
    });

    const result = await discoverCompanyEmail('https://www.formonly.de');
    assert(result.status === 'no_email_found', '9. Correctly returns no_email_found (never guesses from domain)');
    assert(result.primaryEmail === undefined, '9. No primary email assigned');
  }

  // Test 10: Missing website parameter
  {
    const result = await discoverCompanyEmail(undefined);
    assert(result.status === 'no_email_found', '10. Undefined website returns no_email_found safely');
  }

  // Reset DNS lookup back to default
  setDnsLookupForTests(null);

  // ----------------------------------------------------
  // TEST SUITE 3: Maps Parsing Module & Extension Security
  // ----------------------------------------------------
  console.log('\n[Suite 3: Maps Parsing & Extension Security]');

  // Test 11: Real coordinates parsed from URL containing !3d48.1!4d11.5
  {
    const testUrl = 'https://www.google.com/maps/place/Demo/@48.1,11.5,15z/data=!3m1!4b1!4m6!3m5!1s0x479e75f:0x123!8m2!3d48.1!4d11.5!16s';
    const coords = parseCoordinates(testUrl);
    assert(coords.lat === 48.1 && coords.lng === 11.5, '11. Coordinates parsed from URL containing !3d48.1!4d11.5');
  }

  // Test 12: Secondary coordinates fallback from @lat,lng format
  {
    const testUrlFallback = 'https://www.google.com/maps/place/Munich/@48.137154,11.576124,14z/data=!4m2!3m1';
    const coords = parseCoordinates(testUrlFallback);
    assert(coords.lat === 48.137154 && coords.lng === 11.576124, '12. Secondary coordinates parsed from @lat,lng format');
  }

  // Test 13: "Musterstr. 101 20095 Hamburg" must NOT be accepted as phone
  {
    const phoneResult = parsePhone('Musterstr. 101 20095 Hamburg');
    const isPhone = isCandidatePhone('Musterstr. 101 20095 Hamburg');
    assert(phoneResult === undefined && !isPhone, '13. "Musterstr. 101 20095 Hamburg" must NOT be accepted as phone');
  }

  // Test 14: Short prefix "+49" must NOT be accepted as phone (< 8 digits)
  {
    const phoneResult = parsePhone('+49');
    const isPhone = isCandidatePhone('+49');
    assert(phoneResult === undefined && !isPhone, '14. Short prefix "+49" must NOT be accepted as phone');
  }

  // Test 15: Valid phone like "+49 89 123456" IS accepted
  {
    const phoneResult = parsePhone('+49 89 123456');
    const isPhone = isCandidatePhone('+49 89 123456');
    assert(phoneResult === '+49 89 123456' && isPhone, '15. Valid phone "+49 89 123456" is accepted');
  }

  // Test 16: Valid German street address parsed correctly
  {
    const addressResult = parseAddress('Musterstraße 42, 80331 München');
    const isAddr = isCandidateAddress('Musterstraße 42, 80331 München');
    assert(addressResult === 'Musterstraße 42, 80331 München' && isAddr, '16. Valid German street address is recognized');
  }

  // Test 17: Opening hours not accepted as address
  {
    const addrResult = parseAddress('Geöffnet bis 18:00 Uhr');
    const isAddr = isCandidateAddress('Geöffnet bis 18:00 Uhr');
    assert(addrResult === undefined && !isAddr, '17. Opening hours string is NOT accepted as address');
  }

  // Test 18: manifest.json contains NO "<all_urls>"
  {
    const manifestPath = path.resolve(process.cwd(), 'public/extension/manifest.json');
    const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
    assert(!manifestContent.includes('<all_urls>'), '18. manifest.json contains NO "<all_urls>"');
  }

  // Test 19: manifest.json contains NO "*://*/*"
  {
    const manifestPath = path.resolve(process.cwd(), 'public/extension/manifest.json');
    const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
    assert(!manifestContent.includes('*://*/*'), '19. manifest.json contains NO "*://*/*"');
  }

  // Test 20: Place ID correctly extracted from Google place link (!1s0x...:0x...)
  {
    const mapsLink = 'https://www.google.com/maps/place/Test/data=!4m7!3m6!1s0x479e75f9a1234567:0xabcdef1234567890!8m2!3d48.1!4d11.5';
    const placeId = parsePlaceId(mapsLink);
    assert(placeId === '0x479e75f9a1234567:0xabcdef1234567890', '20. Place ID correctly extracted from Google place link');
  }

  // Test 21: content-maps.js does NOT contain its own definitions of parsing functions
  {
    const contentMapsPath = path.resolve(process.cwd(), 'public/extension/content-maps.js');
    const contentMapsSrc = fs.readFileSync(contentMapsPath, 'utf-8');
    const hasOwnPhoneToken = contentMapsSrc.includes('function isPhoneToken');
    const hasOwnAddressToken = contentMapsSrc.includes('function isAddressToken');
    const hasOwnParseCoordinates = contentMapsSrc.includes('function parseCoordinates');
    assert(
      !hasOwnPhoneToken && !hasOwnAddressToken && !hasOwnParseCoordinates,
      '21. content-maps.js does NOT duplicate parsing functions (uses parsing.js source of truth)'
    );
  }

  // ----------------------------------------------------
  // TEST SUITE 4: SSRF Guard Security Integrity
  // ----------------------------------------------------
  console.log('\n[Suite 4: SSRF Guard Security Integrity]');

  // Test 22: Host that resolves to 127.0.0.1 or 10.0.0.5 is blocked
  {
    setDnsLookupForTests(async (hostname) => {
      if (hostname === 'evil-loopback.com') {
        return [{ address: '127.0.0.1', family: 4 }];
      }
      if (hostname === 'evil-internal.com') {
        return [{ address: '10.0.0.5', family: 4 }];
      }
      return [{ address: '93.184.216.34', family: 4 }];
    });

    const checkLoopback = await validateSafeUrl('https://evil-loopback.com/secret');
    const checkInternal = await validateSafeUrl('https://evil-internal.com/data');

    assert(!checkLoopback.safe && (checkLoopback.error?.includes('private IP') ?? false), '22. Host that resolves to 127.0.0.1 is blocked');
    assert(!checkInternal.safe && (checkInternal.error?.includes('private IP') ?? false), '22. Host that resolves to 10.0.0.5 is blocked');
  }

  // Test 23: Redirect to http://169.254.169.254/ is blocked
  {
    global.fetch = async (url: any) => {
      if (String(url).includes('public-site.com')) {
        return new Response(null, {
          status: 302,
          headers: { location: 'http://169.254.169.254/latest/meta-data/' }
        });
      }
      return new Response('meta-data-exposed', { status: 200 });
    };

    const fetchResult = await safeFetch('https://public-site.com/redirect');
    assert(fetchResult === null, '23. Redirect to http://169.254.169.254/ is blocked');

    // Reset DNS lookup
    setDnsLookupForTests(null);
  }

  // Restore global fetch
  global.fetch = originalFetch;

  console.log('\n----------------------------------------------------');
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('----------------------------------------------------\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
