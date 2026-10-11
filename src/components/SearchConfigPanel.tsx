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
  ChevronUp,
  ShieldCheck
} from 'lucide-react';
import { CountryCode, CityTier, JobType, ScrapeFilters, CityInfo, SearchEnginePreference } from '../types/scraper';
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
      const allTierCities = countryCities.slice(0, 4).map(c => c.name);
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

    const matchingCities = countryCities
      .filter(c => updatedTiers.includes(c.tier))
      .slice(0, 4)
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

  const selectedEngine = filters.searchEngine || 'auto';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
      <div className="space-y-5">
        
        {/* ROW 0: Data Discovery Engine Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 bg-slate-950/80 rounded-lg border border-slate-800">
          <div className="flex items-center gap-2">
            <Globe2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <span className="text-xs font-semibold text-slate-200">Discovery Engine:</span>
              <span className="text-[11px] text-slate-400 block sm:inline sm:ml-1.5">
                {selectedEngine === 'osm' 
                  ? 'Real OpenStreetMap Overpass data (100% Free · Zero API Key needed)'
                  : selectedEngine === 'google_places'
                  ? 'Official Google Places API (New) Text Search'
                  : 'Auto-detect (Places API if key configured, seamless free OSM fallback)'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => onChangeFilters({ ...filters, searchEngine: 'auto' })}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                selectedEngine === 'auto'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              ⚡ Auto (Best)
            </button>
            <button
              type="button"
              onClick={() => onChangeFilters({ ...filters, searchEngine: 'osm' })}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                selectedEngine === 'osm'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
              title="100% Free OpenStreetMap & Overpass API. Requires zero API keys or billing."
            >
              🌿 Free OpenStreetMap (No Key)
            </button>
            <button
              type="button"
              onClick={() => onChangeFilters({ ...filters, searchEngine: 'google_places' })}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                selectedEngine === 'google_places'
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-sm'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
              title="Google Places API (New) Text Search"
            >
              📍 Google Places API
            </button>
          </div>
        </div>

        {/* ROW 1: Search Query & Presets */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-amber-400" />
              Target Job, Role or Business Type
            </label>
            <span className="text-xs text-slate-400">
              Discovers real company entities, websites & career details
            </span>
          </div>

          <div className="relative">
            <input
              type="text"
              value={filters.jobQuery}
              onChange={(e) => onChangeFilters({ ...filters, jobQuery: e.target.value })}
              placeholder="e.g. Pflegeheim, Klinikum, IT-Systemhaus, 1st Level IT Support, Softwarehaus, Maschinenbau..."
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
            <span className="text-[11px] text-slate-400 mr-1">Suggested Sectors:</span>
            {JOB_PRESETS.map((preset) => {
              const isActive = filters.jobQuery.toLowerCase().includes(preset.title.split(' ')[0].toLowerCase());
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onChangeFilters({
                    ...filters,
                    jobQuery: preset.suggestedIndustries[0] || preset.title.split(' (')[0],
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
                Filter by metropolitan, mid-sized, or small municipalities
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
                Target Cities to Search
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

          {/* Scrollable list of selectable city buttons */}
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

        {/* ROW 4: Verification Pipelines & Reliability Filters */}
        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Verification Pipelines & Reliability Filters</span>
            {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showAdvanced && (
            <div className="mt-3 p-4 bg-slate-950 rounded-lg border border-slate-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              
              {/* Automated Verification Triggers */}
              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Automated Pipelines
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={filters.autoDiscoverEmails}
                    onChange={(e) => onChangeFilters({ ...filters, autoDiscoverEmails: e.target.checked })}
                    className="rounded border-slate-700 text-amber-500 focus:ring-amber-500 bg-slate-900"
                  />
                  <span>Scan public website for emails</span>
                </label>
              </div>

              {/* Data Reliability Filters */}
              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Result Filters
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={filters.mustHaveWebsite}
                    onChange={(e) => onChangeFilters({ ...filters, mustHaveWebsite: e.target.checked })}
                    className="rounded border-slate-700 text-amber-500 focus:ring-amber-500 bg-slate-900"
                  />
                  <span>Official website must be listed</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={filters.mustHaveEmail}
                    onChange={(e) => onChangeFilters({ ...filters, mustHaveEmail: e.target.checked })}
                    className="rounded border-slate-700 text-amber-500 focus:ring-amber-500 bg-slate-900"
                  />
                  <span>Discovered email must be present</span>
                </label>
              </div>

              {/* Places per city */}
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Max Places Per City: {filters.maxResultsPerCity}
                </label>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={filters.maxResultsPerCity}
                  onChange={(e) => onChangeFilters({ ...filters, maxResultsPerCity: parseInt(e.target.value, 10) })}
                  className="w-full accent-amber-500"
                />
                <span className="text-[10px] text-slate-500 block mt-1">
                  Google Places API (New) limit per textQuery page is 20.
                </span>
              </div>

              {/* Attribution Note */}
              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <span className="font-semibold text-slate-300 block">Integrity Notice</span>
                <p>
                  A Google Maps presence verifies a registered business entity with a Place ID, but does not guarantee active job vacancies without attributable career verification.
                </p>
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
            {selectedEngine === 'osm' 
              ? 'Execute Free OSM Search (Zero Key)' 
              : selectedEngine === 'google_places' 
              ? 'Execute Google Places Search' 
              : 'Execute Real Company Search'}
          </button>
        </div>

      </div>
    </div>
  );
};
