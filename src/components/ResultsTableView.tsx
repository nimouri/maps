import React, { useState, useMemo } from 'react';
import { 
  Building, 
  MapPin, 
  Mail, 
  Phone, 
  ExternalLink, 
  Star, 
  Copy, 
  Check, 
  GraduationCap, 
  Send, 
  Eye, 
  Search, 
  SlidersHorizontal,
  FileText
} from 'lucide-react';
import { ScrapedCompany } from '../types/scraper';

interface Props {
  companies: ScrapedCompany[];
  onSelectCompany: (company: ScrapedCompany) => void;
  onGeneratePitch: (company: ScrapedCompany) => void;
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onSelectAll: (all: boolean) => void;
}

export const ResultsTableView: React.FC<Props> = ({
  companies,
  onSelectCompany,
  onGeneratePitch,
  selectedIds,
  onToggleSelect,
  onSelectAll
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEmailOnly, setFilterEmailOnly] = useState(false);
  const [filterAusbildungOnly, setFilterAusbildungOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'city' | 'name' | 'rating' | 'openings'>('city');
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  const handleCopyEmail = (email: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  const filteredCompanies = useMemo(() => {
    return companies
      .filter(c => {
        const matchesSearch = !searchQuery.trim() || 
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.industry.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.openings.some(o => o.title.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesEmail = !filterEmailOnly || !!c.careerEmail;
        const matchesAusbildung = !filterAusbildungOnly || c.hasAusbildung;

        return matchesSearch && matchesEmail && matchesAusbildung;
      })
      .sort((a, b) => {
        if (sortBy === 'city') return a.city.localeCompare(b.city);
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
        if (sortBy === 'openings') return b.openings.length - a.openings.length;
        return 0;
      });
  }, [companies, searchQuery, filterEmailOnly, filterAusbildungOnly, sortBy]);

  const allFilteredSelected = filteredCompanies.length > 0 && 
    filteredCompanies.every(c => selectedIds.includes(c.id));

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
      
      {/* Controls & Search Filter Bar */}
      <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search companies, cities, roles, keywords..."
              className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Filter toggles & sort */}
        <div className="flex items-center gap-3 text-xs flex-wrap">
          <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
            <input
              type="checkbox"
              checked={filterEmailOnly}
              onChange={(e) => setFilterEmailOnly(e.target.checked)}
              className="rounded border-slate-700 bg-slate-900 text-amber-500 text-xs"
            />
            <span>With Email Only</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
            <input
              type="checkbox"
              checked={filterAusbildungOnly}
              onChange={(e) => setFilterAusbildungOnly(e.target.checked)}
              className="rounded border-slate-700 bg-slate-900 text-amber-500 text-xs"
            />
            <span>Ausbildung Only</span>
          </label>

          <div className="flex items-center gap-1 text-slate-400">
            <span>Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            >
              <option value="city">City (A-Z)</option>
              <option value="name">Company Name</option>
              <option value="rating">Rating</option>
              <option value="openings">Most Openings</option>
            </select>
          </div>

          <span className="text-slate-400 font-mono text-[11px]">
            Showing {filteredCompanies.length} of {companies.length}
          </span>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase text-[11px] tracking-wider">
              <th className="py-3 px-4 w-10 text-center">
                <input
                  type="checkbox"
                  checked={allFilteredSelected}
                  onChange={(e) => onSelectAll(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-amber-500"
                />
              </th>
              <th className="py-3 px-4 font-semibold">Company & Location</th>
              <th className="py-3 px-4 font-semibold">Verified Career Email</th>
              <th className="py-3 px-4 font-semibold">Discovered Openings</th>
              <th className="py-3 px-4 font-semibold">Maps Rating</th>
              <th className="py-3 px-4 text-right font-semibold">Outreach & Dossier</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredCompanies.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-500">
                  <Building className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-medium">No company records match your current filter.</p>
                  <p className="text-xs text-slate-400 mt-1">Adjust your filters or run the crawler to discover new employers.</p>
                </td>
              </tr>
            ) : (
              filteredCompanies.map((company) => {
                const isSelected = selectedIds.includes(company.id);

                return (
                  <tr 
                    key={company.id}
                    onClick={() => onSelectCompany(company)}
                    className={`transition-colors hover:bg-slate-800/40 cursor-pointer ${
                      isSelected ? 'bg-amber-500/5' : ''
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSelect(company.id)}
                        className="rounded border-slate-700 bg-slate-900 text-amber-500"
                      />
                    </td>

                    {/* Company & Location Info */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white text-sm hover:text-amber-400 transition-colors">
                            {company.name}
                          </span>
                          {company.hasAusbildung && (
                            <span className="text-[10px] font-semibold text-amber-300 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">
                              Ausbildungsbetrieb
                            </span>
                          )}
                        </div>

                        {/* Unboxed clean metadata (zero-pill rule) */}
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                          <span className="text-slate-200 font-medium">{company.city}</span>
                          <span aria-hidden="true">·</span>
                          <span>{company.address}</span>
                          <span aria-hidden="true">·</span>
                          <span className="text-slate-400">{company.industry}</span>
                        </div>

                        <div className="flex items-center gap-3 text-[11px] pt-0.5">
                          {company.website && (
                            <a
                              href={company.website}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-sky-400 hover:text-sky-300 flex items-center gap-1"
                            >
                              <span>Website</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                          {company.careerUrl && company.careerUrl !== company.website && (
                            <a
                              href={company.careerUrl}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-amber-400 hover:text-amber-300 flex items-center gap-1"
                            >
                              <span>Karriereportal</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                          <a
                            href={company.mapsUrl}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-slate-400 hover:text-slate-200 flex items-center gap-1"
                          >
                            <span>Google Maps</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </div>
                      </div>
                    </td>

                    {/* Verified Career Email */}
                    <td className="py-3.5 px-4">
                      {company.careerEmail ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-emerald-300 text-xs font-medium">
                              {company.careerEmail}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => handleCopyEmail(company.careerEmail!, e)}
                              className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                              title="Copy email to clipboard"
                            >
                              {copiedEmail === company.careerEmail ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                          {company.phone && (
                            <div className="flex items-center gap-1 text-[11px] text-slate-400">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{company.phone}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-slate-400 italic text-[11px]">
                          Contact form on career portal
                        </div>
                      )}
                    </td>

                    {/* Discovered Openings */}
                    <td className="py-3.5 px-4 max-w-xs">
                      {company.openings.length > 0 ? (
                        <div className="space-y-1">
                          <div className="font-medium text-slate-200 line-clamp-1">
                            {company.openings[0].title}
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                            <span className="text-amber-400 font-medium">{company.openings[0].jobType}</span>
                            {company.openings.length > 1 && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span>+{company.openings.length - 1} more role{company.openings.length > 2 ? 's' : ''}</span>
                              </>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Unsolicited (Initiativ)</span>
                      )}
                    </td>

                    {/* Google Maps Rating */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {company.rating ? (
                        <div className="flex items-center gap-1.5">
                          <div className="flex items-center text-amber-400">
                            <Star className="w-3.5 h-3.5 fill-current" />
                            <span className="ml-1 font-bold text-white text-xs">{company.rating.toFixed(1)}</span>
                          </div>
                          <span className="text-slate-400 text-[11px]">({company.reviewsCount || 0})</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">-</span>
                      )}
                    </td>

                    {/* Outreach Actions */}
                    <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => onGeneratePitch(company)}
                          className="px-2.5 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 font-medium text-xs rounded-md border border-amber-500/30 transition-colors flex items-center gap-1"
                          title="Generate German Application / Initiativbewerbung"
                        >
                          <Send className="w-3 h-3" />
                          <span>Bewerbung</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onSelectCompany(company)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md border border-slate-700 transition-colors"
                          title="View Full Company Profile Dossier"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
};
