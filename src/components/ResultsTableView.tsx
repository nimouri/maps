import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  MapPin, 
  Phone, 
  ExternalLink, 
  Star, 
  Copy, 
  Check, 
  Send, 
  Eye, 
  Search, 
  Globe
} from 'lucide-react';
import { ScrapedCompany } from '../types/scraper';

interface Props {
  companies: ScrapedCompany[];
  onSelectCompany: (company: ScrapedCompany) => void;
  onGeneratePitch: (company: ScrapedCompany) => void;
  onScanEmail: (company: ScrapedCompany) => void;
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onSelectAll: (all: boolean) => void;
  scanningIds: string[];
}

export const ResultsTableView: React.FC<Props> = ({
  companies,
  onSelectCompany,
  onGeneratePitch,
  onScanEmail,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  scanningIds
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterWebsiteOnly, setFilterWebsiteOnly] = useState(false);
  const [filterEmailOnly, setFilterEmailOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'city' | 'name' | 'rating' | 'email'>('city');
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
          (c.address && c.address.toLowerCase().includes(searchQuery.toLowerCase())) ||
          c.placeTypes.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesWebsite = !filterWebsiteOnly || Boolean(c.website);
        const matchesEmail = !filterEmailOnly || Boolean(c.careerEmail);

        return matchesSearch && matchesWebsite && matchesEmail;
      })
      .sort((a, b) => {
        if (sortBy === 'city') return a.city.localeCompare(b.city);
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
        if (sortBy === 'email') return (b.careerEmail ? 1 : 0) - (a.careerEmail ? 1 : 0);
        return 0;
      });
  }, [companies, searchQuery, filterWebsiteOnly, filterEmailOnly, sortBy]);

  const allFilteredSelected = filteredCompanies.length > 0 && 
    filteredCompanies.every(c => selectedIds.includes(c.id));

  const renderEmailBadge = (company: ScrapedCompany) => {
    const isScanning = scanningIds.includes(`${company.id}-email`);

    if (isScanning) {
      return (
        <span className="text-[11px] text-amber-400 font-mono animate-pulse flex items-center gap-1">
          <span>Probing website...</span>
        </span>
      );
    }

    if (company.emailStatus === 'website_recruitment_email' && company.careerEmail) {
      return (
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-emerald-400 font-medium text-xs">
              {company.careerEmail}
            </span>
            <button
              type="button"
              onClick={(e) => handleCopyEmail(company.careerEmail!, e)}
              className="p-0.5 text-slate-400 hover:text-white"
              title="Copy verified recruitment email"
            >
              {copiedEmail === company.careerEmail ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
          <span className="text-[10px] text-emerald-500/80 block">
            Recruitment-specific email on website
          </span>
        </div>
      );
    }

    if (company.emailStatus === 'website_general_email' && company.careerEmail) {
      return (
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-sky-300 font-medium text-xs">
              {company.careerEmail}
            </span>
            <button
              type="button"
              onClick={(e) => handleCopyEmail(company.careerEmail!, e)}
              className="p-0.5 text-slate-400 hover:text-white"
              title="Copy general website email"
            >
              {copiedEmail === company.careerEmail ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
          <span className="text-[10px] text-slate-400 block">
            General website contact (unverified mailbox)
          </span>
        </div>
      );
    }

    if (company.emailStatus === 'no_email_found') {
      return (
        <div className="space-y-0.5">
          <span className="text-slate-500 text-[11px]">No public email found</span>
          <span className="text-[10px] text-slate-600 block">Contact form only or unlisted</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2">
        <span className="text-slate-500 text-[11px]">Not verified</span>
        {company.website && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onScanEmail(company);
            }}
            className="text-[10px] text-sky-400 hover:text-sky-300 underline"
          >
            Scan site
          </button>
        )}
      </div>
    );
  };

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
              placeholder="Filter by business name, city, street, place types..."
              className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Filter toggles & sort */}
        <div className="flex items-center gap-3 text-xs flex-wrap">
          <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
            <input
              type="checkbox"
              checked={filterWebsiteOnly}
              onChange={(e) => setFilterWebsiteOnly(e.target.checked)}
              className="rounded border-slate-700 bg-slate-900 text-amber-500 text-xs"
            />
            <span>Has Website</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
            <input
              type="checkbox"
              checked={filterEmailOnly}
              onChange={(e) => setFilterEmailOnly(e.target.checked)}
              className="rounded border-slate-700 bg-slate-900 text-amber-500 text-xs"
            />
            <span>Email Discovered</span>
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
              <option value="rating">Google Rating</option>
              <option value="email">Email Discovered</option>
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
              <th className="py-3 px-4 font-semibold">Registered Place & Place ID</th>
              <th className="py-3 px-4 font-semibold">Contact & Email Status</th>
              <th className="py-3 px-4 font-semibold">Data Source</th>
              <th className="py-3 px-4 font-semibold">Google Maps Rating</th>
              <th className="py-3 px-4 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredCompanies.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-500">
                  <Building2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-medium">No verified business records found.</p>
                  <p className="text-xs text-slate-400 mt-1">Execute a search across selected cities to fetch real businesses.</p>
                </td>
              </tr>
            ) : (
              filteredCompanies.map((company) => {
                const isSelected = selectedIds.includes(company.id);
                const isOsm = company.providerAttribution?.toLowerCase().includes('openstreetmap') || company.providerAttribution?.toLowerCase().includes('osm');
                const sourceLabel = isOsm ? 'OpenStreetMap — not Google' : 'Google Maps (extension)';

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

                    {/* Company & Place ID */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-white text-sm hover:text-amber-400 transition-colors">
                            {company.name}
                          </span>
                        </div>

                        {/* Unboxed clean metadata (zero-pill rule) */}
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 flex-wrap">
                          <span className="text-slate-200 font-medium">{company.city}</span>
                          <span aria-hidden="true">·</span>
                          <span>{company.address || '—'}</span>
                        </div>

                        {/* Provider Place ID Tag */}
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                          <span>Place ID: {company.placeId}</span>
                        </div>

                        <div className="flex items-center gap-3 text-[11px] pt-0.5">
                          {company.website ? (
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
                          ) : (
                            <span className="text-slate-500">Website: Not verified</span>
                          )}

                          <a
                            href={company.mapsUrl}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-amber-400 hover:text-amber-300 flex items-center gap-1 font-medium"
                          >
                            <span>Google Maps</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </div>
                      </div>
                    </td>

                    {/* Email & Contact */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        {renderEmailBadge(company)}
                        {company.phone ? (
                          <div className="flex items-center gap-1 text-[11px] text-slate-400">
                            <Phone className="w-3 h-3 text-slate-500" />
                            <span>{company.phone}</span>
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-500">
                            Phone: Not verified
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Source label */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded border ${
                        isOsm ? 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30' : 'text-sky-300 bg-sky-500/10 border-sky-500/30'
                      }`}>
                        <Globe className="w-3 h-3 shrink-0" />
                        <span>{sourceLabel}</span>
                      </span>
                    </td>

                    {/* Google Maps Rating */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {typeof company.rating === 'number' ? (
                        <div className="flex items-center gap-1.5">
                          <div className="flex items-center text-amber-400">
                            <Star className="w-3.5 h-3.5 fill-current" />
                            <span className="ml-1 font-bold text-white text-xs">{company.rating.toFixed(1)}</span>
                          </div>
                          <span className="text-slate-400 text-[11px]">({company.reviewsCount ?? '0'})</span>
                        </div>
                      ) : (
                        <span className="text-slate-500 text-[11px]">No rating</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => onGeneratePitch(company)}
                          className="px-2.5 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 font-medium text-xs rounded-md border border-amber-500/30 transition-colors flex items-center gap-1"
                          title="Generate honest German application letter"
                        >
                          <Send className="w-3 h-3" />
                          <span>Bewerbung</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onSelectCompany(company)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md border border-slate-700 transition-colors"
                          title="View Verified Dossier"
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
