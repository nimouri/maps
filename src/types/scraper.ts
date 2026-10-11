export type CountryCode = 'DE' | 'AT' | 'CH';

export type CityTier = 'big' | 'mid' | 'small' | 'all';

export type JobType = 'all' | 'ausbildung' | 'fulltime' | 'parttime' | 'internship' | 'dual_study';

export interface CityInfo {
  name: string;
  country: CountryCode;
  state: string; // Bundesland
  tier: 'big' | 'mid' | 'small';
  population: number;
  lat: number;
  lng: number;
}

export interface ScrapeFilters {
  country: CountryCode;
  selectedTiers: CityTier[];
  selectedCities: string[];
  jobQuery: string;
  jobType: JobType;
  mustHaveEmail: boolean;
  minRating: number;
  hasAusbildungOnly: boolean;
  crawlSpeed: 'instant' | 'fast' | 'normal' | 'detailed';
  maxResultsPerCity: number;
}

export interface CompanyJobOpening {
  title: string;
  jobType: 'Ausbildung' | 'Vollzeit' | 'Teilzeit' | 'Praktikum' | 'Duales Studium';
  description?: string;
  requirements?: string[];
  department?: string;
}

export interface ScrapedCompany {
  id: string;
  name: string;
  city: string;
  state: string;
  postalCode?: string;
  address: string;
  country: CountryCode;
  website: string;
  careerUrl?: string;
  careerEmail?: string;
  allEmails?: string[];
  phone?: string;
  rating?: number;
  reviewsCount?: number;
  openings: CompanyJobOpening[];
  hasAusbildung: boolean;
  industry: string;
  lat: number;
  lng: number;
  mapsUrl: string;
  scrapedAt: string;
  source: 'google_maps_scrape' | 'google_search_grounded' | 'verified_catalog';
  status: 'scraped' | 'deep_scanned' | 'email_verified' | 'contacted';
  notes?: string;
}

export interface CrawlerLogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'success' | 'warn' | 'error' | 'scrape';
  step: 'maps_search' | 'place_details' | 'web_crawl' | 'career_parse' | 'email_extract' | 'complete';
  city: string;
  companyName?: string;
  message: string;
  url?: string;
  dataSnippet?: string;
}

export interface CrawlerStats {
  totalCitiesQueued: number;
  citiesCompleted: number;
  companiesFound: number;
  careerEmailsFound: number;
  ausbildungFound: number;
  currentCity: string;
  currentCompany: string;
  currentStep: string;
  isRunning: boolean;
  isPaused: boolean;
  startTime?: number;
  elapsedSeconds: number;
}
