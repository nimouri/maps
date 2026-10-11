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

    const map = L.map(mapContainerRef.current, {
      center: [51.1657, 10.4515],
      zoom: 6,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a> | Places: Google Maps',
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

    const createCustomIcon = (isAusbildungConfirmed: boolean) => {
      return L.divIcon({
        className: 'custom-map-marker',
        html: `
          <div style="
            background: ${isAusbildungConfirmed ? '#f59e0b' : '#0284c7'};
            color: #ffffff;
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
            ${isAusbildungConfirmed ? '★' : '●'}
          </div>
        `,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
        popupAnchor: [0, -14]
      });
    };

    const seenCoordinates: Record<string, number> = {};

    companies.forEach((comp) => {
      if (typeof comp.lat !== 'number' || typeof comp.lng !== 'number' || isNaN(comp.lat) || isNaN(comp.lng)) {
        return; // Ignore results without verified coordinates
      }

      let lat = comp.lat;
      let lng = comp.lng;

      const key = `${lat.toFixed(3)},${lng.toFixed(3)}`;
      const count = seenCoordinates[key] || 0;
      seenCoordinates[key] = count + 1;

      if (count > 0) {
        const angle = (count * 2 * Math.PI) / 6;
        const radius = 0.012 * Math.ceil(count / 6);
        lat += radius * Math.cos(angle);
        lng += radius * Math.sin(angle);
      }

      bounds.extend([lat, lng]);

      const isConfirmed = comp.ausbildungStatus === 'confirmed_listing';
      const marker = L.marker([lat, lng], {
        icon: createCustomIcon(isConfirmed)
      });

      const popupContent = document.createElement('div');
      popupContent.className = 'p-1 text-slate-900';
      popupContent.innerHTML = `
        <div style="font-family: inherit; min-width: 210px;">
          <div style="font-weight: 700; font-size: 13px; color: #0f172a; margin-bottom: 2px;">
            ${comp.name}
          </div>
          <div style="font-size: 10px; color: #64748b; font-family: monospace; margin-bottom: 4px;">
            Place ID: ${comp.placeId}
          </div>
          <div style="font-size: 11px; color: #475569; margin-bottom: 6px;">
            ${comp.address}
          </div>
          ${comp.careerEmail ? `
            <div style="font-size: 11px; color: #059669; font-family: monospace; font-weight: 600; margin-bottom: 6px;">
              ✉ ${comp.careerEmail}
            </div>
          ` : '<div style="font-size: 10px; color: #94a3b8; margin-bottom: 6px;">Email: Not verified</div>'}
          <div style="font-size: 11px; margin-bottom: 8px;">
            ${isConfirmed 
              ? '<span style="color: #b45309; font-weight: 700;">✓ Ausbildung Confirmed</span>' 
              : '<span style="color: #64748b;">Ausbildung: Not verified</span>'}
          </div>
          <div style="display: flex; gap: 8px; border-top: 1px solid #e2e8f0; padding-top: 6px;">
            <a href="${comp.mapsUrl}" target="_blank" style="
              font-size: 11px;
              color: #2563eb;
              text-decoration: underline;
              font-weight: 600;
            ">
              Google Maps
            </a>
            ${comp.website ? `
              · <a href="${comp.website}" target="_blank" style="
                font-size: 11px;
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
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }, [companies]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl flex flex-col h-[650px]">
      {/* Map Header */}
      <div className="bg-slate-950 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-slate-300 font-medium">
          <MapPin className="w-3.5 h-3.5 text-amber-400" />
          <span>Interactive Location Map</span>
          <span className="text-slate-500 font-mono">({companies.length} verified businesses mapped)</span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <span>Confirmed Ausbildung</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-600"></span>
            <span>Registered Google Places Entity</span>
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
              <p className="text-sm font-semibold text-white">No Businesses Mapped Yet</p>
              <p className="text-xs text-slate-400 mt-1">
                Execute a search via Google Places API (New) to populate businesses on the map.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Mandatory Attribution Bar */}
      <div className="bg-slate-950 border-t border-slate-800 px-4 py-1.5 text-[10px] text-slate-500 flex justify-between items-center">
        <span>Attribution: Google Maps</span>
        <span>Provider: Google Places API (New)</span>
      </div>
    </div>
  );
};
