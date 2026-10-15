import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useShuttles } from '../context/ShuttleContext';
import { CampusMap } from '../components/CampusMap';
import { ShuttleCard } from '../components/ShuttleCard';
import { ShuttleDetailModal } from '../components/ShuttleDetailModal';
import { Shuttle } from '../types';
import { ShieldCheck, Bus, MapPin, Search } from 'lucide-react';

export const OutsiderDashboard: React.FC = () => {
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

  return (
    <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="glass-card p-5 sm:p-6 rounded-2xl border border-slate-700/80 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-100">{user?.full_name || 'Campus Visitor'}</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30">
                Visitor Access
              </span>
            </div>
            <p className="text-xs text-slate-400">Public Shuttle Tracking • VIT Vellore Campus</p>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-indigo-400" />
            <span>Live Campus Shuttle Locations & Routes</span>
          </h2>
        </div>
        <CampusMap />
      </div>

      {/* Fleet */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Bus className="w-5 h-5 text-indigo-400" />
            <span>Public Transit Fleet & Route Information</span>
          </h3>

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
