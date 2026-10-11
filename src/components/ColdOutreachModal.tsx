import React, { useState } from 'react';
import { 
  X, 
  Mail, 
  Copy, 
  Check, 
  Download, 
  FileSpreadsheet, 
  CheckCircle2, 
  FileJson,
  Send,
  Building2,
  ShieldCheck
} from 'lucide-react';
import { ScrapedCompany } from '../types/scraper';

interface Props {
  companies: ScrapedCompany[];
  onClose: () => void;
  onExportCsv: () => void;
  onExportJson: () => void;
}

export const ColdOutreachModal: React.FC<Props> = ({
  companies,
  onClose,
  onExportCsv,
  onExportJson
}) => {
  const [format, setFormat] = useState<'comma' | 'lines' | 'bcc'>('comma');
  const [copied, setCopied] = useState(false);

  // Extract all genuinely discovered emails
  const verifiedCompaniesWithEmail = companies.filter(c => Boolean(c.careerEmail));
  const validEmails = Array.from(new Set(
    verifiedCompaniesWithEmail.map(c => c.careerEmail!).filter(e => e.includes('@'))
  ));

  const formattedEmails = format === 'comma'
    ? validEmails.join(', ')
    : format === 'lines'
    ? validEmails.join('\n')
    : `BCC: ${validEmails.join(', ')}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(formattedEmails);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl my-8">
        
        {/* Header */}
        <div className="bg-slate-950 p-5 border-b border-slate-800 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Discovered Contacts & Verified Export</h2>
              <p className="text-xs text-slate-400">
                {validEmails.length} public email addresses retrieved directly from company websites
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
          
          {/* Format selector */}
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
              Email Output Format
            </label>
            <div className="flex bg-slate-950 rounded-lg p-0.5 border border-slate-800 text-[11px]">
              <button
                type="button"
                onClick={() => setFormat('comma')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  format === 'comma' ? 'bg-slate-800 text-white font-medium' : 'text-slate-400'
                }`}
              >
                Comma separated
              </button>
              <button
                type="button"
                onClick={() => setFormat('lines')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  format === 'lines' ? 'bg-slate-800 text-white font-medium' : 'text-slate-400'
                }`}
              >
                One per line
              </button>
              <button
                type="button"
                onClick={() => setFormat('bcc')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  format === 'bcc' ? 'bg-slate-800 text-white font-medium' : 'text-slate-400'
                }`}
              >
                BCC Header
              </button>
            </div>
          </div>

          {/* Text Area */}
          <div className="relative">
            <textarea
              readOnly
              value={formattedEmails}
              rows={7}
              placeholder="No public emails retrieved yet. Execute discovery and enable website scanning."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-xs text-emerald-300 leading-relaxed focus:outline-none resize-none selection:bg-emerald-500/30 selection:text-white"
            />
          </div>

          {/* Copy Button */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-slate-400">
              Extracted only from public website HTML (never synthesized)
            </span>
            <button
              type="button"
              onClick={handleCopy}
              disabled={validEmails.length === 0}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Emails Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Discovered ({validEmails.length})</span>
                </>
              )}
            </button>
          </div>

          {/* Bulk File Export */}
          <div className="pt-4 border-t border-slate-800">
            <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block mb-2.5">
              Verified Records Export (Includes Place IDs & Source URLs)
            </label>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={onExportCsv}
                disabled={companies.length === 0}
                className="p-3 bg-slate-950 hover:bg-slate-800 disabled:opacity-40 rounded-xl border border-slate-800 text-left transition-colors flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-white text-xs">Spreadsheet (CSV)</div>
                  <div className="text-[10px] text-slate-400">Full audit trail & Place IDs</div>
                </div>
              </button>

              <button
                type="button"
                onClick={onExportJson}
                disabled={companies.length === 0}
                className="p-3 bg-slate-950 hover:bg-slate-800 disabled:opacity-40 rounded-xl border border-slate-800 text-left transition-colors flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center">
                  <FileJson className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-white text-xs">Raw Records (JSON)</div>
                  <div className="text-[10px] text-slate-400">Complete structured schema</div>
                </div>
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
