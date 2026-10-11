import React, { useState } from 'react';
import { X, Chrome, Download, CheckCircle, ExternalLink, ShieldCheck, Terminal, AlertTriangle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  isExtensionDetected: boolean;
}

export const ExtensionSetupModal: React.FC<Props> = ({
  isOpen,
  onClose,
  isExtensionDetected
}) => {
  const [copiedPath, setCopiedPath] = useState(false);

  if (!isOpen) return null;

  const handleCopyPath = () => {
    navigator.clipboard.writeText('public/extension');
    setCopiedPath(true);
    setTimeout(() => setCopiedPath(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl my-8">
        
        {/* Header */}
        <div className="bg-slate-950 p-5 border-b border-slate-800 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Chrome className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">Live Google Maps Chrome Bridge</h2>
                {isExtensionDetected ? (
                  <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20">
                    Connected ✓
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                    Not Installed
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Live Google Maps scraping directly in your browser without any paid API keys or billing
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          
          {/* Status banner */}
          {isExtensionDetected ? (
            <div className="p-3.5 bg-emerald-950/30 border border-emerald-500/30 rounded-xl flex items-center gap-3 text-emerald-300">
              <CheckCircle className="w-5 h-5 shrink-0 text-emerald-400" />
              <div>
                <span className="font-semibold block">Extension Active & Paired</span>
                <span className="text-[11px] text-emerald-400/80">
                  Searches will execute live Google Maps feed scraping in your browser.
                </span>
              </div>
            </div>
          ) : (
            <div className="p-3.5 bg-amber-950/20 border border-amber-500/30 rounded-xl flex items-center gap-3 text-amber-300">
              <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400" />
              <div>
                <span className="font-semibold block">Using Free OpenStreetMap Fallback</span>
                <span className="text-[11px] text-amber-400/80">
                  Install this free 30-second extension to scrape live Google Maps without any API keys.
                </span>
              </div>
            </div>
          )}

          {/* Setup steps */}
          <div className="space-y-3">
            <h3 className="font-semibold text-slate-200 uppercase tracking-wider text-[11px]">
              How to Load in Google Chrome (30 Seconds)
            </h3>

            <div className="space-y-2.5 text-slate-300">
              <div className="flex items-start gap-2.5 p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                <span className="font-bold text-amber-400 text-xs w-5">1.</span>
                <div>
                  <span>Open a new tab in Chrome and enter: </span>
                  <code className="text-amber-300 bg-slate-900 px-1.5 py-0.5 rounded font-mono select-all">
                    chrome://extensions
                  </code>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                <span className="font-bold text-amber-400 text-xs w-5">2.</span>
                <div>
                  <span>Turn ON </span>
                  <strong className="text-white font-semibold">"Developer mode"</strong>
                  <span> using the toggle switch in the top-right corner.</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                <span className="font-bold text-amber-400 text-xs w-5">3.</span>
                <div>
                  <span>Click </span>
                  <strong className="text-white font-semibold">"Load unpacked"</strong>
                  <span> in the top-left corner, and select the folder:</span>
                  <div className="mt-1 flex items-center gap-2">
                    <code className="text-emerald-400 bg-slate-900 px-2 py-1 rounded font-mono text-[11px]">
                      public/extension
                    </code>
                    <button
                      type="button"
                      onClick={handleCopyPath}
                      className="text-[10px] text-slate-400 hover:text-white underline"
                    >
                      {copiedPath ? 'Copied!' : 'Copy path'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                <span className="font-bold text-amber-400 text-xs w-5">4.</span>
                <div>
                  <span>Done! Reload this MapCareer page and it will immediately detect the bridge.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Technical Disclosure */}
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-slate-400 text-[11px] space-y-1">
            <span className="font-semibold text-slate-300 block">How Live Feed Scraping Works</span>
            <p>
              The extension opens a Google Maps search tab, auto-scrolls the feed container (<code className="text-slate-300">div[role="feed"]</code>), extracts genuine business cards, handles cookie prompts, parses coordinates from the place URL, and returns the data directly to your dashboard.
            </p>
          </div>

        </div>

      </div>
    </div>
  );
};
