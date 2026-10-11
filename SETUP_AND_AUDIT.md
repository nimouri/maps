# MapCareer Discovery - Architecture, Audit & Setup Documentation

## 1. System Audit & Reliability Overhaul

This application has been audited and repaired to meet strict data integrity standards for German, Austrian, and Swiss business and career discovery.

### Summary of Violations Removed

1. **Synthetic Data Generators Eradicated**:
   - Completely deleted all synthetic catalog generators (`generateLocalCompanies`), hardcoded company templates, fabricated ratings, fake phone numbers, and fabricated job openings.
   - When the Google Places API returns 0 results or an error, the application returns an empty result set or a typed error. It **never** falls back to mock or synthetic data.

2. **Official Google Places API (New) Text Search**:
   - Switched from search grounding simulations to the official Google Places API (New) REST endpoint: `https://places.googleapis.com/v1/places:searchText`.
   - Authenticated on the backend using `GOOGLE_MAPS_API_KEY` with solution attribution header: `X-Goog-Maps-Solution-ID: gmp_git_agentskills_v1`.
   - FieldMask used: `places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.websiteUri,places.nationalPhoneNumber,places.internationalPhoneNumber,places.googleMapsUri,places.types,places.businessStatus`.
   - Deduplication enforced by provider `place.id`.

3. **Separation of Google Maps Presence from Ausbildung Verification**:
   - Being registered on Google Maps is **not** treated as evidence of an active apprenticeship vacancy.
   - A company is marked `Ausbildung Confirmed` **only** when an attributable vacancy is confirmed on an official company career page.
   - Otherwise, the company is explicitly labeled `Not verified`.

4. **Honest Email Discovery Pipeline**:
   - No email addresses are ever guessed from domain names (e.g., `bewerbung@domain.de` synthesis is completely banned).
   - Emails are extracted **only** if they physically appear in retrieved public HTML (`/impressum`, `/kontakt`, `/karriere`).
   - Categorized strictly as:
     - `website_recruitment_email` (e.g. `bewerbung@`, `jobs@`, or found on a career subpath)
     - `website_general_email` (e.g. `info@`, `kontakt@`)
     - `no_email_found`
     - `not_checked`
   - Every discovered email records its exact `sourceUrl` and extraction timestamp.

---

## 2. Environment Configuration

### Required Variables (`.env`)

```bash
# GOOGLE_MAPS_API_KEY: Required for Google Places API (New) Text Search
GOOGLE_MAPS_API_KEY="AIzaSy..."

# GEMINI_API_KEY: Optional - used for tone generation in truthful application drafts
GEMINI_API_KEY="AIzaSy..."

# APP_URL: The base URL of the hosted application
APP_URL="http://localhost:3000"
```

---

## 3. API Endpoints

### 1. `POST /api/places/search`
- **Request Body**:
  ```json
  {
    "city": "München",
    "query": "Klinikum",
    "country": "DE",
    "pageSize": 5
  }
  ```
- **Response**: Real Google Places objects with provider Place IDs, formatted addresses, coordinates, and Google Maps URIs.
- **Errors**: Typed error responses with explicit codes (`MISSING_API_KEY`, `AUTHENTICATION_FAILED`, `QUOTA_EXCEEDED`, `INVALID_ARGUMENT`).

### 2. `POST /api/places/discover-email`
- Probes official public pages for physically present emails.
- Stores `primaryEmail`, `sourceUrl`, and `discoveredAt`.

### 3. `POST /api/places/verify-jobs`
- Inspects company career portals (`/karriere`, `/jobs`, `/ausbildung`) for confirmed job listings matching the target query or vocational training criteria.

### 4. `POST /api/application/draft`
- Generates a truthful German application letter. If no confirmed vacancy exists, it structures the letter as an honest proactive inquiry (*Initiativbewerbung*).

---

## 4. Automated Test Suite

Run the automated test suite with:

```bash
npm test
```

### Coverage (33 Passing Tests)
1. Successful Places API response parsing (preserves Place ID, name, coordinates, Google Maps URI)
2. Zero search results (returns empty array, no synthetic fallbacks)
3. Invalid API key error handling (throws `AUTHENTICATION_FAILED`, no mock switch)
4. Missing API key handling (throws `MISSING_API_KEY`)
5. Deduplication of duplicate Place IDs
6. Missing contact details (properly undefined, no synthetic values)
7. Missing coordinates handling (uses city center bias)
8. Strict ban on fabricated fallback data
9. Email discovery (extracts only from page HTML, prioritizes recruitment prefixes)
10. Job verification (requires authentic posting in page text, captures published deadlines and source URLs)
