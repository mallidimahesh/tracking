import { Shuttle, ShuttleDetail, CampusMeta, User } from '../types';

const API_BASE = '/api';

export class ApiError extends Error {
  status: number;
  data: any;
  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('vit_shuttle_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await response.json() : null;

  if (!response.ok) {
    const errorMsg = data?.error || data?.message || `HTTP Error ${response.status}`;
    throw new ApiError(errorMsg, response.status, data);
  }

  return data as T;
}

export const api = {
  // Authentication
  auth: {
    login: (credentials: { email: string; password: string }) =>
      request<{ token: string; user: User }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      }),

    registerStudent: (data: { email: string; full_name: string; password: string }) =>
      request<{ message: string; email: string; verification_token?: string }>('/auth/register-student', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    registerOutsider: (data: { email: string; full_name: string; password: string }) =>
      request<{ message: string; email: string; verification_token?: string }>('/auth/register-outsider', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    verifyEmail: (data: { email?: string; token: string }) =>
      request<{ message: string; email: string; role: string }>('/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    getMe: () => request<{ user: User }>('/auth/me'),

    resendVerification: (email: string) =>
      request<{ message: string; verification_token?: string }>('/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email }),
      }),
  },

  // Shuttles
  shuttles: {
    list: () => request<{ shuttles: Shuttle[]; count: number; active_count: number }>('/shuttles'),
    getDetails: (id: number) => request<ShuttleDetail>(`/shuttles/${id}`),
    getCampusMeta: () => request<CampusMeta>('/shuttles/campus-meta'),
  },

  // Driver Controls
  driver: {
    getMyShuttle: () => request<{ shuttle: Shuttle | null; is_on_duty: boolean }>('/driver/my-shuttle'),
    startTracking: () => request<{ message: string; shuttle: Shuttle }>('/driver/tracking/start', { method: 'POST' }),
    stopTracking: () => request<{ message: string; shuttle: Shuttle }>('/driver/tracking/stop', { method: 'POST' }),
    submitLocation: (coords: {
      latitude: number;
      longitude: number;
      accuracy?: number;
      speed?: number;
      heading?: number;
    }) =>
      request<{ message: string; location: any }>('/driver/tracking/location', {
        method: 'POST',
        body: JSON.stringify(coords),
      }),
  },

  // Administrator Controls
  admin: {
    getDrivers: () => request<{ drivers: User[] }>('/admin/drivers'),
    createDriver: (payload: {
      email: string;
      full_name: string;
      password: string;
      driver_license_no?: string;
      phone_number?: string;
      assigned_shuttle_code?: string;
    }) =>
      request<{ message: string; driver: User }>('/admin/drivers', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    assignShuttle: (driver_id: number, shuttle_code: string) =>
      request<{ message: string; shuttle: Shuttle }>('/admin/assign-shuttle', {
        method: 'POST',
        body: JSON.stringify({ driver_id, shuttle_code }),
      }),
    correctCount: (shuttle_id: number, new_count: number, reason: string) =>
      request<{ message: string; shuttle: any }>(`/admin/shuttles/${shuttle_id}/correct-count`, {
        method: 'POST',
        body: JSON.stringify({ new_count, reason }),
      }),
    getAuditLogs: (limit = 50) => request<{ logs: any[] }>(`/admin/audit-logs?limit=${limit}`),
  },

  // Demo Simulation Controls
  demo: {
    step: () => request<{ status: string; shuttles: Shuttle[] }>('/demo/step-simulation', { method: 'POST' }),
    reset: () => request<{ message: string }>('/demo/reset-shuttles', { method: 'POST' }),
  },
};
