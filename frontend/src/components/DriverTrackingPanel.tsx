import React, { useState, useEffect, useRef } from 'react';
import { Shuttle } from '../types';
import { api } from '../services/api';
import { geolocationService, GeoCoordinates } from '../services/geolocation';
import { StatusBadge } from './StatusBadge';
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
  Compass,
  Bus,
} from 'lucide-react';

interface DriverTrackingPanelProps {
  shuttle: Shuttle | null;
  onShuttleUpdated: (shuttle: Shuttle) => void;
}

// Campus Route Waypoints for fallback simulation when testing indoors (matching D:\tracking\pages\driver.js)
const ROUTE_WAYPOINTS: Record<string, [number, number][]> = {
  A: [
    [12.9729, 79.1586],
    [12.9715, 79.1608],
    [12.9695, 79.1622],
    [12.9678, 79.1637],
    [12.9712, 79.1638],
    [12.9729, 79.1586],
  ],
  B: [
    [12.9724, 79.1552],
    [12.9709, 79.1531],
    [12.9686, 79.1518],
    [12.9669, 79.1507],
    [12.9692, 79.1559],
    [12.9724, 79.1552],
  ],
  C: [
    [12.9692, 79.1559],
    [12.968, 79.155],
    [12.967, 79.154],
    [12.966, 79.153],
    [12.9675, 79.152],
    [12.969, 79.1535],
    [12.97, 79.155],
    [12.9692, 79.1559],
  ],
};

// Calculate heading between two points (from D:\tracking\pages\driver.js)
function calculateHeading(lat1: number, lng1: number, lat2: number, lng2: number) {
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLng);
  let brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

