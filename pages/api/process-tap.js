import { getServiceRoleClient, hasSupabase } from '../../lib/supabaseClient';
import { normalizeTx, normalizeUser } from '../../lib/demoData';
import { getLocalDb, saveLocalDb } from '../../lib/serverDb';

const FARE = 15;
const HOTLIST_MS = 10000;

function tapResponse(payload) {
  return {
    ok: true,
    result: payload.result,
    cooldownRemaining: 10,
    tapTime: payload.tapTime,
    userName: payload.userName,
    userRegNo: payload.userRegNo,
    cardUid: payload.cardUid,
    synced: payload.synced || false,
  };
}

function fromRpcRow(data) {
  return tapResponse({
    tapTime: data.tap_time,
    userName: data.user_name,
    userRegNo: data.user_reg_no,
    cardUid: data.card_uid,
    synced: data.synced || false,
    result: data.tx_id ? { id: data.tx_id } : undefined,
  });
}

async function processTapRpc(svc, body, txId) {
  const { card_uid, driver_id, shuttle_id, route, vehicle_no, queue_id, queued_at } = body;
  const rpc = await svc.rpc('sp_process_tap', {
    p_card_uid: card_uid,
    p_driver_id: driver_id || null,
    p_shuttle_id: shuttle_id || null,
    p_route: route || 'A',
    p_vehicle_no: vehicle_no || 'Vehicle',
    p_tx_id: txId,
    p_fare: FARE,
    p_hotlist_ms: HOTLIST_MS,
    p_queue_id: queue_id || null,
    p_queued_at: queued_at || null,
  });

  if (rpc.error) {
    const msg = rpc.error.message || '';
    if (msg.includes('hotlisted')) {
      return { status: 409, error: msg };
    }
    if (msg.includes('not mapped')) return { status: 404, error: 'Card not mapped to any user' };
    return { status: 500, error: msg || 'rpc_error' };
  }

  return { status: 200, data: fromRpcRow(rpc.data) };
}

async function processTapLegacy(svc, body, txId) {
  const { card_uid, driver_id, shuttle_id, route, vehicle_no, queue_id, queued_at } = body;
  const now = Date.now();
  const { data: hot } = await svc.from('hotlist').select('*').eq('card_uid', card_uid).maybeSingle();
  if (hot && now < Number(hot.expires_at)) {
    const remaining = Math.ceil((Number(hot.expires_at) - now) / 1000);
    return { status: 409, error: `Card is hotlisted. Please wait ${remaining} seconds.` };
  }

  const { data: user } = await svc
    .from('users')
    .select('*')
    .eq('card_uid', card_uid)
    .eq('role', 'student')
    .maybeSingle();

  if (!user) return { status: 404, error: 'Card not mapped to any user' };

  const { data: wallet } = await svc.from('wallets').select('balance').eq('user_id', user.id).maybeSingle();
  const currentBalance = Number(wallet?.balance || 0);

  if (currentBalance < FARE) {
    const { data: due } = await svc.from('dues').select('*').eq('user_id', user.id).maybeSingle();
    const currentDue = Number(due?.amount || 0);
    const newDue = currentDue + (FARE - currentBalance);
    await svc.from('dues').upsert({
      user_id: user.id,
      amount: newDue,
      since: due?.since || new Date().toISOString(),
    });
    await svc.from('wallets').upsert({ user_id: user.id, balance: 0 });
  } else {
    await svc.from('wallets').upsert({ user_id: user.id, balance: currentBalance - FARE });
  }

  const createdAt = new Date().toISOString();
  const { data: txRow } = await svc
    .from('transactions')
    .insert({
      id: txId,
      user_id: user.id,
      driver_id: driver_id || null,
      shuttle_id: shuttle_id || null,
      route: route || 'A',
      amount: FARE,
      status: 'success',
      metadata: {
        card_uid,
        vehicle_no: vehicle_no || 'Vehicle',
        route: route || 'A',
        queue_id: queue_id || null,
        queued_at: queued_at || null,
        offline_sync: Boolean(queue_id),
      },
      created_at: createdAt,
    })
    .select('*')
    .single();

  await svc.from('hotlist').upsert({ card_uid, expires_at: now + HOTLIST_MS });

  return {
    status: 200,
    data: tapResponse({
      tapTime: createdAt,
      userName: user.name,
      userRegNo: user.reg_no,
      cardUid: card_uid,
      synced: Boolean(queue_id),
      result: normalizeTx(txRow),
    }),
  };
}

function processTapLocal(body, txId) {
  const { card_uid, driver_id, shuttle_id, route, vehicle_no, queue_id } = body;
  const cleanUid = String(card_uid).trim();
  const now = Date.now();
  const db = getLocalDb();

  // Check hotlist
  if (db.hotlist?.[cleanUid] && now < db.hotlist[cleanUid]) {
    const remaining = Math.ceil((db.hotlist[cleanUid] - now) / 1000);
    return { status: 409, error: `Card is hotlisted. Please wait ${remaining} seconds.` };
  }

  const user = (db.users || []).find((u) => u.cardUid === cleanUid && u.role === 'student');
  if (!user) {
    return { status: 404, error: 'Card not mapped to any user' };
  }

  const balance = Number(db.wallets?.[user.id] || 0);
  if (balance < FARE) {
    const currentDue = Number(db.dues?.[user.id]?.amount || 0);
    db.dues[user.id] = {
      amount: currentDue + (FARE - balance),
      since: db.dues?.[user.id]?.since || new Date().toISOString(),
    };
    db.wallets[user.id] = 0;
  } else {
    db.wallets[user.id] = balance - FARE;
  }

  const createdAt = new Date().toISOString();
  const tx = {
    id: txId,
    userId: user.id,
    driverId: driver_id || null,
    shuttleId: shuttle_id || null,
    route: route || 'A',
    vehicleNo: vehicle_no || 'Vehicle',
    amount: FARE,
    status: 'success',
    cardUid: cleanUid,
    createdAt,
  };

  db.transactions.unshift(tx);
  db.hotlist[cleanUid] = now + HOTLIST_MS;
  saveLocalDb(db);

  return {
    status: 200,
    data: tapResponse({
      tapTime: createdAt,
      userName: user.name,
      userRegNo: user.regNo,
      cardUid: cleanUid,
      synced: Boolean(queue_id),
      result: tx,
    }),
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const body = req.body || {};
  const { card_uid, queue_id } = body;
  if (!card_uid) return res.status(400).json({ error: 'card_uid required' });

  const txId = queue_id
    ? `OFF-${String(queue_id).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 48)}`
    : `TX${Date.now()}`;

  const svc = getServiceRoleClient();
  if (svc && hasSupabase) {
    try {
      let outcome = await processTapRpc(svc, body, txId);
      const missingRpc =
        outcome.status === 500 &&
        (outcome.error?.includes('sp_process_tap') || outcome.error?.includes('Could not find the function'));
      if (missingRpc) {
        outcome = await processTapLegacy(svc, body, txId);
      }

      if (outcome.status === 200) {
        return res.json(outcome.data);
      }
      if (outcome.status !== 500) {
        return res.status(outcome.status).json({ error: outcome.error });
      }
    } catch (e) {
      console.warn('[process-tap] Supabase tap failed, falling back to local DB:', e.message);
    }
  }

  // Local fallback
  const localOutcome = processTapLocal(body, txId);
  if (localOutcome.status !== 200) {
    return res.status(localOutcome.status).json({ error: localOutcome.error });
  }
  return res.json(localOutcome.data);
}
