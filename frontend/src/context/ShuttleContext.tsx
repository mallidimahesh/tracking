import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Shuttle, CampusMeta } from '../types';
import { api } from '../services/api';
import { socketService } from '../services/socket';

export type ShuttleFilter = 'all' | 'active' | 'route-a' | 'route-b' | 'route-c' | 'available' | 'full';

interface ShuttleContextType {
  shuttles: Shuttle[];
  filteredShuttles: Shuttle[];
  campusMeta: CampusMeta | null;
  selectedShuttle: Shuttle | null;
  setSelectedShuttle: (shuttle: Shuttle | null) => void;
  isLoading: boolean;
  isSocketConnected: boolean;
  filter: ShuttleFilter;
  setFilter: (filter: ShuttleFilter) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  refreshFleet: () => Promise<void>;
  triggerDemoStep: () => Promise<void>;
  resetFleet: () => Promise<void>;
}

const ShuttleContext = createContext<ShuttleContextType | undefined>(undefined);

export const ShuttleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [shuttles, setShuttles] = useState<Shuttle[]>([]);
  const [campusMeta, setCampusMeta] = useState<CampusMeta | null>(null);
  const [selectedShuttle, setSelectedShuttle] = useState<Shuttle | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSocketConnected, setIsSocketConnected] = useState<boolean>(false);
  const [filter, setFilter] = useState<ShuttleFilter>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const refreshFleet = useCallback(async () => {
    try {
      const res = await api.shuttles.list();
      setShuttles(res.shuttles);
    } catch (err) {
      console.error('[ShuttleContext] Error loading fleet:', err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    let mounted = true;

    async function initData() {
      setIsLoading(true);
      try {
        const [fleetRes, metaRes] = await Promise.all([
          api.shuttles.list(),
          api.shuttles.getCampusMeta(),
        ]);
        if (mounted) {
          setShuttles(fleetRes.shuttles);
          setCampusMeta(metaRes);
        }
      } catch (err) {
        console.error('[ShuttleContext] Failed to initialize fleet or campus meta:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    initData();

    // Connect WebSocket
    const socket = socketService.connect();

    const handleConnect = () => setIsSocketConnected(true);
    const handleDisconnect = () => setIsSocketConnected(false);

    const handleInitialState = (data: { shuttles: Shuttle[] }) => {
      if (data?.shuttles) setShuttles(data.shuttles);
    };

    const handleLocationUpdate = (payload: any) => {
      setShuttles((prev) =>
        prev.map((s) => {
          if (s.id === payload.shuttle_id || s.shuttle_code === payload.shuttle_code) {
            return {
              ...s,
              latest_latitude: payload.latitude,
              latest_longitude: payload.longitude,
              gps_accuracy: payload.accuracy,
              gps_speed: payload.speed,
              gps_heading: payload.heading,
              last_gps_update: payload.timestamp,
              is_tracking_active: payload.is_tracking_active,
              gps_status: 'active',
              current_passenger_count: payload.occupancy?.count ?? s.current_passenger_count,
              available_seats: payload.occupancy?.available_seats ?? s.available_seats,
              occupancy_percentage: payload.occupancy?.percentage ?? s.occupancy_percentage,
              is_full: payload.occupancy?.is_full ?? s.is_full,
            };
          }
          return s;
        })
      );
    };

    const handleOccupancyUpdate = (payload: any) => {
      setShuttles((prev) =>
        prev.map((s) => {
          if (s.id === payload.shuttle_id || s.shuttle_code === payload.shuttle_code) {
            return {
              ...s,
              current_passenger_count: payload.current_passenger_count,
              capacity: payload.capacity ?? s.capacity,
              available_seats: payload.available_seats,
              occupancy_percentage: payload.occupancy_percentage,
              is_full: payload.is_full,
              sensor_status: payload.sensor_status || 'online',
              last_sensor_heartbeat: payload.last_sensor_heartbeat || new Date().toISOString(),
            };
          }
          return s;
        })
      );
    };

    const handleTrackingStatusChange = (payload: any) => {
      setShuttles((prev) =>
        prev.map((s) => {
          if (s.id === payload.shuttle_id) {
            return {
              ...s,
              is_tracking_active: payload.is_tracking_active,
              gps_status: payload.is_tracking_active ? 'active' : 'offline',
            };
          }
          return s;
        })
      );
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('initial_state', handleInitialState);
    socket.on('fleet_sync', handleInitialState);
    socket.on('shuttle_location_update', handleLocationUpdate);
    socket.on('shuttle_occupancy_update', handleOccupancyUpdate);
    socket.on('tracking_status_change', handleTrackingStatusChange);

    // Heartbeat polling fallback every 8 seconds in case WebSocket drops
    const pollInterval = setInterval(() => {
      if (!socket.connected) {
        refreshFleet();
      }
    }, 8000);

    return () => {
      mounted = false;
      clearInterval(pollInterval);
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('initial_state', handleInitialState);
      socket.off('fleet_sync', handleInitialState);
      socket.off('shuttle_location_update', handleLocationUpdate);
      socket.off('shuttle_occupancy_update', handleOccupancyUpdate);
      socket.off('tracking_status_change', handleTrackingStatusChange);
    };
  }, [refreshFleet]);

  // Keep selectedShuttle updated when shuttle state changes
  useEffect(() => {
    if (selectedShuttle) {
      const updated = shuttles.find((s) => s.id === selectedShuttle.id);
      if (updated) setSelectedShuttle(updated);
    }
  }, [shuttles, selectedShuttle?.id]);

  const triggerDemoStep = async () => {
    try {
      await api.demo.step();
      await refreshFleet();
    } catch (err) {
      console.error('[ShuttleContext] Demo step failed:', err);
    }
  };

  const resetFleet = async () => {
    try {
      await api.demo.reset();
      await refreshFleet();
    } catch (err) {
      console.error('[ShuttleContext] Reset fleet failed:', err);
    }
  };

  // Filtered shuttles computed property
  const filteredShuttles = shuttles.filter((shuttle) => {
    // Search query check (code, vehicle_no, or name)
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      searchQuery === '' ||
      shuttle.shuttle_code.toLowerCase().includes(q) ||
      (shuttle.vehicle_no && shuttle.vehicle_no.toLowerCase().includes(q)) ||
      shuttle.name.toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (filter === 'active') return shuttle.is_tracking_active || shuttle.gps_status === 'active';
    if (filter === 'route-a') return (shuttle.route || 'A').toUpperCase() === 'A';
    if (filter === 'route-b') return (shuttle.route || '').toUpperCase() === 'B';
    if (filter === 'route-c') return (shuttle.route || '').toUpperCase() === 'C';
    return true;
  });

  return (
    <ShuttleContext.Provider
      value={{
        shuttles,
        filteredShuttles,
        campusMeta,
        selectedShuttle,
        setSelectedShuttle,
        isLoading,
        isSocketConnected,
        filter,
        setFilter,
        searchQuery,
        setSearchQuery,
        refreshFleet,
        triggerDemoStep,
        resetFleet,
      }}
    >
      {children}
    </ShuttleContext.Provider>
  );
};

export const useShuttles = () => {
  const context = useContext(ShuttleContext);
  if (!context) throw new Error('useShuttles must be used within ShuttleProvider');
  return context;
};
