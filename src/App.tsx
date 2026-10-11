import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  ScrapeFilters, 
  ScrapedCompany, 
  CrawlerStats, 
  CrawlerLogEntry, 
  CityTier 
} from './types/scraper';
import { CITIES_DATABASE } from './data/citiesData';
import { CrawlerHeader } from './components/CrawlerHeader';
import { SearchConfigPanel } from './components/SearchConfigPanel';
import { LiveCrawlerConsole } from './components/LiveCrawlerConsole';
import { ResultsTableView } from './components/ResultsTableView';
import { ResultsMapView } from './components/ResultsMapView';
import { CompanyDetailModal } from './components/CompanyDetailModal';
import { ColdOutreachModal } from './components/ColdOutreachModal';
import { ExtensionSetupModal } from './components/ExtensionSetupModal';
import { AlertCircle, ShieldCheck } from 'lucide-react';

export default function App() {
  // Extension Bridge Detection
  const [isExtensionDetected, setIsExtensionDetected] = useState(false);
  const [showExtensionModal, setShowExtensionModal] = useState(false);

  useEffect(() => {
    const handleExtensionMsg = (event: MessageEvent) => {
      if (!event.data || typeof event.data !== 'object') return;
      if (event.data.type === 'MAPCAREER_EXTENSION_READY' || event.data.type === 'MAPCAREER_PONG') {
        setIsExtensionDetected(true);
      }
    };

    window.addEventListener('message', handleExtensionMsg);
    window.postMessage({ type: 'MAPCAREER_PING' }, '*');

    return () => {
      window.removeEventListener('message', handleExtensionMsg);
    };
  }, []);

  // Initial Filters
  const [filters, setFilters] = useState<ScrapeFilters>({
    country: 'DE',
    selectedTiers: ['big'],
    selectedCities: ['München', 'Berlin'],
    jobQuery: 'Pflegeheim',
    jobType: 'ausbildung',
    searchEngine: 'auto',
    mustHaveWebsite: false,
    mustHaveEmail: false,
    minRating: 3.0,
    maxResultsPerCity: 5,
    autoDiscoverEmails: true
  });

  // Active View
  const [activeView, setActiveView] = useState<'table' | 'map' | 'crawler'>('table');

  // Scraped Companies Data
  const [companies, setCompanies] = useState<ScrapedCompany[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [scanningIds, setScanningIds] = useState<string[]>([]);
  const [apiError, setApiError] = useState<{ message: string; code?: string } | null>(null);

  // Logs and Console State
  const [logs, setLogs] = useState<CrawlerLogEntry[]>([]);
  const [activeModalCompany, setActiveModalCompany] = useState<ScrapedCompany | null>(null);
  const [showOutreachModal, setShowOutreachModal] = useState(false);

  // Pipeline State
  const [stats, setStats] = useState<CrawlerStats>({
    totalCitiesQueued: 0,
    citiesCompleted: 0,
    placesFound: 0,
    emailsDiscovered: 0,
    currentCity: '',
    currentCompany: '',
    currentStep: 'idle',
    isRunning: false,
    isPaused: false,
    elapsedSeconds: 0
  });

  const isCancelledRef = useRef(false);
  const isPausedRef = useRef(false);

  // Helper to append log
  const addLog = useCallback((
    level: CrawlerLogEntry['level'],
    step: CrawlerLogEntry['step'],
    city: string,
    message: string,
    companyName?: string,
    url?: string,
    dataSnippet?: string
  ) => {
    const entry: CrawlerLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toLocaleTimeString(),
      level,
      step,
      city,
      companyName,
      message,
      url,
      dataSnippet
    };
    setLogs((prev) => [...prev, entry]);
  }, []);

  const sleepWithCancel = useCallback(async (ms: number) => {
    const step = 50;
    let elapsed = 0;
    while (elapsed < ms) {
      if (isCancelledRef.current) return false;
      while (isPausedRef.current) {
        if (isCancelledRef.current) return false;
        await new Promise((r) => setTimeout(r, 100));
      }
      await new Promise((r) => setTimeout(r, step));
      elapsed += step;
    }
    return !isCancelledRef.current;
  }, []);

  // On-demand Email Discovery for a single company
  const handleScanEmail = async (company: ScrapedCompany) => {
    if (!company.website) return;
    const scanKey = `${company.id}-email`;
    setScanningIds(prev => [...prev, scanKey]);

    addLog('info', 'contact_discovery', company.city, `Scanning public pages for ${company.name}...`, company.name, company.website);

    try {
      const res = await fetch('/api/places/discover-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ websiteUrl: company.website })
      });
      const data = await res.json();

      if (data.success && data.result) {
        const result = data.result;
        setCompanies(prev => prev.map(c => {
          if (c.id === company.id) {
            return {
              ...c,
              emailStatus: result.status,
              careerEmail: result.primaryEmail || c.careerEmail,
              emailSourceUrl: result.sourceUrl,
              emailDiscoveredAt: result.discoveredAt,
              allDiscoveredEmails: result.allEmails
            };
          }
          return c;
        }));

        if (result.primaryEmail) {
          addLog('success', 'contact_discovery', company.city, `Found verified public email: ${result.primaryEmail}`, company.name, result.sourceUrl);
          setStats(s => ({ ...s, emailsDiscovered: s.emailsDiscovered + 1 }));
        } else {
          addLog('info', 'contact_discovery', company.city, `No public email address found on official site.`, company.name);
        }
      }
    } catch (err: any) {
      addLog('warn', 'contact_discovery', company.city, `Contact scan error: ${err.message}`, company.name);
    } finally {
      setScanningIds(prev => prev.filter(k => k !== scanKey));
    }
  };

  // Main Google Places API Orchestrator
  const runCrawlerPipeline = async () => {
    if (filters.selectedCities.length === 0 || !filters.jobQuery.trim()) return;

    isCancelledRef.current = false;
    isPausedRef.current = false;
    setApiError(null);

    setStats((prev) => ({
      ...prev,
      isRunning: true,
      isPaused: false,
      totalCitiesQueued: filters.selectedCities.length,
      citiesCompleted: 0,
      currentStep: 'places_search',
      currentCity: filters.selectedCities[0]
    }));

    addLog(
      'info',
      'places_search',
      'INIT',
      `Executing Google Places API (New) Text Search for: "${filters.jobQuery}" in ${filters.selectedCities.length} cities (${filters.country})`
    );

    for (let i = 0; i < filters.selectedCities.length; i++) {
      if (isCancelledRef.current) break;

      const cityName = filters.selectedCities[i];

      setStats((prev) => ({
        ...prev,
        currentCity: cityName,
        currentStep: 'places_search'
      }));

      addLog(
        'info',
        'places_search',
        cityName,
        `Calling Google Places API (New) Text Search: "${filters.jobQuery} in ${cityName}"`
      );

      try {
        const response = await fetch('/api/places/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            city: cityName,
            query: filters.jobQuery,
            country: filters.country,
            pageSize: filters.maxResultsPerCity,
            engine: filters.searchEngine || 'auto'
          })
        });

        if (!response.ok) {
          const errData = await response.json();
          const errorMsg = errData.error || `HTTP ${response.status} from server`;
          setApiError({ message: errorMsg, code: errData.code });
          addLog('error', 'places_search', cityName, `Search Error: ${errorMsg}`);
          // Do NOT fake results! Proceed to next city or break
          continue;
        }

        const data = await response.json();
        const cityPlaces: ScrapedCompany[] = data.companies || [];

        addLog(
          'success',
          'places_search',
          cityName,
          `Received ${cityPlaces.length} real businesses from ${data.attribution || 'Maps Provider'}`
        );

        // Deduplicate and append to state
        setCompanies(prev => {
          const existingIds = new Set(prev.map(c => c.id));
          const newUnique = cityPlaces.filter(c => !existingIds.has(c.id));
          return [...newUnique, ...prev];
        });

        setStats(s => ({
          ...s,
          placesFound: s.placesFound + cityPlaces.length
        }));

        // Secondary Pipelines: Contact Discovery & Career Verification
        for (const place of cityPlaces) {
          if (isCancelledRef.current) break;

          setStats(s => ({
            ...s,
            currentCompany: place.name
          }));

          // 1. Email Discovery if enabled
          if (filters.autoDiscoverEmails && place.website) {
            setStats(s => ({ ...s, currentStep: 'contact_discovery' }));
            addLog('info', 'contact_discovery', cityName, `Probing website for public contacts...`, place.name, place.website);

            try {
              const emailRes = await fetch('/api/places/discover-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ websiteUrl: place.website })
              });
              const emailData = await emailRes.json();
              if (emailData.success && emailData.result) {
                const r = emailData.result;
                setCompanies(prev => prev.map(c => {
                  if (c.id === place.id) {
                    return {
                      ...c,
                      emailStatus: r.status,
                      careerEmail: r.primaryEmail || c.careerEmail,
                      emailSourceUrl: r.sourceUrl,
                      emailDiscoveredAt: r.discoveredAt,
                      allDiscoveredEmails: r.allEmails
                    };
                  }
                  return c;
                }));

                if (r.primaryEmail) {
                  setStats(s => ({ ...s, emailsDiscovered: s.emailsDiscovered + 1 }));
                  addLog('success', 'contact_discovery', cityName, `Email retrieved: ${r.primaryEmail}`, place.name, r.sourceUrl);
                }
              }
            } catch (err: any) {
              addLog('warn', 'contact_discovery', cityName, `Email probe failed: ${err.message}`, place.name);
            }
          }

          await sleepWithCancel(200);
        }

      } catch (err: any) {
        addLog('error', 'places_search', cityName, `Request error for ${cityName}: ${err.message}`);
        setApiError({ message: err.message });
      }

      setStats(prev => ({
        ...prev,
        citiesCompleted: prev.citiesCompleted + 1
      }));
    }

    setStats(prev => ({
      ...prev,
      isRunning: false,
      isPaused: false,
      currentStep: 'complete',
      currentCompany: '',
      currentCity: ''
    }));

    addLog('success', 'complete', 'QUEUE_DONE', `Discovery pipeline finished.`);
  };

  const handlePause = () => {
    isPausedRef.current = true;
    setStats(prev => ({ ...prev, isPaused: true }));
    addLog('warn', 'places_search', stats.currentCity || 'SYS', 'Search paused by user.');
  };

  const handleResume = () => {
    isPausedRef.current = false;
    setStats(prev => ({ ...prev, isPaused: false }));
    addLog('info', 'places_search', stats.currentCity || 'SYS', 'Search resumed by user.');
  };

  const handleReset = () => {
    isCancelledRef.current = true;
    isPausedRef.current = false;
    setStats({
      totalCitiesQueued: 0,
      citiesCompleted: 0,
      placesFound: 0,
      emailsDiscovered: 0,
      currentCity: '',
      currentCompany: '',
      currentStep: 'idle',
      isRunning: false,
      isPaused: false,
      elapsedSeconds: 0
    });
    setCompanies([]);
    setLogs([]);
    setApiError(null);
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (select: boolean) => {
    if (select) {
      setSelectedIds(companies.map(c => c.id));
    } else {
      setSelectedIds([]);
    }
  };

  // Export to CSV with full audit trail and provider source
  const handleExportCsv = () => {
    if (companies.length === 0) return;

    const headers = [
      'Source',
      'Google Place ID',
      'Business Name',
      'City',
      'Address',
      'Country',
      'Google Maps URL',
      'Official Website',
      'Phone',
      'Rating',
      'Reviews Count',
      'Discovered Email',
      'Email Status',
      'Email Source URL'
    ];

    const rows = companies.map(c => {
      const sourceLabel = c.providerAttribution?.toLowerCase().includes('openstreetmap') || c.providerAttribution?.toLowerCase().includes('osm')
        ? 'OpenStreetMap — not Google'
        : 'Google Maps (extension)';

      return [
        `"${sourceLabel}"`,
        `"${c.placeId}"`,
        `"${c.name.replace(/"/g, '""')}"`,
        `"${c.city}"`,
        `"${c.address ? c.address.replace(/"/g, '""') : '-'}"`,
        `"${c.country}"`,
        `"${c.mapsUrl}"`,
        `"${c.website || ''}"`,
        `"${c.phone || ''}"`,
        c.rating ?? '',
        c.reviewsCount ?? '',
        `"${c.careerEmail || ''}"`,
        `"${c.emailStatus}"`,
        `"${c.emailSourceUrl || ''}"`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `mapcareer_places_${filters.jobQuery.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to JSON
  const handleExportJson = () => {
    if (companies.length === 0) return;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(companies, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', `mapcareer_places_${filters.jobQuery.replace(/\s+/g, '_')}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Check updated modal company from state
  const currentModalCompany = companies.find(c => c.id === activeModalCompany?.id) || activeModalCompany;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      
      {/* Top Application Header */}
      <CrawlerHeader
        stats={stats}
        onStartCrawl={runCrawlerPipeline}
        onPauseCrawl={handlePause}
        onResumeCrawl={handleResume}
        onResetCrawl={handleReset}
        onOpenOutreachModal={() => setShowOutreachModal(true)}
        onExportCsv={handleExportCsv}
        activeView={activeView}
        setActiveView={setActiveView}
        totalCompanies={companies.length}
        isExtensionDetected={isExtensionDetected}
        onOpenExtensionModal={() => setShowExtensionModal(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Error Banner if API error occurred */}
        {apiError && (
          <div className="bg-rose-950/40 border border-rose-500/50 rounded-xl p-4 flex items-start gap-3 shadow-lg">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-rose-200">Google Places API Error</h3>
              <p className="text-xs text-rose-300/90 leading-relaxed">{apiError.message}</p>
              <p className="text-[11px] text-rose-400/80">
                Data integrity enforcement: Mock fallbacks are disabled. Please check your GOOGLE_MAPS_API_KEY and quota.
              </p>
            </div>
          </div>
        )}

        {/* Search, Filter & Trigger Configuration Panel */}
        <SearchConfigPanel
          filters={filters}
          onChangeFilters={setFilters}
          isRunning={stats.isRunning}
          onTriggerScrape={runCrawlerPipeline}
        />

        {/* Dynamic Main View Switcher */}
        {activeView === 'crawler' && (
          <LiveCrawlerConsole
            logs={logs}
            stats={stats}
            latestCompany={companies[0]}
            onPause={handlePause}
            onResume={handleResume}
            onClearLogs={() => setLogs([])}
          />
        )}

        {activeView === 'table' && (
          <div className="space-y-6">
            {stats.isRunning && (
              <div className="bg-slate-900 border border-amber-500/30 rounded-xl p-3.5 flex items-center justify-between shadow-lg text-xs">
                <div className="flex items-center gap-3">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                  </span>
                  <div>
                    <span className="text-slate-400">Executing Places API discovery: </span>
                    <strong className="text-white font-semibold">
                      Searching {stats.currentCity || 'cities'} for {filters.jobQuery}
                    </strong>
                    {stats.currentCompany && (
                      <span className="text-amber-400 font-mono ml-2">
                        [{stats.currentCompany}]
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveView('crawler')}
                  className="text-xs text-amber-400 hover:text-amber-300 font-medium underline"
                >
                  View Pipeline Logs &rarr;
                </button>
              </div>
            )}

            <ResultsTableView
              companies={companies}
              onSelectCompany={(comp) => setActiveModalCompany(comp)}
              onGeneratePitch={(comp) => setActiveModalCompany(comp)}
              onScanEmail={handleScanEmail}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
              onSelectAll={handleSelectAll}
              scanningIds={scanningIds}
            />
          </div>
        )}

        {activeView === 'map' && (
          <ResultsMapView
            companies={companies}
            onSelectCompany={(comp) => setActiveModalCompany(comp)}
            onGeneratePitch={(comp) => setActiveModalCompany(comp)}
          />
        )}

      </main>

      {/* Modal: Full Verified Dossier */}
      {currentModalCompany && (
        <CompanyDetailModal
          company={currentModalCompany}
          onClose={() => setActiveModalCompany(null)}
          onScanEmail={handleScanEmail}
          isScanningEmail={scanningIds.includes(`${currentModalCompany.id}-email`)}
        />
      )}

      {/* Modal: Discovered Contacts Export */}
      {showOutreachModal && (
        <ColdOutreachModal
          companies={companies}
          onClose={() => setShowOutreachModal(false)}
          onExportCsv={handleExportCsv}
          onExportJson={handleExportJson}
        />
      )}

      {/* Modal: Live Extension Bridge Setup */}
      <ExtensionSetupModal
        isOpen={showExtensionModal}
        onClose={() => setShowExtensionModal(false)}
        isExtensionDetected={isExtensionDetected}
      />

      {/* Attribution Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 space-y-1">
          <p>
            MapCareer Discovery · Google Maps Platform & OpenStreetMap Free Overpass Engine
          </p>
          <p className="text-[11px] text-slate-600">
            Real business discovery · All listings backed by genuine provider IDs · Zero synthetic data
          </p>
        </div>
      </footer>

    </div>
  );
}
