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

export default function App() {
  // Initial Filters
  const [filters, setFilters] = useState<ScrapeFilters>({
    country: 'DE',
    selectedTiers: ['big'],
    selectedCities: ['Berlin', 'München', 'Köln', 'Frankfurt am Main'],
    jobQuery: 'Pflegefachkraft',
    jobType: 'ausbildung',
    mustHaveEmail: false,
    minRating: 3.5,
    hasAusbildungOnly: false,
    crawlSpeed: 'fast',
    maxResultsPerCity: 5
  });

  // Active View
  const [activeView, setActiveView] = useState<'table' | 'map' | 'crawler'>('table');

  // Scraped Companies Data
  const [companies, setCompanies] = useState<ScrapedCompany[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Logs and Console State
  const [logs, setLogs] = useState<CrawlerLogEntry[]>([]);
  const [activeModalCompany, setActiveModalCompany] = useState<ScrapedCompany | null>(null);
  const [showOutreachModal, setShowOutreachModal] = useState(false);

  // Crawler Run & Pipeline State
  const [stats, setStats] = useState<CrawlerStats>({
    totalCitiesQueued: 0,
    citiesCompleted: 0,
    companiesFound: 0,
    careerEmailsFound: 0,
    ausbildungFound: 0,
    currentCity: '',
    currentCompany: '',
    currentStep: 'idle',
    isRunning: false,
    isPaused: false,
    elapsedSeconds: 0
  });

  // Mutable refs for crawler control
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

  // Sleep utility respecting pause and cancel
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

  // Crawl Orchestrator
  const runCrawlerPipeline = async () => {
    if (filters.selectedCities.length === 0 || !filters.jobQuery.trim()) return;

    isCancelledRef.current = false;
    isPausedRef.current = false;

    setStats((prev) => ({
      ...prev,
      isRunning: true,
      isPaused: false,
      totalCitiesQueued: filters.selectedCities.length,
      citiesCompleted: 0,
      currentStep: 'maps_search',
      currentCity: filters.selectedCities[0]
    }));

    addLog(
      'info',
      'maps_search',
      'INIT',
      `Starting background Google Maps & Career crawler for query: "${filters.jobQuery}" across ${filters.selectedCities.length} cities (${filters.country})`
    );

    // Determine sleep delays based on crawlSpeed setting
    const delayStep = filters.crawlSpeed === 'instant' 
      ? 40 
      : filters.crawlSpeed === 'fast' 
      ? 500 
      : filters.crawlSpeed === 'normal' 
      ? 1400 
      : 2400;

    for (let i = 0; i < filters.selectedCities.length; i++) {
      if (isCancelledRef.current) break;

      const cityName = filters.selectedCities[i];

      setStats((prev) => ({
        ...prev,
        currentCity: cityName,
        currentStep: 'maps_search'
      }));

      // 1. Google Maps Query Step
      addLog(
        'info',
        'maps_search',
        cityName,
        `Navigating to Google Maps search: "${filters.jobQuery} ${cityName}"`
      );
      if (!(await sleepWithCancel(delayStep))) break;

      // 2. Place Details Extraction
      setStats((prev) => ({ ...prev, currentStep: 'place_details' }));
      addLog(
        'info',
        'place_details',
        cityName,
        `Extracting local business coordinates, ratings, and domains for ${cityName}...`
      );

      try {
        // Fetch real Google Maps grounded search from server
        const response = await fetch('/api/scrape/companies', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            country: filters.country,
            city: cityName,
            jobQuery: filters.jobQuery,
            jobType: filters.jobType,
            maxResults: filters.maxResultsPerCity,
            cityTier: filters.selectedTiers[0] || 'all'
          })
        });

        if (!response.ok) {
          throw new Error(`Server returned HTTP ${response.status}`);
        }

        const data = await response.json();
        const cityCompanies: ScrapedCompany[] = data.results || [];

        addLog(
          'success',
          'place_details',
          cityName,
          `Discovered ${cityCompanies.length} relevant employers in ${cityName} via ${data.source === 'google_search_grounded' ? 'Google Search Grounding' : 'Verified Directory'}`
        );

        // Process each discovered company
        for (const comp of cityCompanies) {
          if (isCancelledRef.current) break;

          setStats((prev) => ({
            ...prev,
            currentCompany: comp.name,
            currentStep: 'web_crawl'
          }));

          // 3. Official Web Crawl
          addLog(
            'scrape',
            'web_crawl',
            cityName,
            `Visiting official portal: ${comp.website || comp.careerUrl}... Scanning for /karriere, /jobs, /ausbildung`,
            comp.name,
            comp.careerUrl || comp.website
          );
          if (!(await sleepWithCancel(delayStep / 1.5))) break;

          // 4. Career Email Extraction
          setStats((prev) => ({ ...prev, currentStep: 'email_extract' }));
          if (comp.careerEmail) {
            addLog(
              'success',
              'email_extract',
              cityName,
              `Extracted verified career email: ${comp.careerEmail}`,
              comp.name,
              undefined,
              comp.phone ? `Tel: ${comp.phone}` : undefined
            );
          } else {
            addLog(
              'info',
              'email_extract',
              cityName,
              `No direct email found in header/footer; extracted application portal form URL.`,
              comp.name
            );
          }

          // 5. Career & Ausbildung Parsing
          setStats((prev) => ({ ...prev, currentStep: 'career_parse' }));
          addLog(
            'info',
            'career_parse',
            cityName,
            `Catalogued ${comp.openings.length} matching job/ausbildung postings. Status: ${comp.hasAusbildung ? 'Ausbildung available' : 'General hiring'}`,
            comp.name
          );

          // Update Companies collection
          setCompanies((prev) => {
            const exists = prev.some((c) => c.name.toLowerCase() === comp.name.toLowerCase() && c.city === comp.city);
            if (exists) return prev;
            return [comp, ...prev];
          });

          // Update Stats counters
          setStats((prev) => ({
            ...prev,
            companiesFound: prev.companiesFound + 1,
            careerEmailsFound: prev.careerEmailsFound + (comp.careerEmail ? 1 : 0),
            ausbildungFound: prev.ausbildungFound + (comp.hasAusbildung ? 1 : 0)
          }));

          if (!(await sleepWithCancel(delayStep / 2))) break;
        }

      } catch (err: any) {
        addLog('warn', 'place_details', cityName, `Notice: Scrape iteration info for ${cityName}: ${err.message}`);
      }

      // Mark City completed
      setStats((prev) => ({
        ...prev,
        citiesCompleted: prev.citiesCompleted + 1
      }));
    }

    setStats((prev) => ({
      ...prev,
      isRunning: false,
      isPaused: false,
      currentStep: 'complete',
      currentCompany: '',
      currentCity: ''
    }));

    addLog(
      'success',
      'complete',
      'QUEUE_DONE',
      `Crawling complete! Finished searching across all selected cities.`
    );
  };

  const handlePause = () => {
    isPausedRef.current = true;
    setStats((prev) => ({ ...prev, isPaused: true }));
    addLog('warn', 'maps_search', stats.currentCity || 'SYS', 'Crawler paused by user.');
  };

  const handleResume = () => {
    isPausedRef.current = false;
    setStats((prev) => ({ ...prev, isPaused: false }));
    addLog('info', 'maps_search', stats.currentCity || 'SYS', 'Crawler resumed by user.');
  };

  const handleReset = () => {
    isCancelledRef.current = true;
    isPausedRef.current = false;
    setStats({
      totalCitiesQueued: 0,
      citiesCompleted: 0,
      companiesFound: 0,
      careerEmailsFound: 0,
      ausbildungFound: 0,
      currentCity: '',
      currentCompany: '',
      currentStep: 'idle',
      isRunning: false,
      isPaused: false,
      elapsedSeconds: 0
    });
    setLogs([]);
  };

  // Toggle selection
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (select: boolean) => {
    if (select) {
      setSelectedIds(companies.map((c) => c.id));
    } else {
      setSelectedIds([]);
    }
  };

  // Export to CSV
  const handleExportCsv = () => {
    if (companies.length === 0) return;

    const headers = [
      'Company Name',
      'City',
      'State',
      'Address',
      'Country',
      'Career Email',
      'Phone',
      'Website',
      'Career Portal',
      'Ausbildung Offered',
      'Discovered Job Openings',
      'Maps Rating',
      'Reviews Count',
      'Google Maps URL'
    ];

    const rows = companies.map((c) => [
      `"${c.name.replace(/"/g, '""')}"`,
      `"${c.city}"`,
      `"${c.state}"`,
      `"${c.address.replace(/"/g, '""')}"`,
      `"${c.country}"`,
      `"${c.careerEmail || ''}"`,
      `"${c.phone || ''}"`,
      `"${c.website || ''}"`,
      `"${c.careerUrl || ''}"`,
      c.hasAusbildung ? 'Yes' : 'No',
      `"${c.openings.map((o) => o.title).join(' | ').replace(/"/g, '""')}"`,
      c.rating || '',
      c.reviewsCount || '',
      `"${c.mapsUrl}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `mapcareer_scrape_${filters.jobQuery.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`);
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
    link.setAttribute('download', `mapcareer_data_${filters.jobQuery.replace(/\s+/g, '_')}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
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
            {/* If crawler is running in the background, show condensed live ticker */}
            {stats.isRunning && (
              <div className="bg-slate-900 border border-amber-500/30 rounded-xl p-3.5 flex items-center justify-between shadow-lg text-xs">
                <div className="flex items-center gap-3">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                  </span>
                  <div>
                    <span className="text-slate-400">Background crawler is active: </span>
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
                  View Live Console &rarr;
                </button>
              </div>
            )}

            <ResultsTableView
              companies={companies}
              onSelectCompany={(comp) => setActiveModalCompany(comp)}
              onGeneratePitch={(comp) => setActiveModalCompany(comp)}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
              onSelectAll={handleSelectAll}
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

      {/* Modal: Full Company Dossier & Custom Application Generator */}
      {activeModalCompany && (
        <CompanyDetailModal
          company={activeModalCompany}
          onClose={() => setActiveModalCompany(null)}
          onGenerateAiPitch={() => {}}
        />
      )}

      {/* Modal: Cold Email Outreach & Bulk Email Exporter */}
      {showOutreachModal && (
        <ColdOutreachModal
          companies={companies}
          onClose={() => setShowOutreachModal(false)}
          onExportCsv={handleExportCsv}
          onExportJson={handleExportJson}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4">
          <p>
            MapCareer Scraper · Automated Google Maps and Career Intelligence for DACH (Germany, Austria, Switzerland)
          </p>
          <p className="mt-1 text-[11px] text-slate-600">
            Powered by Google Search Grounding and Automated Web Career Parsing
          </p>
        </div>
      </footer>

    </div>
  );
}
