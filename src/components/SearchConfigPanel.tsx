import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  MapPin, 
  Filter, 
  Search, 
  SlidersHorizontal, 
  Briefcase, 
  GraduationCap, 
  Check, 
  X, 
  Zap, 
  Globe2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { CountryCode, CityTier, JobType, ScrapeFilters, CityInfo } from '../types/scraper';
import { CITIES_DATABASE, COUNTRY_NAMES, TIER_LABELS } from '../data/citiesData';
import { JOB_PRESETS } from '../data/sampleJobProfiles';

interface Props {
  filters: ScrapeFilters;
  onChangeFilters: (newFilters: ScrapeFilters) => void;
  isRunning: boolean;
  onTriggerScrape: () => void;
}

export const SearchConfigPanel: React.FC<Props> = ({
  filters,
  onChangeFilters,
  isRunning,
  onTriggerScrape
}) => {
  const [citySearchInput, setCitySearchInput] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Available cities based on selected country
  const countryCities = useMemo(() => {
    return CITIES_DATABASE.filter(c => c.country === filters.country);
  }, [filters.country]);

  // Cities matching tier and search text
  const visibleCities = useMemo(() => {
    return countryCities.filter(c => {
      const matchesTier = filters.selectedTiers.includes('all') || filters.selectedTiers.includes(c.tier);
      const matchesSearch = !citySearchInput.trim() || 
        c.name.toLowerCase().includes(citySearchInput.toLowerCase()) ||
        c.state.toLowerCase().includes(citySearchInput.toLowerCase());
      return matchesTier && matchesSearch;
    });
  }, [countryCities, filters.selectedTiers, citySearchInput]);

  // Count by tier for the current country
  const tierCounts = useMemo(() => {
    return {
      big: countryCities.filter(c => c.tier === 'big').length,
      mid: countryCities.filter(c => c.tier === 'mid').length,
      small: countryCities.filter(c => c.tier === 'small').length,
      all: countryCities.length
    };
  }, [countryCities]);

  // Handle country switch
  const handleCountryChange = (country: CountryCode) => {
    const defaultCities = CITIES_DATABASE
      .filter(c => c.country === country && c.tier === 'big')
      .slice(0, 3)
      .map(c => c.name);
    
    onChangeFilters({
      ...filters,
      country,
      selectedCities: defaultCities.length ? defaultCities : [CITIES_DATABASE.find(c => c.country === country)?.name || 'Berlin']
    });
  };

  // Toggle tier selection
  const handleTierToggle = (tier: CityTier) => {
    let updatedTiers: CityTier[];
    if (tier === 'all') {
      updatedTiers = ['all'];
      // Select top cities across tiers
      const allTierCities = countryCities.slice(0, 6).map(c => c.name);
      onChangeFilters({
        ...filters,
        selectedTiers: updatedTiers,
        selectedCities: allTierCities
      });
      return;
    }

    if (filters.selectedTiers.includes(tier)) {
      updatedTiers = filters.selectedTiers.filter(t => t !== tier && t !== 'all');
      if (updatedTiers.length === 0) updatedTiers = ['big'];
    } else {
      updatedTiers = [...filters.selectedTiers.filter(t => t !== 'all'), tier];
    }

    // Auto update selected cities to match active tiers
    const matchingCities = countryCities
      .filter(c => updatedTiers.includes(c.tier))
      .slice(0, 5)
      .map(c => c.name);

    onChangeFilters({
      ...filters,
      selectedTiers: updatedTiers,
      selectedCities: matchingCities.length ? matchingCities : filters.selectedCities
    });
  };

  // Toggle city in list
  const handleToggleCity = (cityName: string) => {
    const isSelected = filters.selectedCities.includes(cityName);
    let updated: string[];
    if (isSelected) {
      updated = filters.selectedCities.filter(c => c !== cityName);
    } else {
      updated = [...filters.selectedCities, cityName];
    }
    onChangeFilters({
      ...filters,
      selectedCities: updated
    });
  };

  // Select all currently visible filtered cities
  const handleSelectAllVisible = () => {
    const newCities = Array.from(new Set([...filters.selectedCities, ...visibleCities.map(c => c.name)]));
    onChangeFilters({ ...filters, selectedCities: newCities });
  };

  // Clear selected cities
  const handleClearSelected = () => {
    onChangeFilters({ ...filters, selectedCities: [] });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
      <div className="space-y-5">
        
        {/* ROW 1: Search Query & Presets */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-amber-400" />
              Target Job, Role or Ausbildung
            </label>
            <span className="text-xs text-slate-400">
              Scrapes Google Maps employers & career pages
            </span>
          </div>

          <div className="relative">
            <input
              type="text"
              value={filters.jobQuery}
              onChange={(e) => onChangeFilters({ ...filters, jobQuery: e.target.value })}
              placeholder="e.g. Pflegefachkraft, 1st Level IT Support, Fachinformatiker, Mechatroniker..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-medium"
            />
            {filters.jobQuery && (
              <button
                type="button"
                onClick={() => onChangeFilters({ ...filters, jobQuery: '' })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Presets */}
          <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-slate-400 mr-1">Quick Presets:</span>
            {JOB_PRESETS.map((preset) => {
              const isActive = filters.jobQuery.toLowerCase().includes(preset.title.split(' ')[0].toLowerCase());
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onChangeFilters({
                    ...filters,
                    jobQuery: preset.title.split(' (')[0],
                    jobType: preset.defaultJobType
                  })}
                  className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                    isActive
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium'
                      : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/50'
                  }`}
                >
                  {preset.title.split(' (')[0]}
                </button>
              );
            })}
          </div>
        </div>

        {/* ROW 2: Country & City Size Tiers */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-1 border-t border-slate-800/70">
          
          {/* Country Selector */}
          <div className="md:col-span-4">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-2">
              Country / Region
            </label>
            <div className="grid grid-cols-3 gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
              {(['DE', 'AT', 'CH'] as CountryCode[]).map((cCode) => {
                const info = COUNTRY_NAMES[cCode];
                const isSelected = filters.country === cCode;
                return (
                  <button
                    key={cCode}
                    type="button"
                    onClick={() => handleCountryChange(cCode)}
                    className={`py-1.5 px-2 text-xs font-medium rounded-md transition-all flex items-center justify-center gap-1.5 ${
                      isSelected
                        ? 'bg-slate-800 text-white shadow-sm border border-slate-700 font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>{info.flag}</span>
                    <span className="truncate">{info.name.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* City Size Filter Tiers */}
          <div className="md:col-span-8">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                City Size Categories
              </label>
              <span className="text-[11px] text-slate-400">
                Choose big, mid, small or combination
              </span>
            </div>

            <div className="grid grid-cols-4 gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
              {(['big', 'mid', 'small', 'all'] as CityTier[]).map((tier) => {
                const isSelected = filters.selectedTiers.includes(tier);
                const count = tierCounts[tier];
                const label = tier === 'big' 
                  ? 'Big (>100k)' 
                  : tier === 'mid' 
                  ? 'Mid (20k-100k)' 
                  : tier === 'small' 
                  ? 'Small (<20k)' 
                  : 'All Cities';

                return (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => handleTierToggle(tier)}
                    className={`py-1.5 px-2 text-xs rounded-md transition-all text-center flex flex-col items-center ${
                      isSelected
                        ? 'bg-amber-500/15 text-amber-200 border border-amber-500/30 font-medium'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className="font-semibold">{label}</span>
                    <span className="text-[10px] text-slate-400">{count} cities</span>
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        {/* ROW 3: Interactive City Selector */}
        <div className="pt-2 border-t border-slate-800/70">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                Target Cities to Scrape
              </label>
              <span className="text-xs font-medium text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                {filters.selectedCities.length} selected
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={handleSelectAllVisible}
                className="text-slate-400 hover:text-amber-400 transition-colors"
              >
                Select visible ({visibleCities.length})
              </button>
              <span className="text-slate-700" aria-hidden="true">·</span>
              <button
                type="button"
                onClick={handleClearSelected}
                className="text-slate-400 hover:text-rose-400 transition-colors"
              >
                Clear all
              </button>
            </div>
          </div>

          {/* Quick city search filter */}
          <div className="relative mb-2.5">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={citySearchInput}
              onChange={(e) => setCitySearchInput(e.target.value)}
              placeholder="Quick filter cities by name or state (e.g. Berlin, Bayern, Köln, Hessen)..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8.5 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
            />
          </div>

          {/* Scrollable list of selectable city pills */}
          <div className="max-h-36 overflow-y-auto p-2 bg-slate-950/80 rounded-lg border border-slate-800/80 flex flex-wrap gap-1.5">
            {visibleCities.length === 0 ? (
              <div className="text-xs text-slate-500 py-3 text-center w-full">
                No cities match your current filter. Try clearing the search or picking another tier.
              </div>
            ) : (
              visibleCities.map((city) => {
                const isSelected = filters.selectedCities.includes(city.name);
                return (
                  <button
                    key={`${city.country}-${city.name}`}
                    type="button"
                    onClick={() => handleToggleCity(city.name)}
                    className={`text-xs px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm shadow-amber-500/20'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                    }`}
                  >
                    <span>{city.name}</span>
                    <span className={`text-[10px] ${isSelected ? 'text-slate-800 font-medium' : 'text-slate-500'}`}>
                      ({city.state})
                    </span>
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ROW 4: Advanced Scraper Options Toggle */}
        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Advanced Scraper & Filtering Options</span>
            {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showAdvanced && (
            <div className="mt-3 p-4 bg-slate-950 rounded-lg border border-slate-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              
              {/* Job Type */}
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Employment Type
                </label>
                <select
                  value={filters.jobType}
                  onChange={(e) => onChangeFilters({ ...filters, jobType: e.target.value as JobType })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="all">All Types (Ausbildung & Jobs)</option>
                  <option value="ausbildung">Ausbildung (Vocational Apprenticeship)</option>
                  <option value="fulltime">Vollzeit (Full-time)</option>
                  <option value="parttime">Teilzeit (Part-time)</option>
                  <option value="internship">Praktikum (Internship)</option>
                  <option value="dual_study">Duales Studium</option>
                </select>
              </div>

              {/* Crawl Speed / Simulation Mode */}
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Browser Throttling Speed
                </label>
                <select
                  value={filters.crawlSpeed}
                  onChange={(e) => onChangeFilters({ ...filters, crawlSpeed: e.target.value as any })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="instant">Instant (Fastest)</option>
                  <option value="fast">Fast (1.0s interval)</option>
                  <option value="normal">Normal / Realistic (2.5s interval)</option>
                  <option value="detailed">Thorough Deep Scan (4.0s interval)</option>
                </select>
              </div>

              {/* Quality Filters */}
              <div className="flex flex-col justify-end space-y-2">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={filters.mustHaveEmail}
                    onChange={(e) => onChangeFilters({ ...filters, mustHaveEmail: e.target.checked })}
                    className="rounded border-slate-700 text-amber-500 focus:ring-amber-500 bg-slate-900"
                  />
                  <span>Must have verified career email</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={filters.hasAusbildungOnly}
                    onChange={(e) => onChangeFilters({ ...filters, hasAusbildungOnly: e.target.checked })}
                    className="rounded border-slate-700 text-amber-500 focus:ring-amber-500 bg-slate-900"
                  />
                  <span>Filter companies with Ausbildung only</span>
                </label>
              </div>

              {/* Max Results Per City */}
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Max Companies Per City: {filters.maxResultsPerCity}
                </label>
                <input
                  type="range"
                  min="2"
                  max="12"
                  value={filters.maxResultsPerCity}
                  onChange={(e) => onChangeFilters({ ...filters, maxResultsPerCity: parseInt(e.target.value, 10) })}
                  className="w-full accent-amber-500"
                />
              </div>

            </div>
          )}
        </div>

        {/* Trigger Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-800">
          <div className="text-xs text-slate-400">
            <span>Query: </span>
            <strong className="text-amber-300 font-semibold">{filters.jobQuery || '(None)'}</strong>
            <span className="mx-1.5">·</span>
            <span>Targeting: </span>
            <strong className="text-white font-semibold">
              {filters.selectedCities.length} {filters.selectedCities.length === 1 ? 'city' : 'cities'}
            </strong>
            <span className="text-slate-500 ml-1">
              ({filters.selectedCities.slice(0, 3).join(', ')}{filters.selectedCities.length > 3 ? '...' : ''})
            </span>
          </div>

          <button
            type="button"
            onClick={onTriggerScrape}
            disabled={isRunning || filters.selectedCities.length === 0 || !filters.jobQuery.trim()}
            className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold text-sm rounded-lg shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 active:scale-98"
          >
            <Zap className="w-4 h-4 fill-current" />
            Launch Google Maps Scraper
          </button>
        </div>

      </div>
    </div>
  );
};
