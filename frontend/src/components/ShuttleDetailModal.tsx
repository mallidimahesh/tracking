import React, { useEffect, useState } from 'react';
import { Shuttle, ShuttleDetail } from '../types';
import { api } from '../services/api';
import { StatusBadge } from './StatusBadge';
import { OccupancyBar } from './OccupancyBar';
import { X, Bus, Radio, Gauge, Navigation, ShieldCheck, Wallet, Clock, Activity } from 'lucide-react';

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

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="glass-card w-full max-w-xl rounded-2xl border border-slate-700/80 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center font-black text-lg text-indigo-300">
              {current.shuttle_code}
            </div>
            <div>
              <h3 className="font-extrabold text-slate-100 text-lg">{current.name}</h3>
              <p className="text-xs text-slate-400">VIT Vellore Campus Transit Shuttle</p>
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
              <span className="text-xs text-slate-400 font-medium">GPS State:</span>
              <StatusBadge status={current.gps_status} type="gps" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">IoT IR Sensor:</span>
              <StatusBadge status={current.sensor_status} type="sensor" />
            </div>
          </div>

          {/* Occupancy Card */}
          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200 flex items-center gap-1.5">
                <Bus className="w-4 h-4 text-indigo-400" />
                <span>Live Passenger Load</span>
              </span>
              <span className="text-xs px-2 py-0.5 rounded font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {current.available_seats} Available Seats
              </span>
            </div>
            <OccupancyBar
              current={current.current_passenger_count}
              capacity={current.capacity}
              percentage={current.occupancy_percentage}
            />
            <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-800">
              <span>Max Rated Capacity: {current.capacity} passengers</span>
              <span>Load: {current.occupancy_percentage}%</span>
            </div>
          </div>

          {/* Real-time Telemetry Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-800 space-y-1">
              <span className="text-slate-400 flex items-center gap-1">
                <Navigation className="w-3.5 h-3.5 text-blue-400" />
                <span>Coordinates</span>
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
                {current.gps_accuracy ? `±${current.gps_accuracy.toFixed(1)}m` : 'N/A'}
              </p>
            </div>

            <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-800 space-y-1">
              <span className="text-slate-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-purple-400" />
                <span>Last Updated</span>
              </span>
              <p className="font-mono text-slate-200">
                {current.last_gps_update ? new Date(current.last_gps_update).toLocaleTimeString() : 'N/A'}
              </p>
            </div>
          </div>

          {/* Future Fare Architecture Notice */}
          <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-800/50 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-600/20 text-indigo-400">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h5 className="font-semibold text-xs text-indigo-200">VIT Pay — Future Fare Architecture</h5>
              <p className="text-[11px] text-indigo-300/80">
                Fixed flat fare of ₹20 per campus transit ride. Wallet transactions will be linked to verified student IDs in Phase 2.
              </p>
            </div>
          </div>

          {/* Recent Sensor Events History */}
          {details?.recent_events && details.recent_events.length > 0 && (
            <div className="space-y-2">
              <h5 className="font-bold text-xs text-slate-300 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                <span>Recent ESP32 Directional Sensor Ingestion</span>
              </h5>
              <div className="max-h-32 overflow-y-auto space-y-1 text-[11px] font-mono rounded-lg border border-slate-800 p-2 bg-slate-900/80">
                {details.recent_events.map((evt) => (
                  <div key={evt.id} className="flex items-center justify-between py-0.5 border-b border-slate-800/50 last:border-0">
                    <span className={evt.event_type === 'entry' ? 'text-emerald-400' : 'text-rose-400'}>
                      {evt.event_type.toUpperCase()} ({evt.delta > 0 ? `+${evt.delta}` : evt.delta})
                    </span>
                    <span className="text-slate-400">Count After: {evt.count_after}</span>
                    <span className="text-slate-500">{new Date(evt.timestamp).toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
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
