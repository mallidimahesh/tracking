import React from 'react';
import { Shuttle } from '../types';
import { StatusBadge } from './StatusBadge';
import { Bus, MapPin, Gauge, Clock, Compass } from 'lucide-react';

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
  const routeCode = shuttle.route || 'A';
  const routeColor = shuttle.route_color || '#16a34a';
  const routeName = shuttle.route_name || (routeCode === 'A' ? 'SJT / PRP Green Route' : routeCode === 'B' ? 'Mens Hostel Blue Route' : 'Out of Campus Route');

  return (
    <div
      onClick={() => onSelect(shuttle)}
      className={`glass-card p-4 rounded-xl transition-all duration-200 cursor-pointer border ${
        isSelected
          ? 'border-indigo-500 shadow-indigo-500/20 shadow-lg ring-1 ring-indigo-500'
          : 'hover:border-slate-600 hover:shadow-lg'
      }`}
      style={{ borderLeft: `4px solid ${routeColor}` }}
    >
      {/* Header: Vehicle No & Route Badge */}
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2.5">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center font-black text-xs border"
            style={{
              backgroundColor: `${routeColor}20`,
              color: routeColor,
              borderColor: `${routeColor}50`,
            }}
          >
            {shuttle.vehicle_no || shuttle.shuttle_code}
          </div>
          <div>
            <h4 className="font-bold text-slate-100 text-sm flex items-center gap-1.5">
              <span>{shuttle.name}</span>
            </h4>
            <p className="text-[11px] font-medium flex items-center gap-1" style={{ color: routeColor }}>
              <Bus className="w-3 h-3" />
              <span>{routeName}</span>
            </p>
          </div>
        </div>

        <StatusBadge status={shuttle.gps_status} type="gps" />
      </div>

      {/* Transit Route Pill */}
      <div className="my-2.5 p-2 rounded-lg bg-slate-800/60 border border-slate-700/60 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: routeColor }}
          />
          <span className="font-semibold text-slate-200">Route {routeCode}</span>
        </div>
        <span className="text-[11px] text-slate-400">
          {shuttle.driver?.name ? `Driver: ${shuttle.driver.name}` : 'Driver Assigned'}
        </span>
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
          {shuttle.gps_heading !== undefined && shuttle.gps_heading !== null && (
            <span className="text-[10px] text-slate-500 flex items-center ml-1">
              <Compass className="w-3 h-3 mr-0.5" />
              {Math.round(shuttle.gps_heading)}°
            </span>
          )}
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

