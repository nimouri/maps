import React, { useState } from 'react';
import { 
  X, 
  MapPin, 
  Globe, 
  Phone, 
  Mail, 
  ExternalLink, 
  Star, 
  Check, 
  Copy, 
  Send,
  Building2,
  ShieldCheck,
  Search
} from 'lucide-react';
import { ScrapedCompany } from '../types/scraper';

interface Props {
  company: ScrapedCompany | null;
  onClose: () => void;
  onScanEmail: (company: ScrapedCompany) => void;
  isScanningEmail: boolean;
}

export const CompanyDetailModal: React.FC<Props> = ({
  company,
  onClose,
  onScanEmail,
  isScanningEmail
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'pitch'>('details');

  // Candidate personalization
  const [candidateName, setCandidateName] = useState('');
  const [candidateEmail, setCandidateEmail] = useState('');
  const [candidatePhone, setCandidatePhone] = useState('');
  const [targetRole, setTargetRole] = useState('');

  if (!company) return null;

  const isOsm = company.providerAttribution?.toLowerCase().includes('openstreetmap') || company.providerAttribution?.toLowerCase().includes('osm');
  const sourceLabel = isOsm ? 'OpenStreetMap — not Google' : 'Google Maps (extension)';

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const roleTitle = targetRole || 'Fachkraft / Ausbildung';

  const defaultLetter = `Sehr geehrte Damen und Herren,
liebes Recruiting-Team von ${company.name},

mit großem Interesse verfolge ich die Aktivitäten Ihres Unternehmens am Standort ${company.city}.

Hiermit bewerbe ich mich bei Ihnen initiativ für eine Position bzw. einen Ausbildungsplatz im Bereich „${roleTitle}“. Da ich Ihr Unternehmen als attraktiven Arbeitgeber in unserer Region schätze, möchte ich mich Ihnen gerne proaktiv vorstellen.

Ich zeichne mich durch Zuverlässigkeit, strukturierte Arbeitsweise und hohe Lernbereitschaft aus. Gerne möchte ich Ihr Team tatkräftig unterstützen.

Meine vollständigen Unterlagen lasse ich Ihnen auf Anfrage sehr gerne zukommen. Über eine Einladung zu einem persönlichen Gespräch oder einem Probearbeitstag freue ich mich sehr.

Mit freundlichen Grüßen,
${candidateName || '[Ihr Vorname Nachname]'}
${candidatePhone || '[Ihre Telefonnummer]'}
${candidateEmail || '[Ihre E-Mail-Adresse]'}`;

  const mailtoLink = company.careerEmail
    ? `mailto:${company.careerEmail}?subject=${encodeURIComponent(`Initiativbewerbung: ${roleTitle} - ${candidateName || '[Name]'}`)}&body=${encodeURIComponent(defaultLetter)}`
    : '#';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 bg-slate-950 border-b border-slate-800 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-amber-400" />
              <h2 className="text-lg font-bold text-white leading-tight">
                {company.name}
              </h2>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
              <span>{company.address || '—'}</span>
              <span aria-hidden="true">·</span>
              <span>{company.city}, {company.country}</span>
              <span aria-hidden="true">·</span>
              <span className={`inline-flex items-center gap-1 font-semibold ${isOsm ? 'text-emerald-400' : 'text-sky-400'}`}>
                <Globe className="w-3 h-3" />
                {sourceLabel}
              </span>
            </div>
            <div className="flex items-center gap-2 pt-1 font-mono text-[10px] text-slate-500">
              <span>Place ID: {company.placeId}</span>
              {typeof company.lat === 'number' && typeof company.lng === 'number' && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>Coords: {company.lat.toFixed(4)}, {company.lng.toFixed(4)}</span>
                </>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-5 border-b border-slate-800 bg-slate-950/50 flex gap-4 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`py-2.5 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'details'
                ? 'border-amber-400 text-amber-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Verified Dossier</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pitch')}
            className={`py-2.5 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'pitch'
                ? 'border-amber-400 text-amber-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Generate Application Letter</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 max-h-[70vh] overflow-y-auto space-y-5 text-xs">
          {activeTab === 'details' ? (
            <>
              {/* Contact Card */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Contact & Email Status
                  </h3>
                  {company.website && (
                    <button
                      type="button"
                      disabled={isScanningEmail}
                      onClick={() => onScanEmail(company)}
                      className="text-xs text-sky-400 hover:text-sky-300 underline disabled:opacity-50"
                    >
                      {isScanningEmail ? 'Scanning public pages...' : 'Re-scan official site for emails'}
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Email */}
                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-[11px] text-slate-400 block mb-1">Extracted Email</span>
                    {company.careerEmail ? (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-emerald-400 font-medium text-xs break-all">
                            {company.careerEmail}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(company.careerEmail!, 'email')}
                            className="p-1 text-slate-400 hover:text-white"
                            title="Copy email"
                          >
                            {copiedField === 'email' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                        {company.emailSourceUrl && (
                          <div className="text-[10px] text-slate-500 truncate" title={company.emailSourceUrl}>
                            Source: {company.emailSourceUrl}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-500 italic">
                        {company.emailStatus === 'no_email_found' ? 'None public on website' : 'Not verified'}
                      </span>
                    )}
                  </div>

                  {/* Phone */}
                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-[11px] text-slate-400 block mb-1">Telephone</span>
                    <span className="text-slate-200 font-mono text-xs">{company.phone || 'Not verified'}</span>
                  </div>
                </div>

                {/* Direct Action URLs */}
                <div className="flex items-center gap-3 pt-1 flex-wrap">
                  {company.website ? (
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-sky-400 hover:text-sky-300 text-xs font-medium"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Visit Company Website</span>
                    </a>
                  ) : (
                    <span className="text-slate-500 text-xs">Website: Not verified</span>
                  )}

                  <a
                    href={company.mapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-amber-400 hover:text-amber-300 text-xs font-medium"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>View on Google Maps</span>
                  </a>
                </div>
              </div>

              {/* Data Provenance & Source Label */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800/80 space-y-2">
                <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Data Source & Provenance
                </h3>
                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 text-slate-300 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Provider Source:</span>
                    <span className={`font-semibold ${isOsm ? 'text-emerald-400' : 'text-sky-400'}`}>
                      {sourceLabel}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Place Identifier:</span>
                    <span className="font-mono text-[11px] text-slate-300 truncate max-w-xs">{company.placeId}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Discovery Timestamp:</span>
                    <span className="text-slate-400">{new Date(company.discoveredAt).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Google Maps Profile Stats */}
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-400 block">Rating</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {typeof company.rating === 'number' ? (
                      <>
                        <Star className="w-3.5 h-3.5 text-amber-400 fill-current" />
                        <span className="font-bold text-white text-xs">{company.rating.toFixed(1)}</span>
                        <span className="text-slate-400 text-xs">({company.reviewsCount ?? 0} reviews)</span>
                      </>
                    ) : (
                      <span className="text-slate-500 text-xs">No rating available</span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('pitch')}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Draft Application</span>
                </button>
              </div>
            </>
          ) : (
            /* Application Pitch / Cover Letter Tab */
            <div className="space-y-4">
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Personalize Application
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    Initiativbewerbung (proactive)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Your Full Name</label>
                    <input
                      type="text"
                      value={candidateName}
                      onChange={(e) => setCandidateName(e.target.value)}
                      placeholder="e.g. Max Mustermann"
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Your Email</label>
                    <input
                      type="email"
                      value={candidateEmail}
                      onChange={(e) => setCandidateEmail(e.target.value)}
                      placeholder="e.g. max@example.de"
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Target Role</label>
                    <input
                      type="text"
                      value={targetRole}
                      onChange={(e) => setTargetRole(e.target.value)}
                      placeholder={roleTitle}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Text Area */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Application Draft (Truthful & Attributable)
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(defaultLetter, 'letter')}
                    className="text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1"
                  >
                    {copiedField === 'letter' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Draft</span>
                      </>
                    )}
                  </button>
                </div>

                <textarea
                  readOnly
                  value={defaultLetter}
                  rows={11}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 font-mono leading-relaxed focus:outline-none resize-none selection:bg-amber-500/30 selection:text-white"
                />
              </div>

              {/* Send Action */}
              {company.careerEmail && (
                <div className="flex justify-end gap-2 pt-2">
                  <a
                    href={mailtoLink}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-colors inline-flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Open in Email App ({company.careerEmail})</span>
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
