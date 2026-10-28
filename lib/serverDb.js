import fs from 'fs';
import path from 'path';
import { supabase } from './supabase';
import { getServiceRoleClient, hasSupabase } from './supabaseClient';
import { normalizeShuttle, normalizeTx, normalizeUser } from './demoData';

const DB_FILE = path.join(process.cwd(), 'lib', 'db_state.json');

const INITIAL_DEFAULT_STATE = {
  users: [
    {
      id: 'adm-001',
      role: 'admin',
      name: 'Campus Admin',
      regNo: 'ADMIN',
      email: 'admin@campus.shuttle',
      password: 'admin123',
      needsPasswordReset: false,
    },
    {
      id: 'drv-001',
      role: 'driver',
      name: 'Driver 1',
      regNo: 'DRV01',
      email: 'drv01@campus.shuttle',
      password: 'driver123',
      needsPasswordReset: false,
    },
    {
      id: 'drv-002',
      role: 'driver',
      name: 'Driver 2',
      regNo: 'DRV02',
      email: 'drv02@campus.shuttle',
      password: 'driver123',
      needsPasswordReset: false,
    },
  ],
  wallets: {
    'adm-001': 0,
    'drv-001': 0,
    'drv-002': 0,
  },
  dues: {},
  shuttles: [
    {
      id: 'bus-001',
      vehicleNo: 'VIT-A-101',
      driverId: 'drv-001',
      route: 'A',
      status: 'running',
      lat: 12.9729,
      lng: 79.1586,
      heading: 0,
      lastSeen: new Date().toISOString(),
    },
    {
      id: 'bus-002',
      vehicleNo: 'VIT-B-202',
      driverId: 'drv-002',
      route: 'B',
      status: 'running',
      lat: 12.9724,
      lng: 79.1552,
      heading: 0,
      lastSeen: new Date().toISOString(),
    },
  ],
  transactions: [],
  alerts: [],
  hotlist: {},
  cards: {},
};

export function getLocalDb() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf8');
      const parsed = JSON.parse(data);
      if (!parsed.cards && parsed.users) {
        parsed.cards = parsed.users.reduce((acc, u) => {
          if (u.cardUid) acc[u.cardUid] = u.id;
          return acc;
        }, {});
      }
      return parsed;
    }
  } catch (err) {
    console.error('[serverDb] Error reading db_state.json:', err);
  }
  return JSON.parse(JSON.stringify(INITIAL_DEFAULT_STATE));
}

export function saveLocalDb(state) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), 'utf8');
    return state;
  } catch (err) {
    console.error('[serverDb] Error saving db_state.json:', err);
    return state;
  }
}

function dbClient() {
  return getServiceRoleClient() || (hasSupabase ? supabase : null);
}

export async function getServerState() {
  const db = dbClient();

  if (!db || !hasSupabase) {
    const local = getLocalDb();
    const normalizedUsers = (local.users || []).map(normalizeUser);
    return {
      users: normalizedUsers,
      wallets: local.wallets || {},
      dues: local.dues || {},
      shuttles: (local.shuttles || []).map(normalizeShuttle),
      hotlist: local.hotlist || {},
      transactions: (local.transactions || []).map(normalizeTx),
      alerts: local.alerts || [],
      cards: normalizedUsers.reduce((acc, u) => {
        if (u.cardUid) acc[u.cardUid] = u.id;
        return acc;
      }, {}),
    };
  }

  try {
    console.log('[Supabase] Fetching global server state from cloud tables...');
    const [
      { data: users, error: usersErr },
      { data: wallets, error: walletsErr },
      { data: dues, error: duesErr },
      { data: shuttles, error: shuttlesErr },
      { data: hotlist, error: hotlistErr },
      { data: transactions, error: txErr },
      { data: alerts, error: alertsErr },
    ] = await Promise.all([
      db.from('users').select('*'),
      db.from('wallets').select('*'),
      db.from('dues').select('*'),
      db.from('shuttles').select('*'),
      db.from('hotlist').select('*'),
      db.from('transactions').select('*').order('created_at', { ascending: false }).limit(500),
      db.from('alerts').select('*').order('created_at', { ascending: false }),
    ]);

    if (usersErr || walletsErr || duesErr || shuttlesErr || hotlistErr || txErr || alertsErr) {
      console.error('[Supabase] Fetch error details:', {
        usersErr,
        walletsErr,
        duesErr,
        shuttlesErr,
        hotlistErr,
        txErr,
        alertsErr,
      });
      // Fallback to local DB on error
      return getServerStateFallback();
    }

    const normalizedUsers = (users || []).map(normalizeUser);

    return {
      users: normalizedUsers,
      wallets: (wallets || []).reduce(
        (acc, curr) => ({ ...acc, [curr.user_id]: Number(curr.balance) }),
        {}
      ),
      dues: (dues || []).reduce(
        (acc, curr) => ({
          ...acc,
          [curr.user_id]: { amount: Number(curr.amount), since: curr.since },
        }),
        {}
      ),
      shuttles: (shuttles || []).map(normalizeShuttle),
      hotlist: (hotlist || []).reduce(
        (acc, curr) => ({ ...acc, [curr.card_uid]: curr.expires_at }),
        {}
      ),
      transactions: (transactions || []).map(normalizeTx),
      alerts: (alerts || []).map((a) => ({
        id: a.id,
        text: a.text,
        audience: a.audience,
        expiresAt: a.expires_at,
        createdAt: a.created_at,
      })),
      cards: normalizedUsers.reduce((acc, u) => {
        if (u.cardUid) acc[u.cardUid] = u.id;
        return acc;
      }, {}),
    };
  } catch (e) {
    console.error('Error fetching from Supabase, falling back to local DB:', e);
    return getServerStateFallback();
  }
}

function getServerStateFallback() {
  const local = getLocalDb();
  const normalizedUsers = (local.users || []).map(normalizeUser);
  return {
    users: normalizedUsers,
    wallets: local.wallets || {},
    dues: local.dues || {},
    shuttles: (local.shuttles || []).map(normalizeShuttle),
    hotlist: local.hotlist || {},
    transactions: (local.transactions || []).map(normalizeTx),
    alerts: local.alerts || [],
    cards: normalizedUsers.reduce((acc, u) => {
      if (u.cardUid) acc[u.cardUid] = u.id;
      return acc;
    }, {}),
  };
}

export function saveServerState(state) {
  return saveLocalDb(state);
}

export async function clearDummyData() {
  const local = getLocalDb();
  local.users = (local.users || []).filter((u) => u.role === 'admin' || u.role === 'driver');
  local.transactions = [];
  local.alerts = [];
  saveLocalDb(local);
  return getServerState();
}
