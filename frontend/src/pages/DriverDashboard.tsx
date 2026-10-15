import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Shuttle } from '../types';
import { DriverTrackingPanel } from '../components/DriverTrackingPanel';
import { CampusMap } from '../components/CampusMap';
import { Compass, RefreshCw, AlertCircle, Bus, MapPin, Smartphone } from 'lucide-react';

export const DriverDashboard: React.FC = () => {
  const { user } = useAuth();
  const [assignedShuttle, setAssignedShuttle] = useState<Shuttle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDriverShuttle = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.driver.getMyShuttle();
      setAssignedShuttle(res.shuttle);
    } catch (err: any) {
      console.error('[DriverDashboard] Failed to fetch shuttle:', err);
      setError(err?.message || 'Failed to load assigned shuttle.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDriverShuttle();
  }, []);

  return (
    <div className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Driver Header */}
      <div className="glass-card p-5 sm:p-6 rounded-2xl border border-slate-700/80 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Compass className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-100">{user?.full_name || 'Campus Driver'}</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                Driver On-Duty
              </span>
            </div>
            <p className="text-xs text-slate-400">
              License No: {user?.driver_profile?.driver_license_no || 'TN-23-D-1001'} • VIT Vellore Campus
            </p>
          </div>
        </div>

        <button
          onClick={fetchDriverShuttle}
          disabled={loading}
          className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition flex items-center gap-2 text-xs font-semibold self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Status</span>
        </button>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Mobile-First GPS Tracking Console */}
      <DriverTrackingPanel
        shuttle={assignedShuttle}
        onShuttleUpdated={(updated) => setAssignedShuttle(updated)}
      />

      {/* Live Campus Map View */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-indigo-400" />
            <span>Campus View & Route Check</span>
          </h3>
          <span className="text-xs text-slate-400">Your shuttle marker updates live below</span>
        </div>

        <CampusMap />
      </div>
    </div>
  );
};
