import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { MapPin, ExternalLink, Mail, Star, Send } from 'lucide-react';
import { ScrapedCompany } from '../types/scraper';

interface Props {
  companies: ScrapedCompany[];
  onSelectCompany: (company: ScrapedCompany) => void;
  onGeneratePitch: (company: ScrapedCompany) => void;
}

export const ResultsMapView: React.FC<Props> = ({
  companies,
  onSelectCompany,
  onGeneratePitch
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Centered on Germany/DACH
    const map = L.map(mapContainerRef.current, {
      center: [51.1657, 10.4515],
      zoom: 6,
      zoomControl: true,
    });

    // Dark Matter tile layer for cohesive aesthetic
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Markers when companies change
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();

    if (companies.length === 0) return;

    const bounds = L.latLngBounds([]);

    // Custom Icon generator
    const createCustomIcon = (hasAusbildung: boolean) => {
      return L.divIcon({
        className: 'custom-map-marker',
        html: `
          <div style="
            background: ${hasAusbildung ? '#f59e0b' : '#38bdf8'};
            color: #020617;
            width: 26px;
            height: 26px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 11px;
            box-shadow: 0 4px 10px rgba(0,0,0,0.4);
            border: 2px solid #ffffff;
            cursor: pointer;
          ">
            ★
          </div>
        `,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
        popupAnchor: [0, -14]
      });
    };

    // City jitter tracker so overlapping markers in the same city are slightly offset
    const seenCoordinates: Record<string, number> = {};

    companies.forEach((comp) => {
      let lat = comp.lat || 51.1657;
      let lng = comp.lng || 10.4515;

      const key = `${lat.toFixed(3)},${lng.toFixed(3)}`;
      const count = seenCoordinates[key] || 0;
      seenCoordinates[key] = count + 1;

      if (count > 0) {
        // Apply slight circular jitter offset
        const angle = (count * 2 * Math.PI) / 6;
        const radius = 0.015 * Math.ceil(count / 6);
        lat += radius * Math.cos(angle);
        lng += radius * Math.sin(angle);
      }

      bounds.extend([lat, lng]);

      const marker = L.marker([lat, lng], {
        icon: createCustomIcon(comp.hasAusbildung)
      });

      const popupContent = document.createElement('div');
      popupContent.className = 'p-1 text-slate-900';
      popupContent.innerHTML = `
        <div style="font-family: inherit; min-width: 200px;">
          <div style="font-weight: 700; font-size: 13px; color: #0f172a; margin-bottom: 2px;">
            ${comp.name}
          </div>
          <div style="font-size: 11px; color: #64748b; margin-bottom: 6px;">
            ${comp.address} · <strong>${comp.city}</strong>
          </div>
          ${comp.careerEmail ? `
            <div style="font-size: 11px; color: #059669; font-family: monospace; font-weight: 600; margin-bottom: 6px;">
              ✉ ${comp.careerEmail}
            </div>
          ` : ''}
          ${comp.openings.length > 0 ? `
            <div style="font-size: 11px; color: #b45309; font-weight: 500; margin-bottom: 6px;">
              ⚡ ${comp.openings[0].title}
            </div>
          ` : ''}
          <div style="display: flex; gap: 6px; margin-top: 8px;">
            <a href="${comp.mapsUrl}" target="_blank" style="
              font-size: 10px;
              color: #2563eb;
              text-decoration: underline;
              font-weight: 600;
            ">
              Google Maps
            </a>
            ${comp.website ? `
              · <a href="${comp.website}" target="_blank" style="
                font-size: 10px;
                color: #475569;
                text-decoration: underline;
              ">
                Website
              </a>
            ` : ''}
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);
      markersLayerRef.current?.addLayer(marker);
    });

    if (companies.length > 0 && bounds.isValid()) {
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
    }
  }, [companies]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl flex flex-col h-[650px]">
      {/* Map Header */}
      <div className="bg-slate-950 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-slate-300 font-medium">
          <MapPin className="w-3.5 h-3.5 text-amber-400" />
          <span>Interactive Location Map</span>
          <span className="text-slate-500 font-mono">({companies.length} employers mapped)</span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <span>Ausbildung Available</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span>
            <span>Direct Hiring / IT Jobs</span>
          </div>
        </div>
      </div>

      {/* Leaflet Container */}
      <div className="flex-1 w-full relative">
        <div ref={mapContainerRef} className="w-full h-full z-10" />

        {companies.length === 0 && (
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-20 pointer-events-none">
            <div className="text-center p-6 bg-slate-900 border border-slate-800 rounded-xl max-w-sm">
              <MapPin className="w-8 h-8 text-amber-400 mx-auto mb-2 opacity-60" />
              <p className="text-sm font-semibold text-white">No Companies Mapped Yet</p>
              <p className="text-xs text-slate-400 mt-1">
                Run the Google Maps crawler across your selected German or Austrian cities to populate the map.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
