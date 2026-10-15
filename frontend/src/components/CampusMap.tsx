import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { useShuttles } from '../context/ShuttleContext';
import { Shuttle } from '../types';
import { Locate, Navigation, Layers, Info, Bus, Compass } from 'lucide-react';

export const CampusMap: React.FC = () => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<number, L.Marker>>(new Map());
  const routePolylinesRef = useRef<L.Polyline[]>([]);
  const polygonRef = useRef<L.Polygon | null>(null);
  const landmarkMarkersRef = useRef<L.Marker[]>([]);
  const selfMarkerRef = useRef<L.Marker | null>(null);

  const { shuttles, campusMeta, selectedShuttle, setSelectedShuttle } = useShuttles();
  const [selfCoords, setSelfCoords] = useState<[number, number] | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const centerLat = campusMeta?.center?.lat ?? 12.9692;
    const centerLng = campusMeta?.center?.lng ?? 79.1559;
    const zoomLevel = campusMeta?.center?.zoom ?? 16;

    // Create Leaflet Map focused on VIT Vellore Campus
    const map = L.map(mapContainerRef.current, {
      center: [centerLat, centerLng],
      zoom: zoomLevel,
      minZoom: 15,
      maxZoom: 19,
      zoomControl: false,
    });

    // Free OpenStreetMap tiles
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

  // Track Self User Location
  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setSelfCoords([pos.coords.latitude, pos.coords.longitude]);
      },
      (err) => {
        console.warn('Geolocation access not granted:', err);
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 5000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Render Self Marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (selfCoords) {
      const selfIcon = L.divIcon({
        className: 'pin self-marker',
        html: `<div style="width: 14px; height: 14px; background: #1e90ff; border: 2.5px solid #ffffff; border-radius: 999px; box-shadow: 0 0 10px #1e90ff;"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });

      if (selfMarkerRef.current) {
        selfMarkerRef.current.setLatLng(selfCoords);
      } else {
        selfMarkerRef.current = L.marker(selfCoords, { icon: selfIcon })
          .addTo(map)
          .bindPopup('<strong style="font-size:12px;">Your Current Location</strong>');
      }
    }
  }, [selfCoords]);

  // Render Route Polylines & Campus Perimeter Polygon & Landmarks
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !campusMeta) return;

    // 1. Campus Perimeter Boundary Polygon
    if (campusMeta.polygon && campusMeta.polygon.length > 0) {
      if (polygonRef.current) {
        polygonRef.current.remove();
      }
      polygonRef.current = L.polygon(campusMeta.polygon, {
        color: '#6366f1',
        weight: 1.5,
        dashArray: '4, 6',
        fillColor: '#3b82f6',
        fillOpacity: 0.04,
      }).addTo(map);
    }

    // 2. Official Campus Transit Route Polylines (matching D:\tracking)
    routePolylinesRef.current.forEach((p) => p.remove());
    routePolylinesRef.current = [];

    const routes = campusMeta.routes || {
      A: {
        id: 'A',
        name: 'SJT / PRP Green Route',
        color: '#16a34a',
        waypoints: [
          [12.9729, 79.1586],
          [12.9715, 79.1608],
          [12.9695, 79.1622],
          [12.9678, 79.1637],
          [12.9712, 79.1638],
          [12.9729, 79.1586],
        ],
      },
      B: {
        id: 'B',
        name: 'Mens Hostel Blue Route',
        color: '#2563eb',
        waypoints: [
          [12.9724, 79.1552],
          [12.9709, 79.1531],
          [12.9686, 79.1518],
          [12.9669, 79.1507],
          [12.9692, 79.1559],
          [12.9724, 79.1552],
        ],
      },
      C: {
        id: 'C',
        name: 'Out of Campus Yellow Route',
        color: '#eab308',
        waypoints: [
          [12.9692, 79.1559],
          [12.968, 79.155],
          [12.967, 79.154],
          [12.966, 79.153],
          [12.9675, 79.152],
          [12.969, 79.1535],
          [12.97, 79.155],
          [12.9692, 79.1559],
        ],
      },
    };

    Object.values(routes).forEach((rt: any) => {
      if (rt.waypoints && rt.waypoints.length > 1) {
        const poly = L.polyline(rt.waypoints, {
          color: rt.color,
          weight: 4.5,
          opacity: 0.85,
          lineJoin: 'round',
        }).addTo(map);
        poly.bindPopup(`<strong>${rt.name}</strong><br />Route ${rt.id}`);
        routePolylinesRef.current.push(poly);
      }
    });

    // 3. Landmark Stop Markers
    landmarkMarkersRef.current.forEach((m) => m.remove());
    landmarkMarkersRef.current = [];

    if (campusMeta.landmarks) {
      campusMeta.landmarks.forEach((lm) => {
        const landmarkIcon = L.divIcon({
          className: 'custom-landmark-icon',
          html: `
            <div style="display: flex; align-items: center; gap: 4px; background: rgba(15, 23, 42, 0.88); color: #cbd5e1; padding: 2px 7px; border-radius: 6px; border: 1px solid rgba(255, 255, 255, 0.15); font-size: 10px; font-weight: 700; white-space: nowrap; box-shadow: 0 2px 6px rgba(0,0,0,0.5);">
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

  // Update Rotating Shuttle Markers (matching D:\tracking getBusIcon)
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
      const isActive = shuttle.gps_status === 'active';
      const heading = shuttle.gps_heading || 0;
      const routeColor = shuttle.route_color || (shuttle.route === 'B' ? '#2563eb' : shuttle.route === 'C' ? '#eab308' : '#16a34a');
      const vehicleNo = shuttle.vehicle_no || shuttle.shuttle_code;
      const routeName = shuttle.route_name || (shuttle.route === 'B' ? 'Mens Hostel Blue Route' : shuttle.route === 'C' ? 'Out of Campus Route' : 'SJT / PRP Green Route');

      // SVG arrow pointing up (N), rotated by shuttle heading (matching D:\tracking\components\MapView.jsx)
      const busSvgHtml = `
        <div style="position: relative; width: 34px; height: 34px; display: grid; place-items: center; filter: drop-shadow(0 3px 6px rgba(0,0,0,0.5));">
          ${isActive ? `<div style="position: absolute; inset: -4px; border-radius: 50%; background: ${routeColor}33; animation: markerPulse 2s infinite ease-in-out;"></div>` : ''}
          <div style="transform: rotate(${heading}deg); transition: transform 0.5s ease-out; width: 30px; height: 30px; display: grid; place-items: center;">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L4.5 20.29L5.21 21L12 18L18.79 21L19.5 20.29L12 2Z" fill="${routeColor}" stroke="#ffffff" stroke-width="1.8" stroke-linejoin="round" />
            </svg>
          </div>
        </div>
      `;

      const shuttleIcon = L.divIcon({
        className: `bus-arrow-icon route-${shuttle.route || 'A'}`,
        html: busSvgHtml,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
        popupAnchor: [0, -20],
      });

      const popupHtml = `
        <div style="padding: 4px; font-family: inherit; min-width: 170px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 4px;">
            <span style="font-weight: 800; font-size: 14px; color: ${routeColor};">${vehicleNo}</span>
            <span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; background: ${isActive ? '#065f46' : '#334155'}; color: ${isActive ? '#34d399' : '#94a3b8'}; font-weight: 700;">
              ${isActive ? 'LIVE GPS' : 'OFFLINE'}
            </span>
          </div>
          <div style="font-size: 12px; font-weight: 700; color: #f1f5f9; margin-bottom: 3px;">${shuttle.name}</div>
          <div style="font-size: 11px; color: #94a3b8; margin-bottom: 2px;">
            Route: <strong style="color: ${routeColor};">${routeName}</strong>
          </div>
          <div style="font-size: 11px; color: #94a3b8; margin-bottom: 4px;">
            Speed: <strong style="color: #f8fafc;">${shuttle.gps_speed ? `${shuttle.gps_speed} km/h` : 'Stopped'}</strong> | Heading: <strong style="color: #f8fafc;">${Math.round(heading)}°</strong>
          </div>
          <div style="font-size: 10px; color: #64748b; margin-top: 4px; border-top: 1px solid rgba(255,255,255,0.06); pt: 3px;">
            Driver: ${shuttle.driver?.name || 'On Duty'}
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

      {/* Campus Transit Badge Header Overlay */}
      <div className="absolute top-4 left-4 z-[500] pointer-events-none">
        <div className="glass-card px-3.5 py-2 rounded-lg flex items-center gap-2.5 shadow-lg border border-slate-700/80 pointer-events-auto">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          <div>
            <h3 className="text-xs font-bold text-slate-100 tracking-wide">VIT VELLORE CAMPUS SHUTTLE</h3>
            <p className="text-[10px] text-slate-400">Live Driver GPS Telemetry & Route Map</p>
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

      {/* Map Legend Overlay (Route Colors & Self Marker) */}
      <div className="absolute bottom-5 left-5 z-[500] hidden sm:block pointer-events-none">
        <div className="glass-card px-3.5 py-2.5 rounded-lg text-[11px] text-slate-300 space-y-1.5 shadow-lg pointer-events-auto border border-slate-700/70">
          <div className="font-semibold text-slate-200 text-xs flex items-center gap-1.5 mb-1.5">
            <Info className="w-3.5 h-3.5 text-blue-400" />
            <span>Transit Routes</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-1.5 rounded-full bg-[#16a34a]" />
            <span>Route A (SJT / PRP Green Route)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-1.5 rounded-full bg-[#2563eb]" />
            <span>Route B (Mens Hostel Blue Route)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-1.5 rounded-full bg-[#eab308]" />
            <span>Route C (Out of Campus Yellow Route)</span>
          </div>
          <div className="flex items-center gap-2 pt-1 border-t border-slate-700/50">
            <span className="w-2.5 h-2.5 rounded-full bg-[#1e90ff] border border-white" />
            <span>Your Current Location</span>
          </div>
        </div>
      </div>
    </div>
  );
};
