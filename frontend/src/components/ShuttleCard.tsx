import React from 'react';
import { Shuttle } from '../types';
import { StatusBadge } from './StatusBadge';
import { OccupancyBar } from './OccupancyBar';
import { Bus, MapPin, Gauge, Radio, Clock } from 'lucide-react';

interface ShuttleCardProps {
  shuttle: Shuttle;
  isSelected?: boolean;
  onSelect: (shuttle: Shuttle) => void;
  onOpenDetails: (shuttle: Shuttle) => void;
}

export const ShuttleCard: React.FC<ShuttleCardProps> = ({
  shuttle,
  isSelected = false,
  onSelect,
  onOpenDetails,
}) => {
  const formatTime = (iso?: string | null) => {
    if (!iso) return 'No updates';
    const date = new Date(iso);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const isActive = shuttle.gps_status === 'active';

  return (
    <div
      onClick={() => onSelect(shuttle)}
      className={`glass-card p-4 rounded-xl transition-all duration-200 cursor-pointer border ${
        isSelected
          ? 'border-indigo-500 shadow-indigo-500/20 shadow-lg ring-1 ring-indigo-500'
          : 'hover:border-slate-600 hover:shadow-lg'
      }`}
    >
      {/* Header: Shuttle Code & Live Badges */}
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center font-black text-sm border ${
              isActive
                ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            {shuttle.shuttle_code}
          </div>
          <div>
            <h4 className="font-bold text-slate-100 text-sm">{shuttle.name}</h4>
            <p className="text-[11px] text-slate-400 flex items-center gap-1">
              <Bus className="w-3 h-3 text-slate-500" />
              <span>Campus Transit Route</span>
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          <StatusBadge status={shuttle.gps_status} type="gps" />
          <StatusBadge status={shuttle.sensor_status} type="sensor" />
        </div>
      </div>

      {/* Occupancy Bar */}
      <div className="my-3">
        <OccupancyBar
          current={shuttle.current_passenger_count}
          capacity={shuttle.capacity}
          percentage={shuttle.occupancy_percentage}
        />
      </div>

      {/* Telemetry Snapshot Row */}
      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 border-t border-slate-800/80 pt-2.5 mb-3">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          <span>GPS: {formatTime(shuttle.last_gps_update)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Gauge className="w-3.5 h-3.5 text-slate-500" />
          <span>{shuttle.gps_speed ? `${shuttle.gps_speed} km/h` : 'Stopped'}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect(shuttle);
          }}
          className="flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition flex items-center justify-center gap-1.5"
        >
          <MapPin className="w-3.5 h-3.5" />
          <span>Focus on Map</span>
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenDetails(shuttle);
          }}
          className="py-1.5 px-3 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
        >
          Details
        </button>
      </div>
    </div>
  );
};
