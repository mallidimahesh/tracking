import React, { useState } from 'react';
import { useShuttles } from '../context/ShuttleContext';
import { CampusMap } from '../components/CampusMap';
import { ShuttleCard } from '../components/ShuttleCard';
import { ShuttleDetailModal } from '../components/ShuttleDetailModal';
import { Shuttle } from '../types';
import {
  Bus,
  Search,
  Users,
  Sparkles,
  MapPin,
  ShieldCheck,
  Compass,
  ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const LandingPage: React.FC = () => {
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
    <div className="flex-1 space-y-10 pb-16">
      {/* Hero Header */}
      <section className="relative pt-10 pb-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span>VIT Vellore Smart Campus Transit</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-100">
            Track. Tap. Ride. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-blue-500">
              Live Campus Shuttle Transit
            </span>
          </h1>

          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            Real-time SJT/PRP green route and Mens Hostel blue route tracking with live driver GPS telemetry and campus map visualizer.
          </p>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto pt-2">
            <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60">
              <span className="text-[11px] text-slate-400 font-medium">Registered Fleet</span>
              <div className="text-xl font-black text-slate-100">{shuttles.length} Shuttles</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60">
              <span className="text-[11px] text-slate-400 font-medium">Active on Campus</span>
              <div className="text-xl font-black text-emerald-400">{activeCount} Live GPS</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60">
              <span className="text-[11px] text-slate-400 font-medium">Transit Routes</span>
              <div className="text-xl font-black text-indigo-400">3 Routes</div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Map & Fleet Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-slate-100 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-indigo-400" />
              <span>VIT Vellore Campus Map</span>
            </h2>
            <p className="text-xs text-slate-400">
              Live transit routes and rotating vehicle markers broadcasted in real time by shuttle drivers.
            </p>
          </div>

          {/* Search & Filter Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search vehicle or route..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg text-xs bg-slate-800/80 border border-slate-700 text-slate-200 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center rounded-lg bg-slate-800/90 p-1 border border-slate-700 text-xs font-semibold overflow-x-auto">
              <button
                onClick={() => setFilter('all')}
                className={`px-2.5 py-1 rounded transition ${
                  filter === 'all' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                All ({shuttles.length})
              </button>
              <button
                onClick={() => setFilter('active')}
                className={`px-2.5 py-1 rounded transition ${
                  filter === 'active' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Live GPS
              </button>
              <button
                onClick={() => setFilter('route-a')}
                className={`px-2.5 py-1 rounded transition flex items-center gap-1 ${
                  filter === 'route-a' ? 'bg-[#16a34a] text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-[#16a34a]" />
                Route A
              </button>
              <button
                onClick={() => setFilter('route-b')}
                className={`px-2.5 py-1 rounded transition flex items-center gap-1 ${
                  filter === 'route-b' ? 'bg-[#2563eb] text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-[#2563eb]" />
                Route B
              </button>
              <button
                onClick={() => setFilter('route-c')}
                className={`px-2.5 py-1 rounded transition flex items-center gap-1 ${
                  filter === 'route-c' ? 'bg-[#eab308] text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-[#eab308]" />
                Route C
              </button>
            </div>
          </div>
        </div>

        {/* Live Leaflet Map */}
        <CampusMap />

        {/* Shuttle Card Grid */}
        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-200 flex items-center gap-2">
              <Bus className="w-4 h-4 text-indigo-400" />
              <span>Campus Transit Fleet & Routes</span>
            </h3>
            <span className="text-xs text-slate-400 font-medium">
              Showing {filteredShuttles.length} of {shuttles.length} vehicle{shuttles.length === 1 ? '' : 's'}
            </span>
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
      </section>

      {/* Role Portals */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="text-center mb-6">
          <h2 className="text-xl font-extrabold text-slate-100">Role-Based Access</h2>
          <p className="text-xs text-slate-400">Tailored dashboards for students, visitors, and drivers</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Student Card */}
          <div className="glass-card p-6 rounded-2xl border border-slate-700/80 space-y-4 hover:border-indigo-500/50 transition">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-extrabold text-slate-100">VIT Student Access</h4>
              <p className="text-xs text-slate-400 mt-1">
                Verified registration strictly enforcing <code className="text-indigo-300">@vitstudent.ac.in</code>. View all transit shuttles, live route movements, and campus stops.
              </p>
            </div>
            <Link
              to="/register"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-400 hover:text-blue-300"
            >
              <span>Register with Student Email</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Driver Card */}
          <div className="glass-card p-6 rounded-2xl border border-slate-700/80 space-y-4 hover:border-indigo-500/50 transition">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-extrabold text-slate-100">Campus Drivers</h4>
              <p className="text-xs text-slate-400 mt-1">
                Authorized mobile console. Start & stop live phone GPS tracking with precision geolocation telemetry.
              </p>
            </div>
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300"
            >
              <span>Driver Portal Login</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Outsider Card */}
          <div className="glass-card p-6 rounded-2xl border border-slate-700/80 space-y-4 hover:border-indigo-500/50 transition">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-extrabold text-slate-100">Outsiders & Visitors</h4>
              <p className="text-xs text-slate-400 mt-1">
                Public access with verified personal email. Track shuttle locations and campus transit routes in real time.
              </p>
            </div>
            <Link
              to="/register"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-400 hover:text-purple-300"
            >
              <span>Visitor Sign Up</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Shuttle Detail Modal */}
      <ShuttleDetailModal
        shuttle={detailShuttle}
        onClose={() => setDetailShuttle(null)}
      />
    </div>
  );
};
