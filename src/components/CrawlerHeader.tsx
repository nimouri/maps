import React from 'react';
import { 
  Compass, 
  Play, 
  Pause, 
  RotateCcw, 
  Download, 
  Mail, 
  Layers, 
  MapPin, 
  CheckCircle2, 
  Search,
  Sparkles
} from 'lucide-react';
import { CrawlerStats } from '../types/scraper';

interface Props {
  stats: CrawlerStats;
  onStartCrawl: () => void;
  onPauseCrawl: () => void;
  onResumeCrawl: () => void;
  onResetCrawl: () => void;
  onOpenOutreachModal: () => void;
  onExportCsv: () => void;
  activeView: 'table' | 'map' | 'crawler';
  setActiveView: (view: 'table' | 'map' | 'crawler') => void;
  totalCompanies: number;
}

export const CrawlerHeader: React.FC<Props> = ({
  stats,
  onStartCrawl,
  onPauseCrawl,
  onResumeCrawl,
  onResetCrawl,
  onOpenOutreachModal,
  onExportCsv,
  activeView,
  setActiveView,
  totalCompanies
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/95 backdrop-blur sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between py-3.5 gap-4">
          
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-500/20 text-slate-950 font-bold">
              <Compass className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-white tracking-tight">MapCareer Scraper</h1>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                  DACH Crawler
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Automated Google Maps, Career & Email Extractor for Jobs & Ausbildung
              </p>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex items-center gap-4 text-xs text-slate-300 bg-slate-950/60 px-3.5 py-1.5 rounded-lg border border-slate-800/80">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Companies:</span>
              <span className="font-semibold text-white">{totalCompanies}</span>
            </div>
            <span className="text-slate-700" aria-hidden="true">|</span>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Verified Emails:</span>
              <span className="font-semibold text-emerald-400">{stats.careerEmailsFound}</span>
            </div>
            <span className="text-slate-700" aria-hidden="true">|</span>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Ausbildung:</span>
              <span className="font-semibold text-amber-300">{stats.ausbildungFound}</span>
            </div>
            <span className="text-slate-700" aria-hidden="true">|</span>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Progress:</span>
              <span className="font-semibold text-sky-400">
                {stats.totalCitiesQueued > 0 
                  ? `${Math.round((stats.citiesCompleted / stats.totalCitiesQueued) * 100)}%`
                  : 'Ready'}
              </span>
            </div>
          </div>

          {/* Navigation Tabs & Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* View Switcher */}
            <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setActiveView('table')}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                  activeView === 'table'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Companies Table ({totalCompanies})
              </button>
              <button
                type="button"
                onClick={() => setActiveView('map')}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                  activeView === 'map'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Interactive Map
              </button>
              <button
                type="button"
                onClick={() => setActiveView('crawler')}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
                  activeView === 'crawler'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {stats.isRunning && (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                )}
                Crawler Console
              </button>
            </div>

            {/* Run / Pause Controls */}
            {!stats.isRunning ? (
              <button
                type="button"
                onClick={onStartCrawl}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs rounded-lg shadow-sm transition-all active:scale-95"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Start Crawler
              </button>
            ) : stats.isPaused ? (
              <button
                type="button"
                onClick={onResumeCrawl}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs rounded-lg shadow-sm transition-all"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Resume
              </button>
            ) : (
              <button
                type="button"
                onClick={onPauseCrawl}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 font-semibold text-xs rounded-lg border border-slate-700 transition-all"
              >
                <Pause className="w-3.5 h-3.5" />
                Pause
              </button>
            )}

            {/* Outreach / Cold Email Modal */}
            <button
              type="button"
              onClick={onOpenOutreachModal}
              disabled={totalCompanies === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition-colors"
              title="Copy verified emails or generate German applications"
            >
              <Mail className="w-3.5 h-3.5 text-emerald-400" />
              Email Outreach ({stats.careerEmailsFound})
            </button>

            {/* Export CSV */}
            <button
              type="button"
              onClick={onExportCsv}
              disabled={totalCompanies === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition-colors"
              title="Export results to CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              Export
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
