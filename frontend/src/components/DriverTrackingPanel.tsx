import React, { useState, useEffect, useRef } from 'react';
import { Shuttle } from '../types';
import { api } from '../services/api';
import { geolocationService, GeoCoordinates } from '../services/geolocation';
import { StatusBadge } from './StatusBadge';
import { OccupancyBar } from './OccupancyBar';
import {
  Play,
  Square,
  Radio,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  Smartphone,
  Gauge,
  ShieldAlert,
} from 'lucide-react';

interface DriverTrackingPanelProps {
  shuttle: Shuttle | null;
  onShuttleUpdated: (shuttle: Shuttle) => void;
}

export const DriverTrackingPanel: React.FC<DriverTrackingPanelProps> = ({
  shuttle,
  onShuttleUpdated,
}) => {
  const [isTracking, setIsTracking] = useState<boolean>(shuttle?.is_tracking_active ?? false);
  const [lastCoords, setLastCoords] = useState<GeoCoordinates | null>(null);
  const [lastSentTime, setLastSentTime] = useState<Date | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [transmissionCount, setTransmissionCount] = useState<number>(0);

  const throttleRef = useRef<number>(0);

  useEffect(() => {
    setIsTracking(shuttle?.is_tracking_active ?? false);
  }, [shuttle?.is_tracking_active]);

  // Clean up GPS watch on unmount
  useEffect(() => {
    return () => {
      geolocationService.stopWatching();
    };
  }, []);

  const handleStartTracking = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!shuttle) {
      setErrorMessage('No shuttle assigned to your driver account. Contact administrator.');
      return;
    }

    try {
      // 1. Notify backend
      const res = await api.driver.startTracking();
      setIsTracking(true);
      onShuttleUpdated(res.shuttle);
      setSuccessMessage('GPS tracking session initiated. Acquiring satellite lock...');

      // 2. Start HTML5 Mobile Phone Geolocation watch
      const started = geolocationService.startWatching(
        async (coords: GeoCoordinates) => {
          setLastCoords(coords);

          // Rate limit updates to once every 3 seconds to conserve driver battery and network bandwidth
          const now = Date.now();
          if (now - throttleRef.current < 3000) {
            return;
          }
          throttleRef.current = now;

          try {
            await api.driver.submitLocation({
              latitude: coords.latitude,
              longitude: coords.longitude,
              accuracy: coords.accuracy,
              speed: coords.speed ? Math.round(coords.speed * 3.6) : 0, // convert m/s to km/h
              heading: coords.heading ?? 0,
            });
            setLastSentTime(new Date());
            setTransmissionCount((prev) => prev + 1);
            setErrorMessage(null);
          } catch (err: any) {
            console.error('[Driver] Location submission error:', err);
            setErrorMessage(err?.message || 'Network error sending GPS coordinates.');
          }
        },
        (errorStr: string) => {
          setErrorMessage(errorStr);
        }
      );

      if (!started) {
        setIsTracking(false);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to start tracking session on server.');
      setIsTracking(false);
    }
  };

  const handleStopTracking = async () => {
    setErrorMessage(null);
    try {
      geolocationService.stopWatching();
      const res = await api.driver.stopTracking();
      setIsTracking(false);
      onShuttleUpdated(res.shuttle);
      setSuccessMessage('GPS tracking session stopped successfully.');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to stop tracking on server.');
    }
  };

  return (
    <div className="glass-card p-5 sm:p-6 rounded-2xl border border-slate-700/80 shadow-2xl space-y-6">
      {/* Driver Assigned Shuttle Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center font-black text-xl text-indigo-300 shadow-inner">
            {shuttle ? shuttle.shuttle_code : '---'}
          </div>
          <div>
            <span className="text-xs font-bold tracking-wider text-indigo-400 uppercase">Assigned Transit Vehicle</span>
            <h2 className="text-xl font-extrabold text-slate-100">{shuttle ? shuttle.name : 'No Shuttle Assigned'}</h2>
            <p className="text-xs text-slate-400">VIT Vellore Campus Active Fleet</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {shuttle && (
            <>
              <StatusBadge status={isTracking ? 'active' : 'offline'} type="gps" />
              <StatusBadge status={shuttle.sensor_status} type="sensor" />
            </>
          )}
        </div>
      </div>

      {/* Notifications / Alerts */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Primary Tracking Toggle Action */}
      <div className="space-y-3">
        {!isTracking ? (
          <button
            onClick={handleStartTracking}
            className="w-full py-4 px-6 rounded-xl font-bold text-base bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-3 cursor-pointer"
          >
            <Play className="w-6 h-6 fill-current" />
            <span>START MOBILE GPS TRACKING</span>
          </button>
        ) : (
          <button
            onClick={handleStopTracking}
            className="w-full py-4 px-6 rounded-xl font-bold text-base bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white shadow-lg shadow-rose-600/30 transition flex items-center justify-center gap-3 cursor-pointer animate-pulse"
          >
            <Square className="w-6 h-6 fill-current" />
            <span>STOP GPS TRACKING</span>
          </button>
        )}
      </div>

      {/* Live Passenger Load from ESP32 IR Sensors */}
      {shuttle && (
        <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-200">ESP32 Sensor Passenger Count</span>
            <span className="font-semibold text-indigo-400">
              {shuttle.current_passenger_count} / {shuttle.capacity} Passengers
            </span>
          </div>
          <OccupancyBar
            current={shuttle.current_passenger_count}
            capacity={shuttle.capacity}
            percentage={shuttle.occupancy_percentage}
          />
          <p className="text-[11px] text-slate-400">
            Automated bidirectional counting via doorway IR sensor arrangement.
          </p>
        </div>
      )}

      {/* Phone GPS Telemetry Display */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
        <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-800 space-y-1">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Smartphone className="w-3.5 h-3.5 text-blue-400" />
            <span>Phone GPS Status</span>
          </span>
          <p className="font-bold text-slate-100">
            {isTracking ? 'Active & Broadcasting' : 'Tracking Idle'}
          </p>
        </div>

        <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-800 space-y-1">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-emerald-400" />
            <span>Fix Accuracy</span>
          </span>
          <p className="font-bold font-mono text-slate-100">
            {lastCoords?.accuracy ? `±${lastCoords.accuracy.toFixed(1)}m` : 'Awaiting Fix'}
          </p>
        </div>

        <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-800 space-y-1 col-span-2 sm:col-span-1">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Gauge className="w-3.5 h-3.5 text-purple-400" />
            <span>Pings Transmitted</span>
          </span>
          <p className="font-bold font-mono text-slate-100">{transmissionCount} updates</p>
        </div>
      </div>

      {/* Current Coordinate Readout */}
      {lastCoords && (
        <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] font-mono text-slate-300 flex flex-wrap items-center justify-between gap-2">
          <span>Lat: {lastCoords.latitude.toFixed(6)}</span>
          <span>Lng: {lastCoords.longitude.toFixed(6)}</span>
          <span>Last Ping: {lastSentTime?.toLocaleTimeString()}</span>
        </div>
      )}

      {/* Mobile Browser Background Note */}
      <div className="p-3 rounded-xl bg-slate-800/30 border border-slate-800 text-[11px] text-slate-400 space-y-1 flex items-start gap-2">
        <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <strong className="text-slate-300">Driver Guidance:</strong> Keep this browser tab open while driving on campus. Mobile operating systems (iOS and Android) throttle background GPS timers when the screen locks.
        </div>
      </div>
    </div>
  );
};
