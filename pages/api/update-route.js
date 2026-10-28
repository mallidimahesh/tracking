import { getServiceRoleClient, hasSupabase } from '../../lib/supabaseClient';
import { getLocalDb, saveLocalDb } from '../../lib/serverDb';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { shuttle_id, route, status, lat, lng, vehicle_number, heading } = req.body || {};
  if (!shuttle_id) return res.status(400).json({ error: 'shuttle_id required' });

  const svc = getServiceRoleClient();
  if (svc && hasSupabase) {
    try {
      const patch = {};
      if (route) patch.route = route;
      if (status) patch.status = status;
      if (vehicle_number) patch.vehicle_no = vehicle_number;
      if (heading !== undefined) patch.heading = Number(heading);
      if (lat != null && lng != null) {
        patch.lat = Number(lat);
        patch.lng = Number(lng);
        patch.last_seen = new Date().toISOString();
      }

      if (Object.keys(patch).length > 0) {
        const { error } = await svc.from('shuttles').update(patch).eq('id', shuttle_id);
        if (!error) return res.json({ ok: true });
      }
    } catch (e) {
      console.warn('[update-route] Supabase update failed, falling back to local DB:', e.message);
    }
  }

  // Local fallback
  const db = getLocalDb();
  const shuttle = (db.shuttles || []).find((s) => s.id === shuttle_id || s.driverId === shuttle_id);
  if (shuttle) {
    if (route) shuttle.route = route;
    if (status) shuttle.status = status;
    if (vehicle_number) shuttle.vehicleNo = vehicle_number;
    if (heading !== undefined) shuttle.heading = Number(heading);
    if (lat != null && lng != null) {
      shuttle.lat = Number(lat);
      shuttle.lng = Number(lng);
      shuttle.lastSeen = new Date().toISOString();
    }
    saveLocalDb(db);
  }

  return res.json({ ok: true });
}
