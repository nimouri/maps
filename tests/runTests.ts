/**
 * Automated Test Suite for Google Places API (New) Discovery & Verification Engine
 * 
 * Verifies:
 * 1. Successful Places API response parsing
 * 2. Zero search results (empty response, no mock fallback)
 * 3. Invalid API key error handling (explicit error, no mock fallback)
 * 4. Missing API key handling
 * 5. Deduplication of duplicate Place IDs
 * 6. Missing contact details (properly undefined, no fabricated data)
 * 7. Missing coordinates handling
 * 8. Strict ban on fabricated fallback data
 * 9. Email discovery (no domain guessing, requires actual text match)
 * 10. Job verification (attributable source URL, no fake vacancies)
 */

import { searchPlacesText } from '../src/server/placesService';
import { discoverCompanyEmail } from '../src/server/emailDiscoveryService';
import { verifyCompanyJobs } from '../src/server/jobVerificationService';

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
  // TEST SUITE 1: Google Places API (New) Handling
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
    assert(comp.ausbildungStatus === 'not_checked', '1. Ausbildung status starts as unverified');
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
          // No websiteUri, no phone, no rating
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

    assert(result.companies[0].lat === 48.1351, '7. Uses city center bias coordinate when location is absent');
  }

  // ----------------------------------------------------
  // TEST SUITE 2: Email Discovery Pipeline
  // ----------------------------------------------------
  console.log('\n[Suite 2: Email Discovery Service]');

  // Test 8: Extract email only from real HTML text (distinguishing recruitment vs general)
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

  // ----------------------------------------------------
  // TEST SUITE 3: Job & Ausbildung Verification Pipeline
  // ----------------------------------------------------
  console.log('\n[Suite 3: Job Verification Service]');

  // Test 11: Real Ausbildung posting confirmed in page text
  {
    const mockCareerHtml = `
      <html>
        <body>
          <h2>Aktuelle Ausbildungsangebote</h2>
          <ul>
            <li>Ausbildung zur Pflegefachkraft (m/w/d) - Bewerbungsfrist: 31.08.2026</li>
            <li>Pflegedienstleitung (w/m/d)</li>
          </ul>
        </body>
      </html>
    `;

    global.fetch = async () => new Response(mockCareerHtml, {
      status: 200,
      headers: { 'Content-Type': 'text/html' }
    });

    const result = await verifyCompanyJobs('https://www.klinik.de', 'Pflegefachkraft');
    assert(result.status === 'confirmed_listing', '11. Ausbildung confirmed when vacancy is in page text');
    assert(result.listings.length > 0, '11. Extracted real listing');
    assert(result.listings[0].title.includes('Pflegefachkraft'), '11. Title matches genuine posting');
    assert(result.listings[0].deadline === '31.08.2026', '11. Extracted published application deadline');
    assert(result.listings[0].sourceUrl.includes('klinik.de'), '11. Attributable source URL recorded');
  }

  // Test 12: No Ausbildung listings found
  {
    const mockNoJobsHtml = '<html><body><h2>Karriere</h2><p>Aktuell haben wir leider keine offenen Stellen.</p></body></html>';

    global.fetch = async () => new Response(mockNoJobsHtml, {
      status: 200,
      headers: { 'Content-Type': 'text/html' }
    });

    const result = await verifyCompanyJobs('https://www.noj вакансии.de', 'Pflegefachkraft');
    assert(result.status === 'unverified', '12. Correctly sets status to unverified when no vacancies exist');
    assert(result.listings.length === 0, '12. No listings returned (no fabricated postings)');
  }

  // Restore fetch
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
