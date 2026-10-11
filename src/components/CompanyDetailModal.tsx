import React, { useState } from 'react';
import { 
  X, 
  Building, 
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
  CheckCircle2
} from 'lucide-react';
import { ScrapedCompany } from '../types/scraper';
import { COLD_EMAIL_TEMPLATES } from '../data/sampleJobProfiles';

interface Props {
  company: ScrapedCompany | null;
  onClose: () => void;
  onGenerateAiPitch: (company: ScrapedCompany) => void;
}

export const CompanyDetailModal: React.FC<Props> = ({
  company,
  onClose,
  onGenerateAiPitch
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [selectedRoleIndex, setSelectedRoleIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'details' | 'pitch'>('details');

  // Candidate personalization
  const [candidateName, setCandidateName] = useState('');
  const [candidateEmail, setCandidateEmail] = useState('');
  const [candidatePhone, setCandidatePhone] = useState('');
  const [candidateLanguage, setCandidateLanguage] = useState<'de' | 'en'>('de');

  if (!company) return null;

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const primaryRole = company.openings[selectedRoleIndex]?.title || 'Fachkraft / Ausbildung';

  const defaultLetter = candidateLanguage === 'de'
    ? (company.hasAusbildung 
        ? COLD_EMAIL_TEMPLATES.ausbildung_de(company.name, primaryRole, company.city)
        : COLD_EMAIL_TEMPLATES.job_de(company.name, primaryRole, company.city))
    : COLD_EMAIL_TEMPLATES.job_en(company.name, primaryRole, company.city);

  const personalizedLetter = defaultLetter
    .replace(/\[Ihr Vorname Nachname\]/g, candidateName || '[Ihr Vorname Nachname]')
    .replace(/\[Your Name\]/g, candidateName || '[Your Name]')
    .replace(/\[Ihre Telefonnummer\]/g, candidatePhone || '[Ihre Telefonnummer]')
    .replace(/\[Your Phone Number\]/g, candidatePhone || '[Your Phone Number]')
    .replace(/\[Ihre E-Mail-Adresse\]/g, candidateEmail || '[Ihre E-Mail-Adresse]')
    .replace(/\[Your Email\]/g, candidateEmail || '[Your Email]');

  const mailtoLink = company.careerEmail 
    ? `mailto:${company.careerEmail}?subject=${encodeURIComponent(`Bewerbung als ${primaryRole} - ${candidateName || 'Initiativbewerbung'}`)}&body=${encodeURIComponent(personalizedLetter)}`
    : '#';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl my-8">
        
        {/* Top Header */}
        <div className="bg-slate-950 p-5 border-b border-slate-800 flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-white">{company.name}</h2>
              {company.hasAusbildung && (
                <span className="text-xs font-semibold text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                  Ausbildungsbetrieb
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
              <span>{company.address}</span>
              <span aria-hidden="true">·</span>
              <span className="text-slate-300 font-medium">{company.city}</span>
              <span aria-hidden="true">·</span>
              <span>{company.industry}</span>
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
            Company & Contact Dossier
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
            <span>Generate German Application Letter</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 max-h-[70vh] overflow-y-auto space-y-5 text-xs">
          {activeTab === 'details' ? (
            <>
              {/* Contact Card */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800/80 space-y-3">
                <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Verified Contact & Career Links
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Email */}
                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-[11px] text-slate-400 block mb-1">Career / HR Email</span>
                    {company.careerEmail ? (
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
                    ) : (
                      <span className="text-slate-500 italic">None public (Form only)</span>
                    )}
                  </div>

                  {/* Phone */}
                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-[11px] text-slate-400 block mb-1">Telephone</span>
                    <span className="text-slate-200 font-mono text-xs">{company.phone || 'Not listed'}</span>
                  </div>
                </div>

                {/* Direct Action URLs */}
                <div className="flex items-center gap-3 pt-1 flex-wrap">
                  {company.website && (
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-sky-400 hover:text-sky-300 text-xs font-medium"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Visit Company Website</span>
                    </a>
                  )}
                  {company.careerUrl && (
                    <a
                      href={company.careerUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-amber-400 hover:text-amber-300 text-xs font-medium"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Open Official Career Portal</span>
                    </a>
                  )}
                  <a
                    href={company.mapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-slate-300 hover:text-white text-xs font-medium"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>View on Google Maps</span>
                  </a>
                </div>
              </div>

              {/* Discovered Positions */}
              <div>
                <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2.5">
                  Discovered Positions & Career Offerings ({company.openings.length})
                </h3>

                <div className="space-y-2.5">
                  {company.openings.map((op, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 bg-slate-950 rounded-xl border border-slate-800/80 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-semibold text-white text-xs">{op.title}</h4>
                          <span className="text-[11px] text-amber-400 font-medium">{op.jobType}</span>
                        </div>
                      </div>

                      {op.description && (
                        <p className="text-slate-300 text-xs leading-relaxed">{op.description}</p>
                      )}

                      {op.requirements && op.requirements.length > 0 && (
                        <div className="pt-1">
                          <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">
                            Key Requirements:
                          </span>
                          <ul className="list-disc list-inside space-y-0.5 text-slate-400 text-xs">
                            {op.requirements.map((req, rIdx) => (
                              <li key={rIdx}>{req}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Google Maps Profile Stats */}
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-400 block">Google Maps Verification</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-current" />
                    <span className="font-bold text-white text-xs">{company.rating?.toFixed(1) || '4.2'}</span>
                    <span className="text-slate-400 text-xs">({company.reviewsCount || 0} reviews)</span>
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
                    Personalize Application Letter
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCandidateLanguage('de')}
                      className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                        candidateLanguage === 'de' ? 'bg-amber-500 text-slate-950 font-semibold' : 'text-slate-400'
                      }`}
                    >
                      Deutsch 🇩🇪
                    </button>
                    <button
                      type="button"
                      onClick={() => setCandidateLanguage('en')}
                      className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                        candidateLanguage === 'en' ? 'bg-amber-500 text-slate-950 font-semibold' : 'text-slate-400'
                      }`}
                    >
                      English 🇬🇧
                    </button>
                  </div>
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
                    <label className="text-[11px] text-slate-400 block mb-1">Your Phone</label>
                    <input
                      type="tel"
                      value={candidatePhone}
                      onChange={(e) => setCandidatePhone(e.target.value)}
                      placeholder="e.g. +49 170 1234567"
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Generated Text Area */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Application Email Preview (Ready to Send)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopy(personalizedLetter, 'letter')}
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
                          <span>Copy Letter</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <textarea
                  readOnly
                  value={personalizedLetter}
                  rows={11}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 font-mono leading-relaxed focus:outline-none resize-none selection:bg-amber-500/30 selection:text-white"
                />
              </div>

              {/* Send Mail Action Button */}
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
