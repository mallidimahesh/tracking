import React, { useEffect, useState } from 'react';
import { Shuttle, ShuttleDetail } from '../types';
import { api } from '../services/api';
import { StatusBadge } from './StatusBadge';
import { X, Bus, Gauge, Navigation, Radio, Clock, MapPin, Compass } from 'lucide-react';

interface ShuttleDetailModalProps {
  shuttle: Shuttle | null;
  onClose: () => void;
}

export const ShuttleDetailModal: React.FC<ShuttleDetailModalProps> = ({ shuttle, onClose }) => {
  const [details, setDetails] = useState<ShuttleDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!shuttle) {
      setDetails(null);
      return;
    }

    let active = true;
    const fetchFullDetails = async () => {
      setLoading(true);
      try {
        const res = await api.shuttles.getDetails(shuttle.id);
        if (active) setDetails(res);
      } catch (err) {
        console.error('[DetailModal] Failed to load full details:', err);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchFullDetails();
    return () => {
      active = false;
    };
  }, [shuttle?.id]);

  if (!shuttle) return null;

  const current = details || shuttle;
  const routeCode = current.route || 'A';
  const routeColor = current.route_color || '#16a34a';
  const routeName = current.route_name || (routeCode === 'A' ? 'SJT / PRP Green Route' : routeCode === 'B' ? 'Mens Hostel Blue Route' : 'Out of Campus Route');

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="glass-card w-full max-w-xl rounded-2xl border border-slate-700/80 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60" style={{ borderLeft: `6px solid ${routeColor}` }}>
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-sm border"
              style={{
                backgroundColor: `${routeColor}25`,
                color: routeColor,
                borderColor: `${routeColor}60`,
              }}
            >
              {current.vehicle_no || current.shuttle_code}
            </div>
            <div>
              <h3 className="font-extrabold text-slate-100 text-lg">{current.name}</h3>
              <p className="text-xs font-semibold" style={{ color: routeColor }}>
                {routeName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm">
          {/* Status Badges Row */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-slate-800/40 border border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">GPS Broadcast:</span>
              <StatusBadge status={current.gps_status} type="gps" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Route Assignment:</span>
              <span
                className="px-2.5 py-0.5 rounded-full text-xs font-bold border"
                style={{
                  backgroundColor: `${routeColor}20`,
                  color: routeColor,
                  borderColor: `${routeColor}40`,
                }}
              >
                Route {routeCode}
              </span>
            </div>
          </div>

          {/* Transit Route & Vehicle Info Card */}
          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200 flex items-center gap-1.5">
                <Bus className="w-4 h-4 text-indigo-400" />
                <span>Transit Route Details</span>
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold text-slate-300 bg-slate-800 border border-slate-700">
                {current.vehicle_no || current.shuttle_code}
              </span>
            </div>
            <div className="text-xs text-slate-300">
              <p><strong className="text-slate-100">Service:</strong> {routeName}</p>
              <p className="text-slate-400 mt-1">
                Operating between major campus stops (SJT, PRP, Men&apos;s Hostels, TT, Main Gate). Tracked in real time via driver mobile device.
              </p>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
              <span>Driver: <strong className="text-slate-200">{current.driver?.name || 'On Duty'}</strong></span>
              <span>Campus Loop: <strong className="text-emerald-400">Active</strong></span>
            </div>
          </div>

          {/* Real-time Telemetry Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-800 space-y-1">
              <span className="text-slate-400 flex items-center gap-1">
                <Navigation className="w-3.5 h-3.5 text-blue-400" />
                <span>Live Coordinates</span>
              </span>
              <p className="font-mono text-slate-200">
                {current.latest_latitude && current.latest_longitude
                  ? `${current.latest_latitude.toFixed(5)}, ${current.latest_longitude.toFixed(5)}`
                  : 'Coordinates pending'}
              </p>
            </div>

            <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-800 space-y-1">
              <span className="text-slate-400 flex items-center gap-1">
                <Gauge className="w-3.5 h-3.5 text-emerald-400" />
                <span>Speed & Heading</span>
              </span>
              <p className="font-mono text-slate-200">
                {current.gps_speed ? `${current.gps_speed} km/h` : '0 km/h'} • {current.gps_heading ? `${Math.round(current.gps_heading)}°` : '0°'}
              </p>
            </div>

            <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-800 space-y-1">
              <span className="text-slate-400 flex items-center gap-1">
                <Radio className="w-3.5 h-3.5 text-amber-400" />
                <span>GPS Accuracy</span>
              </span>
              <p className="font-mono text-slate-200">
                {current.gps_accuracy ? `±${current.gps_accuracy.toFixed(1)}m` : '±3.5m'}
              </p>
            </div>

            <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-800 space-y-1">
              <span className="text-slate-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-purple-400" />
                <span>Last Updated</span>
              </span>
              <p className="font-mono text-slate-200">
                {current.last_gps_update ? new Date(current.last_gps_update).toLocaleTimeString() : 'Live'}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex justify-end">
          <button
            onClick={onClose}
            className="py-2 px-5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
          >
            Close Window
          </button>
        </div>
      </div>
    </div>
  );
};
