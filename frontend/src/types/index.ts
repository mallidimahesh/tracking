export type UserRole = 'student' | 'outsider' | 'driver' | 'admin';

export interface DriverProfile {
  id: number;
  user_id: number;
  driver_license_no?: string;
  phone_number?: string;
  assigned_shuttle_id?: number | null;
  assigned_shuttle_code?: string | null;
  is_on_duty: boolean;
}

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  is_email_verified: boolean;
  is_active: boolean;
  driver_profile?: DriverProfile;
}

export interface Shuttle {
  id: number;
  shuttle_code: string; // 'SH-01' to 'SH-06'
  name: string;
  route?: string;
  route_name?: string;
  route_color?: string;
  vehicle_no?: string;
  capacity?: number;
  current_passenger_count?: number;
  available_seats?: number;
  occupancy_percentage?: number;
  is_full?: boolean;
  is_tracking_active: boolean;
  latest_latitude?: number | null;
  latest_longitude?: number | null;
  gps_accuracy?: number | null;
  gps_speed?: number | null;
  gps_heading?: number | null;
  last_gps_update?: string | null;
  gps_status: 'active' | 'stale' | 'offline';
  last_sensor_heartbeat?: string | null;
  sensor_status?: 'online' | 'stale' | 'offline' | 'error';
  driver?: {
    id: number;
    name: string;
    phone?: string;
    is_on_duty: boolean;
  };
  driver_assigned?: boolean;
}

export interface Landmark {
  name: string;
  lat: number;
  lng: number;
}

export interface CampusRoute {
  id: string;
  name: string;
  color: string;
  waypoints: [number, number][];
}

export interface CampusMeta {
  campus_name: string;
  center: {
    lat: number;
    lng: number;
    zoom: number;
    name?: string;
  };
  bounds: {
    min_lat: number;
    max_lat: number;
    min_lng: number;
    max_lng: number;
  };
  polygon: [number, number][];
  landmarks: Landmark[];
  routes?: Record<string, CampusRoute>;
}

export interface LocationTrailPoint {
  id: number;
  latitude: number;
  longitude: number;
  speed?: number;
  timestamp: string;
}

export interface OccupancyHistoryEvent {
  id: number;
  event_type: 'entry' | 'exit' | 'sync' | 'manual_correction';
  delta: number;
  count_after: number;
  timestamp: string;
}

export interface ShuttleDetail extends Shuttle {
  location_trail?: LocationTrailPoint[];
  recent_events?: OccupancyHistoryEvent[];
}
