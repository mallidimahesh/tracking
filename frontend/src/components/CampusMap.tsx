import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { useShuttles } from '../context/ShuttleContext';
import { Shuttle } from '../types';
import { Locate, Navigation, Layers, Info } from 'lucide-react';

export const CampusMap: React.FC = () => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<number, L.Marker>>(new Map());
  const polygonRef = useRef<L.Polygon | null>(null);
  const landmarkMarkersRef = useRef<L.Marker[]>([]);

  const { shuttles, campusMeta, selectedShuttle, setSelectedShuttle } = useShuttles();

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const centerLat = campusMeta?.center?.lat ?? 12.9692;
    const centerLng = campusMeta?.center?.lng ?? 79.1559;
    const zoomLevel = campusMeta?.center?.zoom ?? 16;

    // Create Leaflet Map focused strictly on VIT Vellore Campus
    const map = L.map(mapContainerRef.current, {
      center: [centerLat, centerLng],
      zoom: zoomLevel,
      minZoom: 15,
      maxZoom: 19,
      zoomControl: false,
    });

    // Official free OpenStreetMap tiles (no API key required)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    // Zoom controls positioned at top-right
    L.control.zoom({ position: 'topright' }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [campusMeta?.center]);

  // Render Campus Boundary Polygon & Landmarks
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !campusMeta) return;

    // 1. Campus Boundary Polygon
    if (campusMeta.polygon && campusMeta.polygon.length > 0) {
      if (polygonRef.current) {
        polygonRef.current.remove();
      }
      const poly = L.polygon(campusMeta.polygon, {
        color: '#6366f1',
        weight: 2,
        dashArray: '5, 8',
        fillColor: '#3b82f6',
        fillOpacity: 0.06,
      }).addTo(map);
      polygonRef.current = poly;
    }

    // 2. Campus Landmark Stop Markers
    landmarkMarkersRef.current.forEach((m) => m.remove());
    landmarkMarkersRef.current = [];

    if (campusMeta.landmarks) {
      campusMeta.landmarks.forEach((lm) => {
        const landmarkIcon = L.divIcon({
          className: 'custom-landmark-icon',
          html: `
            <div style="display: flex; align-items: center; gap: 4px; background: rgba(15, 23, 42, 0.85); color: #cbd5e1; padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(255, 255, 255, 0.15); font-size: 10px; font-weight: 600; white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.4);">
              <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:#38bdf8;"></span>
              ${lm.name}
            </div>
          `,
          iconSize: [100, 20],
          iconAnchor: [50, 10],
        });

        const marker = L.marker([lm.lat, lm.lng], { icon: landmarkIcon, interactive: false }).addTo(map);
        landmarkMarkersRef.current.push(marker);
      });
    }
  }, [campusMeta]);

  // Update Shuttle Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    shuttles.forEach((shuttle) => {
      const hasCoords =
        shuttle.latest_latitude !== null &&
        shuttle.latest_latitude !== undefined &&
        shuttle.latest_longitude !== null &&
        shuttle.latest_longitude !== undefined;

      const existingMarker = markersRef.current.get(shuttle.id);

      if (!hasCoords) {
        if (existingMarker) {
          existingMarker.remove();
          markersRef.current.delete(shuttle.id);
        }
        return;
      }

      const lat = shuttle.latest_latitude!;
      const lng = shuttle.latest_longitude!;

      // Determine marker color and pulse class
      const isActive = shuttle.gps_status === 'active';
      let pinColor = '#94a3b8'; // gray offline
      let badgeBg = '#334155';

      if (isActive) {
        if (shuttle.occupancy_percentage >= 90 || shuttle.is_full) {
          pinColor = '#f43f5e'; // red full
          badgeBg = '#e11d48';
        } else if (shuttle.occupancy_percentage >= 65) {
          pinColor = '#f59e0b'; // amber busy
          badgeBg = '#d97706';
        } else {
          pinColor = '#10b981'; // green available
          badgeBg = '#059669';
        }
      }

      const shortCode = shuttle.shuttle_code.replace('SH-', '');

      // Create Custom DivIcon
      const shuttleIcon = L.divIcon({
        className: 'custom-shuttle-marker',
        html: `
          <div style="position: relative; width: 38px; height: 38px; cursor: pointer;">
            ${isActive ? `<div style="position: absolute; inset: -4px; border-radius: 50%; background: ${pinColor}33; animation: markerPulse 2s infinite ease-in-out;"></div>` : ''}
            <div style="position: absolute; inset: 0; background: #0f172a; border: 2.5px solid ${pinColor}; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.6);">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${pinColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M8 6v6"/>
                <path d="M15 6v6"/>
                <path d="M2 12h19.6"/>
                <path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"/>
                <circle cx="7" cy="18" r="2"/>
                <circle cx="15" cy="18" r="2"/>
              </svg>
              <span style="font-size: 9px; font-weight: 800; color: #f8fafc; line-height: 1; margin-top: 1px;">${shortCode}</span>
            </div>
            <div style="position: absolute; top: -6px; right: -6px; background: ${badgeBg}; color: white; font-size: 8px; font-weight: 800; padding: 1px 4px; border-radius: 9999px; border: 1px solid #0f172a;">
              ${shuttle.available_seats}
            </div>
          </div>
        `,
        iconSize: [38, 38],
        iconAnchor: [19, 19],
        popupAnchor: [0, -22],
      });

      const popupHtml = `
        <div style="padding: 4px; font-family: inherit;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 4px;">
            <span style="font-weight: 800; font-size: 14px; color: #38bdf8;">${shuttle.shuttle_code}</span>
            <span style="font-size: 11px; padding: 2px 6px; border-radius: 4px; background: ${isActive ? '#065f46' : '#334155'}; color: ${isActive ? '#34d399' : '#94a3b8'}; font-weight: 600;">
              ${isActive ? 'LIVE GPS' : 'OFFLINE'}
            </span>
          </div>
          <div style="font-size: 12px; font-weight: 600; color: #f1f5f9; margin-bottom: 4px;">${shuttle.name}</div>
          <div style="font-size: 11px; color: #94a3b8; margin-bottom: 2px;">
            Occupancy: <strong style="color: #f8fafc;">${shuttle.current_passenger_count} / ${shuttle.capacity}</strong> (${shuttle.occupancy_percentage}%)
          </div>
          <div style="font-size: 11px; color: #94a3b8; margin-bottom: 2px;">
            Available Seats: <strong style="color: #34d399;">${shuttle.available_seats}</strong>
          </div>
          <div style="font-size: 10px; color: #64748b; margin-top: 6px;">
            Sensor: ${shuttle.sensor_status.toUpperCase()} | Speed: ${shuttle.gps_speed ? `${shuttle.gps_speed} km/h` : 'N/A'}
          </div>
        </div>
      `;

      if (existingMarker) {
        existingMarker.setLatLng([lat, lng]);
        existingMarker.setIcon(shuttleIcon);
        existingMarker.setPopupContent(popupHtml);
      } else {
        const marker = L.marker([lat, lng], { icon: shuttleIcon }).addTo(map);
        marker.bindPopup(popupHtml);
        marker.on('click', () => {
          setSelectedShuttle(shuttle);
        });
        markersRef.current.set(shuttle.id, marker);
      }
    });

    // Remove markers of deleted shuttles
    const currentIds = new Set(shuttles.map((s) => s.id));
    markersRef.current.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    });
  }, [shuttles, setSelectedShuttle]);

  // Recenter button click handler
  const handleRecenter = () => {
    if (!mapInstanceRef.current) return;
    const centerLat = campusMeta?.center?.lat ?? 12.9692;
    const centerLng = campusMeta?.center?.lng ?? 79.1559;
    mapInstanceRef.current.setView([centerLat, centerLng], 16, { animate: true });
  };

  // Focus selected shuttle
  useEffect(() => {
    if (selectedShuttle && selectedShuttle.latest_latitude && selectedShuttle.latest_longitude) {
      mapInstanceRef.current?.setView(
        [selectedShuttle.latest_latitude, selectedShuttle.latest_longitude],
        17,
        { animate: true }
      );
      const marker = markersRef.current.get(selectedShuttle.id);
      if (marker && !marker.isPopupOpen()) {
        marker.openPopup();
      }
    }
  }, [selectedShuttle]);

  return (
    <div className="relative w-full h-[520px] md:h-[600px] rounded-xl overflow-hidden shadow-2xl border border-slate-700/60 bg-slate-900">
      {/* Map Container */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Campus Badge Header Overlay */}
      <div className="absolute top-4 left-4 z-[500] pointer-events-none">
        <div className="glass-card px-3.5 py-2 rounded-lg flex items-center gap-2.5 shadow-lg border border-slate-700/80 pointer-events-auto">
          <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-ping" />
          <div>
            <h3 className="text-xs font-bold text-slate-100 tracking-wide">VIT VELLORE CAMPUS</h3>
            <p className="text-[10px] text-slate-400">Exclusive Geofenced Transit Zone</p>
          </div>
        </div>
      </div>

      {/* Recenter Campus Button */}
      <div className="absolute bottom-5 right-5 z-[500] flex flex-col gap-2">
        <button
          onClick={handleRecenter}
          title="Recenter Map on VIT Vellore Campus"
          className="p-2.5 bg-slate-800/95 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg shadow-lg border border-slate-700 transition flex items-center gap-1.5 text-xs font-medium backdrop-blur-md"
        >
          <Locate className="w-4 h-4 text-indigo-400" />
          <span>Recenter Campus</span>
        </button>
      </div>

      {/* Map Legend Overlay */}
      <div className="absolute bottom-5 left-5 z-[500] hidden sm:block pointer-events-none">
        <div className="glass-card px-3 py-2 rounded-lg text-[11px] text-slate-300 space-y-1.5 shadow-lg pointer-events-auto border border-slate-700/70">
          <div className="font-semibold text-slate-200 text-xs flex items-center gap-1.5 mb-1">
            <Info className="w-3.5 h-3.5 text-blue-400" />
            <span>Fleet Legend</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span>&lt; 65% Seats Available</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span>65%–89% Moderately Full</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span>&ge; 90% Full or Standing Only</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
            <span>Offline / Parked</span>
          </div>
        </div>
      </div>
    </div>
  );
};
