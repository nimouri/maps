import React, { useState } from 'react';
import { 
  X, 
  Building2, 
  MapPin, 
  Mail, 
  Phone, 
  ExternalLink, 
  Star, 
  Send, 
  Copy, 
  Check, 
  GraduationCap, 
  FileText, 
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  Search
} from 'lucide-react';
import { ScrapedCompany } from '../types/scraper';

interface Props {
  company: ScrapedCompany | null;
  onClose: () => void;
  onScanEmail: (company: ScrapedCompany) => void;
  onVerifyJobs: (company: ScrapedCompany) => void;
  isScanningEmail: boolean;
  isVerifyingJobs: boolean;
}

export const CompanyDetailModal: React.FC<Props> = ({
  company,
  onClose,
  onScanEmail,
  onVerifyJobs,
  isScanningEmail,
  isVerifyingJobs
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'pitch'>('details');

  // Candidate personalization
  const [candidateName, setCandidateName] = useState('');
  const [candidateEmail, setCandidateEmail] = useState('');
  const [candidatePhone, setCandidatePhone] = useState('');
  const [targetRole, setTargetRole] = useState('');

  if (!company) return null;

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const isConfirmed = company.ausbildungStatus === 'confirmed_listing';
  const roleTitle = targetRole || (company.confirmedListings[0]?.title) || 'Fachkraft / Ausbildung';

  const defaultLetter = `Sehr geehrte Damen und Herren,
liebes Recruiting-Team von ${company.name},

mit großem Interesse verfolge ich die Aktivitäten Ihres Unternehmens am Standort ${company.city}.

${isConfirmed
  ? `Hiermit bewerbe ich mich bei Ihnen mit großem Engagement für die Position als „${roleTitle}“.`
  : `Hiermit bewerbe ich mich bei Ihnen initiativ für eine Position bzw. einen Ausbildungsplatz im Bereich „${roleTitle}“. Da ich Ihr Unternehmen als attraktiven Arbeitgeber in unserer Region schätze, möchte ich mich Ihnen gerne proaktiv vorstellen.`}

Ich zeichne mich durch Zuverlässigkeit, strukturierte Arbeitsweise und hohe Lernbereitschaft aus. Gerne möchte ich Ihr Team tatkräftig unterstützen.

Meine vollständigen Bewerbungsunterlagen habe ich dieser Nachricht beigefügt. Über die Gelegenheit eines persönlichen Vorstellungsgesprächs oder Probearbeitstages freue ich mich sehr.

Mit freundlichen Grüßen,
${candidateName || '[Ihr Vorname Nachname]'}
${candidatePhone || '[Ihre Telefonnummer]'}
${candidateEmail || '[Ihre E-Mail-Adresse]'}`;

  const mailtoLink = company.careerEmail 
    ? `mailto:${company.careerEmail}?subject=${encodeURIComponent(`${isConfirmed ? 'Bewerbung' : 'Initiativbewerbung'}: ${roleTitle} - ${candidateName || 'Bewerber'}`)}&body=${encodeURIComponent(defaultLetter)}`
    : '#';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl my-8">
        
        {/* Top Header */}
        <div className="bg-slate-950 p-5 border-b border-slate-800 flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-white">{company.name}</h2>
              {isConfirmed ? (
                <span className="text-xs font-semibold text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-amber-400" />
                  Ausbildung Confirmed
                </span>
              ) : (
                <span className="text-xs font-medium text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                  Ausbildung: Not verified
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
              <span>{company.address}</span>
              <span aria-hidden="true">·</span>
              <span className="text-slate-300 font-medium">{company.city}</span>
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              Provider Place ID: {company.placeId}
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

        {/* Tab Controls */}
        <div className="bg-slate-950/60 px-5 border-b border-slate-800 flex gap-4 text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === 'details'
                ? 'border-amber-400 text-amber-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Verified Place Dossier
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pitch')}
            className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 ${
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
                    <span className="text-[11px] text-slate-400 block mb-1">Telephone (Google Places)</span>
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

              {/* Ausbildung & Career Verification Audit Trail */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Ausbildung Verification Audit
                  </h3>
                  {company.website && (
                    <button
                      type="button"
                      disabled={isVerifyingJobs}
                      onClick={() => onVerifyJobs(company)}
                      className="text-xs text-amber-400 hover:text-amber-300 underline disabled:opacity-50"
                    >
                      {isVerifyingJobs ? 'Verifying career portal...' : 'Inspect career page for listings'}
                    </button>
                  )}
                </div>

                {company.ausbildungStatus === 'confirmed_listing' && company.confirmedListings.length > 0 ? (
                  <div className="space-y-2">
                    {company.confirmedListings.map((listing, idx) => (
                      <div key={idx} className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-semibold text-white text-xs">{listing.title}</span>
                          <span className="text-[10px] text-amber-400 font-medium">{listing.jobType}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2">
                          <a 
                            href={listing.sourceUrl} 
                            target="_blank" 
                            rel="noreferrer"
                            className="text-sky-400 hover:underline flex items-center gap-1"
                          >
                            <span>Attributable Source</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                          {listing.deadline && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>Frist: {listing.deadline}</span>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800 text-slate-400 text-xs space-y-1">
                    <p className="font-medium text-slate-300">
                      Status: {company.ausbildungStatus === 'unverified' ? 'Not verified' : 'Not yet checked'}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Company is a registered Google Maps entity. A Google Maps listing alone is not evidence of active Ausbildung offerings without an attributable career vacancy.
                    </p>
                  </div>
                )}
              </div>

              {/* Google Maps Profile Stats */}
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-400 block">Google Maps Rating</span>
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
                    {isConfirmed ? 'Application for confirmed listing' : 'Initiativbewerbung (proactive)'}
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