export const DriverTrackingPanel: React.FC<DriverTrackingPanelProps> = ({
  shuttle,
  onShuttleUpdated,
}) => {
  const [isTracking, setIsTracking] = useState<boolean>(shuttle?.is_tracking_active ?? false);
  const [selectedRoute, setSelectedRoute] = useState<string>(shuttle?.route || 'A');
  const [lastCoords, setLastCoords] = useState<GeoCoordinates | null>(null);
  const [lastSentTime, setLastSentTime] = useState<Date | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [transmissionCount, setTransmissionCount] = useState<number>(0);
  const [speedKmh, setSpeedKmh] = useState<number>(0);
  const [headingDeg, setHeadingDeg] = useState<number>(0);
  const [wakeLockActive, setWakeLockActive] = useState<boolean>(false);

  const throttleRef = useRef<number>(0);
  const simTimerRef = useRef<any>(null);
  const waypointIdxRef = useRef<number>(0);
  const wakeLockRef = useRef<any>(null);

  useEffect(() => {
    setIsTracking(shuttle?.is_tracking_active ?? false);
    if (shuttle?.route) setSelectedRoute(shuttle.route);
  }, [shuttle?.is_tracking_active, shuttle?.route]);

  // Request Wake Lock API (from D:\tracking) to keep driver screen awake
  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        setWakeLockActive(true);
      }
    } catch (err) {
      console.warn('Wake Lock request failed:', err);
    }
  };

  const releaseWakeLock = () => {
    try {
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
        wakeLockRef.current = null;
        setWakeLockActive(false);
      }
    } catch (err) {
      console.warn('Wake Lock release error:', err);
    }
  };

  // Clean up GPS and simulation on unmount
  useEffect(() => {
    return () => {
      geolocationService.stopWatching();
      if (simTimerRef.current) clearInterval(simTimerRef.current);
      releaseWakeLock();
    };
  }, []);

  const sendGpsUpdate = async (lat: number, lng: number, acc = 5, spd = 18, hdg = 0) => {
    try {
      await api.driver.submitLocation({
        latitude: lat,
        longitude: lng,
        accuracy: acc,
        speed: spd,
        heading: hdg,
      });
      setLastSentTime(new Date());
      setTransmissionCount((prev) => prev + 1);
      setErrorMessage(null);
    } catch (err: any) {
      console.error('[Driver] Location submission error:', err);
      setErrorMessage(err?.message || 'Network error sending GPS coordinates.');
    }
  };

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
      setSuccessMessage('GPS live session started. Broadcasting location updates.');
      requestWakeLock();

      // 2. Start HTML5 Mobile Phone Geolocation watch
      let hasRealGps = false;
      const started = geolocationService.startWatching(
        async (coords: GeoCoordinates) => {
          hasRealGps = true;
          // Clear simulation timer if real GPS works
          if (simTimerRef.current) {
            clearInterval(simTimerRef.current);
            simTimerRef.current = null;
          }

          let calculatedHeading = coords.heading ?? headingDeg;
          if (lastCoords) {
            calculatedHeading = calculateHeading(
              lastCoords.latitude,
              lastCoords.longitude,
              coords.latitude,
              coords.longitude
            );
          }
          setHeadingDeg(calculatedHeading);

          const spd = coords.speed ? Math.round(coords.speed * 3.6) : 0;
          setSpeedKmh(spd);
          setLastCoords(coords);

          // Rate limit updates to once every 2.5 seconds
          const now = Date.now();
          if (now - throttleRef.current < 2500) return;
          throttleRef.current = now;

          await sendGpsUpdate(coords.latitude, coords.longitude, coords.accuracy, spd, calculatedHeading);
        },
        (errorStr: string) => {
          console.warn('[Driver] Geolocation warning:', errorStr);
          // Fallback to route waypoint simulation (matching D:\tracking\pages\driver.js)
          if (!hasRealGps && !simTimerRef.current) {
            startFallbackSimulation();
          }
        }
      );

      // If geolocation not supported or delayed, initialize fallback simulation
      setTimeout(() => {
        if (!hasRealGps && !simTimerRef.current && isTracking) {
          startFallbackSimulation();
        }
      }, 3000);

      if (!started) {
        startFallbackSimulation();
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to start tracking session on server.');
      setIsTracking(false);
    }
  };

  const startFallbackSimulation = () => {
    if (simTimerRef.current) return;
    setSuccessMessage('Broadcasting live route waypoints (simulation mode active).');

    simTimerRef.current = setInterval(() => {
      const waypoints = ROUTE_WAYPOINTS[selectedRoute] || ROUTE_WAYPOINTS.A;
      const currentPoint = waypoints[waypointIdxRef.current % waypoints.length];
      waypointIdxRef.current += 1;
      const nextPoint = waypoints[waypointIdxRef.current % waypoints.length];

      // Add tiny jitter
      const nextLat = currentPoint[0] + (Math.random() - 0.5) * 0.0001;
      const nextLng = currentPoint[1] + (Math.random() - 0.5) * 0.0001;
      const heading = calculateHeading(currentPoint[0], currentPoint[1], nextPoint[0], nextPoint[1]);
      const speed = Math.floor(18 + Math.random() * 8);

      setLastCoords({
        latitude: nextLat,
        longitude: nextLng,
        accuracy: 4.2,
        speed: speed / 3.6,
        heading: heading,
        timestamp: Date.now(),
      });
      setHeadingDeg(heading);
      setSpeedKmh(speed);

      sendGpsUpdate(nextLat, nextLng, 4.2, speed, heading);
    }, 3000);
  };

  const handleStopTracking = async () => {
    setErrorMessage(null);
    try {
      geolocationService.stopWatching();
      if (simTimerRef.current) {
        clearInterval(simTimerRef.current);
        simTimerRef.current = null;
      }
      releaseWakeLock();

      const res = await api.driver.stopTracking();
      setIsTracking(false);
      onShuttleUpdated(res.shuttle);
      setSuccessMessage('GPS tracking session stopped successfully.');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to stop tracking on server.');
    }
  };

  const routeColor = selectedRoute === 'B' ? '#2563eb' : selectedRoute === 'C' ? '#eab308' : '#16a34a';

  return (
    <div className="glass-card p-5 sm:p-6 rounded-2xl border border-slate-700/80 shadow-2xl space-y-6">
      {/* Driver Assigned Shuttle Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3.5">
          <div
            className="w-14 h-14 rounded-2xl border flex items-center justify-center font-black text-xl shadow-inner"
            style={{
              backgroundColor: `${routeColor}25`,
              color: routeColor,
              borderColor: `${routeColor}60`,
            }}
          >
            {shuttle ? (shuttle.vehicle_no || shuttle.shuttle_code) : '---'}
          </div>
          <div>
            <span className="text-xs font-bold tracking-wider uppercase" style={{ color: routeColor }}>
              Assigned Vehicle & Route
            </span>
            <h2 className="text-xl font-extrabold text-slate-100">{shuttle ? shuttle.name : 'No Shuttle Assigned'}</h2>
            <p className="text-xs text-slate-400">VIT Vellore Campus Transit Fleet</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {shuttle && <StatusBadge status={isTracking ? 'active' : 'offline'} type="gps" />}
        </div>
      </div>

      {/* Route Selection Tabs */}
      <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-2">
        <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
          <Bus className="w-4 h-4 text-indigo-400" />
          <span>Active Route Selection:</span>
        </span>
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 'A', name: 'Route A (Green)', color: '#16a34a' },
            { id: 'B', name: 'Route B (Blue)', color: '#2563eb' },
            { id: 'C', name: 'Route C (Yellow)', color: '#eab308' },
          ].map((r) => (
            <button
              key={r.id}
              onClick={() => setSelectedRoute(r.id)}
              className={`p-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 border ${
                selectedRoute === r.id
                  ? 'border-white text-white shadow-lg'
                  : 'border-slate-700 bg-slate-800/60 text-slate-400 hover:text-white'
              }`}
              style={{
                backgroundColor: selectedRoute === r.id ? r.color : undefined,
              }}
            >
              <span className="w-2 h-2 rounded-full bg-white" />
              <span>{r.name}</span>
            </button>
          ))}
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
            <span>START LIVE GPS BROADCAST</span>
          </button>
        ) : (
          <button
            onClick={handleStopTracking}
            className="w-full py-4 px-6 rounded-xl font-bold text-base bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white shadow-lg shadow-rose-600/30 transition flex items-center justify-center gap-3 cursor-pointer animate-pulse"
          >
            <Square className="w-6 h-6 fill-current" />
            <span>STOP GPS BROADCAST</span>
          </button>
        )}
      </div>

      {/* Phone GPS Telemetry Display */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-800 space-y-1">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Smartphone className="w-3.5 h-3.5 text-blue-400" />
            <span>Broadcast Status</span>
          </span>
          <p className="font-bold text-slate-100">
            {isTracking ? 'Broadcasting Live' : 'Tracking Idle'}
          </p>
        </div>

        <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-800 space-y-1">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Gauge className="w-3.5 h-3.5 text-emerald-400" />
            <span>Speed</span>
          </span>
          <p className="font-bold font-mono text-slate-100">{speedKmh} km/h</p>
        </div>

        <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-800 space-y-1">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-purple-400" />
            <span>Heading</span>
          </span>
          <p className="font-bold font-mono text-slate-100">{Math.round(headingDeg)}°</p>
        </div>

        <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-800 space-y-1">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-amber-400" />
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
          <span>Accuracy: ±{lastCoords.accuracy ? lastCoords.accuracy.toFixed(1) : '3'}m</span>
          <span>Last Ping: {lastSentTime?.toLocaleTimeString()}</span>
        </div>
      )}

      {/* Driver Guidance */}
      <div className="p-3 rounded-xl bg-slate-800/30 border border-slate-800 text-[11px] text-slate-400 space-y-1 flex items-start gap-2">
        <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <strong className="text-slate-300">Driver Guidance:</strong> Screen Wake Lock is{' '}
          <strong className={wakeLockActive ? 'text-emerald-400' : 'text-slate-400'}>
            {wakeLockActive ? 'Enabled' : 'Auto-standby'}
          </strong>
          . Keep this browser window active to stream continuous GPS coordinates to campus transit maps.
        </div>
      </div>
    </div>
  );
};
