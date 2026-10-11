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
  ShieldCheck,
  Building2,
  FileCheck2
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
  const [filterLevel, setFilterLevel] = useState<'all' | 'errors' | 'contacts'>('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const filteredLogs = logs.filter(log => {
    if (filterLevel === 'errors') return log.level === 'error' || log.level === 'warn';
    if (filterLevel === 'contacts') return log.step === 'contact_discovery';
    return true;
  });

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
            places_api_pipeline.ts
          </span>
          {stats.isRunning && (
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              {stats.isPaused ? 'PAUSED' : 'PROCESSING API QUEUE'}
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
              onClick={() => setFilterLevel('contacts')}
              className={`px-2 py-1 rounded transition-colors ${filterLevel === 'contacts' ? 'bg-slate-800 text-emerald-300' : 'text-slate-400'}`}
            >
              Contacts ({stats.emailsDiscovered})
            </button>
            <button
              onClick={() => setFilterLevel('errors')}
              className={`px-2 py-1 rounded transition-colors ${filterLevel === 'errors' ? 'bg-slate-800 text-amber-300' : 'text-slate-400'}`}
            >
              Errors / Warns
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

      {/* Real Pipeline Stages */}
      <div className="bg-slate-950/60 p-4 border-b border-slate-800/80">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center justify-between">
          <span>Actual API Discovery Lifecycle</span>
          {stats.currentCity && (
            <span className="text-amber-400 font-mono lowercase">
              active: {stats.currentCity} {stats.currentCompany ? `→ ${stats.currentCompany}` : ''}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
          {/* Step 1 */}
          <div className={`p-2.5 rounded-lg border transition-all ${
            stats.currentStep === 'places_search'
              ? 'bg-amber-500/10 border-amber-500/40 text-amber-300 shadow-sm shadow-amber-500/10'
              : 'bg-slate-900/60 border-slate-800 text-slate-400'
          }`}>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold mb-1">
              <Building2 className="w-3 h-3 text-amber-400" />
              1. Places API Text Search
            </div>
            <p className="text-[10px] text-slate-400">
              Query Google Places (New) endpoint with field mask
            </p>
          </div>

          {/* Step 2 */}
          <div className={`p-2.5 rounded-lg border transition-all ${
            stats.currentStep === 'place_details'
              ? 'bg-amber-500/10 border-amber-500/40 text-amber-300 shadow-sm shadow-amber-500/10'
              : 'bg-slate-900/60 border-slate-800 text-slate-400'
          }`}>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold mb-1">
              <MapPin className="w-3 h-3 text-sky-400" />
              2. Place ID & Attribution
            </div>
            <p className="text-[10px] text-slate-400">
              Resolve provider Place ID, coordinates, Google Maps URI
            </p>
          </div>

          {/* Step 3 */}
          <div className={`p-2.5 rounded-lg border transition-all ${
            stats.currentStep === 'contact_discovery'
              ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 shadow-sm shadow-emerald-500/10'
              : 'bg-slate-900/60 border-slate-800 text-slate-400'
          }`}>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold mb-1">
              <Mail className="w-3 h-3 text-emerald-400" />
              3. Website Contact Scan
            </div>
            <p className="text-[10px] text-slate-400">
              Probe official website pages (/impressum, /kontakt)
            </p>
          </div>
        </div>
      </div>

      {/* Terminal Output Window */}
      <div className="h-80 overflow-y-auto p-4 font-mono text-xs bg-slate-950 text-slate-300 space-y-1.5 selection:bg-amber-500/30 selection:text-white">
        {filteredLogs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-2">
            <Terminal className="w-8 h-8 opacity-40" />
            <p>API pipeline terminal idle. Click "Execute Places Text Search" to query official Google Places endpoints.</p>
          </div>
        ) : (
          filteredLogs.map((log) => {
            const isContact = log.step === 'contact_discovery';
            const isError = log.level === 'error';
            const isWarn = log.level === 'warn';

            return (
              <div 
                key={log.id} 
                className={`py-0.5 leading-relaxed flex items-start gap-2.5 transition-colors hover:bg-slate-900/40 rounded px-1.5 ${
                  isError ? 'text-rose-300 bg-rose-950/20' : isContact ? 'text-emerald-300' : isWarn ? 'text-amber-300' : 'text-slate-300'
                }`}
              >
                <span className="text-[11px] text-slate-500 select-none shrink-0 font-normal">
                  {log.timestamp}
                </span>

                <span className={`text-[10px] uppercase font-bold px-1 rounded shrink-0 select-none ${
                  log.level === 'error'
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : log.step === 'contact_discovery'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : log.step === 'places_search'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
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
                      {log.url.length > 40 ? `${log.url.slice(0, 40)}...` : log.url}
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

      {/* Attribution Footer */}
      <div className="bg-slate-950 border-t border-slate-800 px-4 py-2 flex items-center justify-between text-[11px] text-slate-400">
        <div>
          Data Provider: <strong className="text-slate-300">Google Maps Platform</strong> (Places API New)
        </div>
        <div className="font-mono text-slate-500">
          solution_id: gmp_git_agentskills_v1
        </div>
      </div>

    </div>
  );
};
