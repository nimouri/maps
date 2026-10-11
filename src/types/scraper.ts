export type CountryCode = 'DE' | 'AT' | 'CH';

export type CityTier = 'big' | 'mid' | 'small' | 'all';

export type JobType = 'all' | 'ausbildung' | 'fulltime' | 'parttime' | 'internship' | 'dual_study';

export type EmailDiscoveryStatus = 
  | 'website_recruitment_email'   // Found on official website with recruitment intent (bewerbung@, jobs@, /karriere)
  | 'website_general_email'       // Found on official website (info@, kontakt@)
  | 'unverified_email'           // Email found but domain/mailbox uncorroborated
  | 'no_email_found'             // Crawled official pages, no public email found
  | 'not_checked';               // Contact discovery not yet executed

export type AusbildungVerificationStatus = 
  | 'confirmed_listing'          // Verified real apprenticeship posting found on official career portal
  | 'unverified'                 // Company exists on Maps, but NO active Ausbildung listing verified
  | 'not_checked';               // Job verification not yet executed

export interface ConfirmedJobListing {
  title: string;
  jobType: 'Ausbildung' | 'Vollzeit' | 'Teilzeit' | 'Praktikum' | 'Duales Studium';
  sourceUrl: string;
  verifiedAt: string;
  deadline?: string;
  snippet?: string;
}

export interface CityInfo {
  name: string;
  country: CountryCode;
  state: string; // Bundesland
  tier: 'big' | 'mid' | 'small';
  population: number;
  lat: number;
  lng: number;
}

export type SearchEnginePreference = 'auto' | 'osm' | 'google_places' | 'extension';

export interface ScrapeFilters {
  country: CountryCode;
  selectedTiers: CityTier[];
  selectedCities: string[];
  jobQuery: string;
  jobType: JobType;
  searchEngine?: SearchEnginePreference;
  mustHaveWebsite: boolean;
  mustHaveEmail: boolean;
  confirmedAusbildungOnly: boolean;
  minRating: number;
  maxResultsPerCity: number;
  autoDiscoverEmails: boolean;
  autoVerifyJobs: boolean;
}

export interface ScrapedCompany {
  id: string; // Real Provider Place ID / OSM ID
  placeId: string;
  name: string;
  city: string;
  state: string;
  address: string;
  country: CountryCode;
  website?: string;
  phone?: string;
  rating?: number;
  reviewsCount?: number;
  lat?: number;
  lng?: number;
  mapsUrl: string; // Real Maps URL
  placeTypes: string[];
  businessStatus?: string;
  providerAttribution: string;
  discoveredAt: string;

  // Real Email Discovery Pipeline
  emailStatus: EmailDiscoveryStatus;
  careerEmail?: string;
  emailSourceUrl?: string;
  emailDiscoveredAt?: string;
  allDiscoveredEmails: string[];

  // Real Job & Ausbildung Verification Pipeline
  ausbildungStatus: AusbildungVerificationStatus;
  confirmedListings: ConfirmedJobListing[];
  careerPortalUrl?: string;
  jobVerificationNotes?: string;
}

export interface CrawlerLogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'success' | 'warn' | 'error';
  step: 'places_search' | 'contact_discovery' | 'job_verification' | 'complete';
  city: string;
  companyName?: string;
  message: string;
  url?: string;
  dataSnippet?: string;
}

export interface CrawlerStats {
  totalCitiesQueued: number;
  citiesCompleted: number;
  placesFound: number;
  emailsDiscovered: number;
  confirmedAusbildung: number;
  currentCity: string;
  currentCompany: string;
  currentStep: string;
  isRunning: boolean;
  isPaused: boolean;
  elapsedSeconds: number;
}
