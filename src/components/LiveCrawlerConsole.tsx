import React, { useState, useEffect, useRef } from 'react';
import { 
  Terminal, 
  Globe, 
  MapPin, 
  Mail, 
  Search, 
  CheckCircle, 
  AlertCircle, 
  ArrowRight, 
  Pause, 
  Play, 
  RotateCcw, 
  ExternalLink,
  Cpu,
  ShieldCheck,
  Building
} from 'lucide-react';
import { CrawlerLogEntry, CrawlerStats, ScrapedCompany } from '../types/scraper';

interface Props {
  logs: CrawlerLogEntry[];
  stats: CrawlerStats;
  latestCompany?: ScrapedCompany;
  onPause: () => void;
  onResume: () => void;
  onClearLogs: () => void;
}

export const LiveCrawlerConsole: React.FC<Props> = ({
  logs,
  stats,
  latestCompany,
  onPause,
  onResume,
  onClearLogs
}) => {
  const [filterLevel, setFilterLevel] = useState<'all' | 'email' | 'scrape'>('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of logs when updated
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const filteredLogs = logs.filter(log => {
    if (filterLevel === 'email') return log.step === 'email_extract';
    if (filterLevel === 'scrape') return log.level === 'scrape' || log.level === 'success';
    return true;
  });

  const getStepStatus = (stepName: string) => {
    if (!stats.isRunning) return 'idle';
    if (stats.currentStep === stepName) return 'active';
    return 'done';
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
      
      {/* Console Top Bar */}
      <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex space-x-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></div>
          </div>
          <span className="text-xs font-mono font-semibold text-slate-300 flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5 text-amber-400" />
            background_maps_crawler.py
          </span>
          {stats.isRunning && (
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              {stats.isPaused ? 'PAUSED' : 'ACTIVE PIPELINE'}
            </span>
          )}
        </div>

        {/* Filter & Actions */}
        <div className="flex items-center gap-2 text-xs">
          <div className="flex bg-slate-900 rounded-md p-0.5 border border-slate-800 text-[11px]">
            <button
              onClick={() => setFilterLevel('all')}
              className={`px-2 py-1 rounded transition-colors ${filterLevel === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}
            >
              All Logs ({logs.length})
            </button>
            <button
              onClick={() => setFilterLevel('email')}
              className={`px-2 py-1 rounded transition-colors ${filterLevel === 'email' ? 'bg-slate-800 text-emerald-300' : 'text-slate-400'}`}
            >
              Emails ({stats.careerEmailsFound})
            </button>
            <button
              onClick={() => setFilterLevel('scrape')}
              className={`px-2 py-1 rounded transition-colors ${filterLevel === 'scrape' ? 'bg-slate-800 text-amber-300' : 'text-slate-400'}`}
            >
              Scraped ({stats.companiesFound})
            </button>
          </div>

          <label className="flex items-center gap-1 text-[11px] text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="rounded border-slate-700 bg-slate-900 text-amber-500 text-xs"
            />
            Auto-scroll
          </label>

          <button
            onClick={onClearLogs}
            className="text-[11px] text-slate-400 hover:text-slate-200 px-2 py-1 rounded bg-slate-900 border border-slate-800 transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Pipeline Visualizer Steps */}
      <div className="bg-slate-950/60 p-4 border-b border-slate-800/80">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center justify-between">
          <span>Real-time Background Scraping Lifecycle</span>
          {stats.currentCity && (
            <span className="text-amber-400 font-mono lowercase">
              target: {stats.currentCity} {stats.currentCompany ? `-> ${stats.currentCompany}` : ''}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
          {/* Step 1 */}
          <div className={`p-2.5 rounded-lg border transition-all ${
            stats.currentStep === 'maps_search'
              ? 'bg-amber-500/10 border-amber-500/40 text-amber-300 shadow-sm shadow-amber-500/10'
              : 'bg-slate-900/60 border-slate-800 text-slate-400'
          }`}>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold mb-1">
              <MapPin className="w-3 h-3 text-amber-400" />
              1. Maps Query
            </div>
            <p className="text-[10px] text-slate-400 line-clamp-1">
              Search local businesses in {stats.currentCity || 'city'}
            </p>
          </div>

          {/* Step 2 */}
          <div className={`p-2.5 rounded-lg border transition-all ${
            stats.currentStep === 'place_details'
              ? 'bg-amber-500/10 border-amber-500/40 text-amber-300 shadow-sm shadow-amber-500/10'
              : 'bg-slate-900/60 border-slate-800 text-slate-400'
          }`}>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold mb-1">
              <Building className="w-3 h-3 text-sky-400" />
              2. Place Details
            </div>
            <p className="text-[10px] text-slate-400 line-clamp-1">
              Extract address, phone, official domain
            </p>
          </div>

          {/* Step 3 */}
          <div className={`p-2.5 rounded-lg border transition-all ${
            stats.currentStep === 'web_crawl'
              ? 'bg-amber-500/10 border-amber-500/40 text-amber-300 shadow-sm shadow-amber-500/10'
              : 'bg-slate-900/60 border-slate-800 text-slate-400'
          }`}>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold mb-1">
              <Globe className="w-3 h-3 text-emerald-400" />
              3. Web Navigation
            </div>
            <p className="text-[10px] text-slate-400 line-clamp-1">
              Scan /karriere, /jobs, /ausbildung
            </p>
          </div>

          {/* Step 4 */}
          <div className={`p-2.5 rounded-lg border transition-all ${
            stats.currentStep === 'email_extract'
              ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 shadow-sm shadow-emerald-500/10'
              : 'bg-slate-900/60 border-slate-800 text-slate-400'
          }`}>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold mb-1">
              <Mail className="w-3 h-3 text-emerald-400" />
              4. Career Email
            </div>
            <p className="text-[10px] text-slate-400 line-clamp-1">
              Regex match recruiter/HR contacts
            </p>
          </div>

          {/* Step 5 */}
          <div className={`p-2.5 rounded-lg border transition-all ${
            stats.currentStep === 'career_parse'
              ? 'bg-amber-500/10 border-amber-500/40 text-amber-300 shadow-sm shadow-amber-500/10'
              : 'bg-slate-900/60 border-slate-800 text-slate-400'
          }`}>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold mb-1">
              <ShieldCheck className="w-3 h-3 text-purple-400" />
              5. Openings Parse
            </div>
            <p className="text-[10px] text-slate-400 line-clamp-1">
              Classify Ausbildung / Full-time roles
            </p>
          </div>
        </div>
      </div>

      {/* Terminal Output Window */}
      <div className="h-80 overflow-y-auto p-4 font-mono text-xs bg-slate-950 text-slate-300 space-y-1.5 selection:bg-amber-500/30 selection:text-white">
        {filteredLogs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-2">
            <Terminal className="w-8 h-8 opacity-40" />
            <p>Crawler terminal ready. Click "Launch Google Maps Scraper" above to begin automated extraction.</p>
          </div>
        ) : (
          filteredLogs.map((log) => {
            const isEmail = log.step === 'email_extract';
            const isSuccess = log.level === 'success';
            const isWarn = log.level === 'warn';

            return (
              <div 
                key={log.id} 
                className={`py-0.5 leading-relaxed flex items-start gap-2.5 transition-colors hover:bg-slate-900/40 rounded px-1.5 ${
                  isEmail ? 'text-emerald-300 font-medium' : isWarn ? 'text-amber-300' : 'text-slate-300'
                }`}
              >
                <span className="text-[11px] text-slate-400 select-none shrink-0 font-normal">
                  {log.timestamp}
                </span>

                <span className={`text-[10px] uppercase font-bold px-1 rounded shrink-0 select-none ${
                  log.step === 'email_extract' 
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : log.step === 'maps_search'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : log.step === 'web_crawl'
                    ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                    : 'bg-slate-800 text-slate-400'
                }`}>
                  {log.step}
                </span>

                <span className="break-all flex-1">
                  {log.companyName && (
                    <span className="text-amber-200 font-semibold mr-1.5">
                      [{log.companyName}]
                    </span>
                  )}
                  {log.message}
                  {log.url && (
                    <a 
                      href={log.url} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="ml-2 text-sky-400 underline hover:text-sky-300 inline-flex items-center gap-0.5 text-[11px]"
                    >
                      {log.url.slice(0, 36)}...
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                  {log.dataSnippet && (
                    <span className="ml-2 text-[11px] text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 font-mono">
                      {log.dataSnippet}
                    </span>
                  )}
                </span>
              </div>
            );
          })
        )}
        <div ref={logsEndRef} />
      </div>

      {/* Live Discovered Preview Bar */}
      {latestCompany && (
        <div className="bg-slate-900 border-t border-slate-800 px-4 py-2.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Latest Extracted:</span>
            <span className="font-semibold text-white">{latestCompany.name}</span>
            <span className="text-slate-400">({latestCompany.city})</span>
            {latestCompany.careerEmail && (
              <span className="text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                {latestCompany.careerEmail}
              </span>
            )}
          </div>
          <div className="text-slate-400 text-[11px]">
            {latestCompany.openings.length} openings parsed
          </div>
        </div>
      )}

    </div>
  );
};
