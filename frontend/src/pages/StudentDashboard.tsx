import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useShuttles } from '../context/ShuttleContext';
import { CampusMap } from '../components/CampusMap';
import { ShuttleCard } from '../components/ShuttleCard';
import { ShuttleDetailModal } from '../components/ShuttleDetailModal';
import { Shuttle } from '../types';
import {
  GraduationCap,
  Bus,
  Search,
  Wallet,
  MapPin,
  CheckCircle,
} from 'lucide-react';

export const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const {
    shuttles,
    filteredShuttles,
    selectedShuttle,
    setSelectedShuttle,
    filter,
    setFilter,
    searchQuery,
    setSearchQuery,
  } = useShuttles();

  const [detailShuttle, setDetailShuttle] = useState<Shuttle | null>(null);

  const activeCount = shuttles.filter((s) => s.gps_status === 'active' || s.is_tracking_active).length;

  return (
    <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Student Profile Header */}
      <div className="glass-card p-5 sm:p-6 rounded-2xl border border-slate-700/80 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-100">{user?.full_name || 'VIT Student'}</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Verified Student
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">{user?.email}</p>
          </div>
        </div>

        {/* Flat Fare ₹20 Campus Pass Badge */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/60 border border-slate-700/80">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Wallet className="w-5 h-5" />
          </div>
          <div className="text-left">
            <div className="text-xs font-bold text-slate-200">Campus Pass: ₹20 / Ride</div>
            <p className="text-[11px] text-slate-400">Fixed campus shuttle fare • Mobile NFC Ready</p>
          </div>
        </div>
      </div>

      {/* Campus Map & Quick Stops */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-indigo-400" />
              <span>Campus Live Map</span>
            </h2>
            <p className="text-xs text-slate-400">
              Tracking campus shuttles on Route A (Green), Route B (Blue), Route C (Yellow) with live driver GPS.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Quick Stops:</span>
            <div className="flex flex-wrap gap-1.5">
              {['Tech Tower (TT)', 'SJT Block', 'Hostels (MH)', 'Main Gate'].map((stop) => (
                <span
                  key={stop}
                  className="px-2 py-1 rounded-md text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700"
                >
                  {stop}
                </span>
              ))}
            </div>
          </div>
        </div>

        <CampusMap />
      </div>

      {/* Fleet List & Filters */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Bus className="w-5 h-5 text-indigo-400" />
              <span>Campus Shuttle Transit Fleet</span>
            </h3>
            <p className="text-xs text-slate-400">
              {activeCount} of {shuttles.length} active shuttles broadcasting live GPS telemetry
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search shuttle..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-lg text-xs bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center rounded-lg bg-slate-800 p-1 border border-slate-700 text-xs font-semibold">
              <button
                onClick={() => setFilter('all')}
                className={`px-2.5 py-1 rounded transition ${
                  filter === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('active')}
                className={`px-2.5 py-1 rounded transition ${
                  filter === 'active' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Live GPS
              </button>
              <button
                onClick={() => setFilter('route-a')}
                className={`px-2.5 py-1 rounded transition ${
                  filter === 'route-a' ? 'bg-[#16a34a] text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Route A
              </button>
              <button
                onClick={() => setFilter('route-b')}
                className={`px-2.5 py-1 rounded transition ${
                  filter === 'route-b' ? 'bg-[#2563eb] text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Route B
              </button>
              <button
                onClick={() => setFilter('route-c')}
                className={`px-2.5 py-1 rounded transition ${
                  filter === 'route-c' ? 'bg-[#eab308] text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Route C
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredShuttles.map((shuttle) => (
            <ShuttleCard
              key={shuttle.id}
              shuttle={shuttle}
              isSelected={selectedShuttle?.id === shuttle.id}
              onSelect={(s) => setSelectedShuttle(s)}
              onOpenDetails={(s) => setDetailShuttle(s)}
            />
          ))}
        </div>
      </div>

      <ShuttleDetailModal
        shuttle={detailShuttle}
        onClose={() => setDetailShuttle(null)}
      />
    </div>
  );
};
