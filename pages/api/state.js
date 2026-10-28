import { getServerState, clearDummyData, getLocalDb, saveLocalDb } from '../../lib/serverDb';
import { getServiceRoleClient, hasSupabase } from '../../lib/supabaseClient';
import { defaultPassword, getFine, normalizeUser, routeStartLatLng } from '../../lib/demoData';

function campusEmail(regNo) {
  return `${String(regNo).trim().toLowerCase()}@campus.shuttle`;
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const db = await getServerState();
    return res.json(db);
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, ...payload } = req.body || {};
  const svc = getServiceRoleClient();

  // If Supabase is configured, use Supabase handlers
  if (svc && hasSupabase) {
    try {
      switch (action) {
        case 'get_state': {
          const db = await getServerState();
          return res.json(db);
        }
        case 'add_money':
          return handleAddMoney(svc, payload, res);
        case 'withdraw':
          return handleWithdraw(svc, payload, res);
        case 'add_student':
          return handleAddStudent(svc, payload, res);
        case 'add_driver':
          return handleAddDriver(svc, payload, res);
        case 'delete_user':
          return handleDeleteUser(svc, payload, res);
        case 'reset_password':
          return handleResetPassword(svc, payload, res);
        case 'revert_password':
          return handleRevertPassword(svc, payload, res);
        case 'map_nfc':
          return handleMapNfc(svc, payload, res);
        case 'update_student':
          return handleUpdateStudent(svc, payload, res);
        case 'update_driver':
          return handleUpdateDriver(svc, payload, res);
        case 'send_alert':
          return handleSendAlert(svc, payload, res);
        case 'delete_alert':
          return handleDeleteAlert(svc, payload, res);
        case 'clear_dummy': {
          const db = await clearDummyData();
          return res.json(db);
        }
        default:
          return res.status(400).json({ error: `Unknown action: ${action || '(missing)'}` });
      }
    } catch (error) {
      console.warn('[state API] Supabase action failed, falling back to local handler:', error.message);
    }
  }

  // Local database handler fallback
  try {
    switch (action) {
      case 'get_state': {
        const db = await getServerState();
        return res.json(db);
      }
      case 'add_money':
        return localAddMoney(payload, res);
      case 'withdraw':
        return localWithdraw(payload, res);
      case 'add_student':
        return localAddStudent(payload, res);
      case 'add_driver':
        return localAddDriver(payload, res);
      case 'delete_user':
        return localDeleteUser(payload, res);
      case 'reset_password':
        return localResetPassword(payload, res);
      case 'revert_password':
        return localRevertPassword(payload, res);
      case 'map_nfc':
        return localMapNfc(payload, res);
      case 'update_student':
        return localUpdateStudent(payload, res);
      case 'update_driver':
        return localUpdateDriver(payload, res);
      case 'send_alert':
        return localSendAlert(payload, res);
      case 'delete_alert':
        return localDeleteAlert(payload, res);
      case 'clear_dummy': {
        const db = await clearDummyData();
        return res.json(db);
      }
      default:
        return res.status(400).json({ error: `Unknown action: ${action || '(missing)'}` });
    }
  } catch (error) {
    console.error('[state API local error]', action, error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
}

/* ==========================================================================
   LOCAL DB HANDLERS (Works offline without Supabase)
   ========================================================================== */

function localAddMoney({ userId, amount }, res) {
  const numAmount = Number(amount);
  if (!userId || !numAmount || numAmount <= 0) {
    return res.status(400).json({ error: 'Valid User ID and Amount are required' });
  }

  const db = getLocalDb();
  let toWallet = numAmount;

  if (db.dues?.[userId]?.amount > 0) {
    const due = db.dues[userId];
    const fine = getFine(due.since);
    const totalDebt = Number(due.amount) + fine;
    if (numAmount >= totalDebt) {
      toWallet = numAmount - totalDebt;
      delete db.dues[userId];
    } else {
      db.dues[userId].amount = totalDebt - numAmount;
      toWallet = 0;
    }
  }

  db.wallets[userId] = Number(db.wallets[userId] || 0) + toWallet;
  saveLocalDb(db);
  return res.status(200).json({ success: true, wallet: db.wallets[userId] });
}

function localWithdraw({ userId, amount }, res) {
  const numAmount = Number(amount);
  if (!userId || !numAmount || numAmount <= 0) {
    return res.status(400).json({ error: 'Valid User ID and Amount are required' });
  }

  const db = getLocalDb();
  if (!db.wallets?.[userId] || Number(db.wallets[userId]) < numAmount) {
    return res.status(400).json({ error: 'Insufficient balance' });
  }

  db.wallets[userId] = Number(db.wallets[userId]) - numAmount;
  saveLocalDb(db);
  return res.status(200).json({ success: true, wallet: db.wallets[userId] });
}

function localAddStudent({ name, regNo, cardUid, passoutYear }, res) {
  if (!name || !regNo) {
    return res.status(400).json({ error: 'Name and Registration Number are required' });
  }

  const db = getLocalDb();
  const trimmedReg = String(regNo).trim().toUpperCase();

  if (db.users.some((u) => String(u.regNo || '').toUpperCase() === trimmedReg)) {
    return res.status(400).json({ error: 'Student already exists with this Reg No' });
  }

  const cleanUid = cardUid ? String(cardUid).trim() : null;
  if (cleanUid && db.users.some((u) => u.cardUid === cleanUid)) {
    return res.status(400).json({ error: 'Card UID is already assigned to another user' });
  }

  const newStudent = {
    id: `stu-${Date.now()}`,
    name: String(name).trim(),
    role: 'student',
    regNo: trimmedReg,
    email: campusEmail(trimmedReg),
    cardUid: cleanUid,
    passoutYear: Number(passoutYear) || new Date().getFullYear() + 4,
    password: defaultPassword(trimmedReg),
    needsPasswordReset: true,
    createdAt: new Date().toISOString(),
  };

  db.users.push(newStudent);
  db.wallets[newStudent.id] = 0;
  if (cleanUid) {
    db.cards[cleanUid] = newStudent.id;
  }

  saveLocalDb(db);
  return res.json({ success: true, user: normalizeUser(newStudent) });
}

function localAddDriver({ name, regNo, vehicleNo, route }, res) {
  if (!name || !regNo || !vehicleNo) {
    return res.status(400).json({ error: 'Name, Driver ID, and Vehicle Number are required' });
  }

  const db = getLocalDb();
  const trimmedReg = String(regNo).trim().toUpperCase();

  if (db.users.some((u) => String(u.regNo || '').toUpperCase() === trimmedReg)) {
    return res.status(400).json({ error: 'Driver already exists with this ID' });
  }

  const start = routeStartLatLng(route || 'A');
  const newDriver = {
    id: `drv-${Date.now()}`,
    name: String(name).trim(),
    role: 'driver',
    regNo: trimmedReg,
    email: campusEmail(trimmedReg),
    cardUid: trimmedReg,
    password: defaultPassword(trimmedReg),
    needsPasswordReset: false,
    createdAt: new Date().toISOString(),
  };

  const newShuttle = {
    id: `bus-${Date.now()}`,
    vehicleNo: String(vehicleNo).trim(),
    driverId: newDriver.id,
    route: route || 'A',
    status: 'running',
    lat: start.lat,
    lng: start.lng,
    heading: 0,
    lastSeen: new Date().toISOString(),
  };

  db.users.push(newDriver);
  db.wallets[newDriver.id] = 0;
  db.shuttles.push(newShuttle);

  saveLocalDb(db);
  return res.json({ success: true, user: normalizeUser(newDriver) });
}

function localDeleteUser({ userId }, res) {
  if (!userId) return res.status(400).json({ error: 'User ID is required' });
  const db = getLocalDb();
  db.users = (db.users || []).filter((u) => u.id !== userId);
  delete db.wallets?.[userId];
  delete db.dues?.[userId];
  for (const [card, uid] of Object.entries(db.cards || {})) {
    if (uid === userId) delete db.cards[card];
  }
  db.shuttles = (db.shuttles || []).filter((s) => s.driverId !== userId);
  saveLocalDb(db);
  return res.json({ success: true });
}

function localResetPassword({ userId, newPassword }, res) {
  if (!userId || !newPassword) {
    return res.status(400).json({ error: 'User ID and new password are required' });
  }
  if (String(newPassword).length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const db = getLocalDb();
  const user = (db.users || []).find((u) => u.id === userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  user.password = newPassword;
  user.needsPasswordReset = false;
  saveLocalDb(db);
  return res.json({ success: true, user: normalizeUser(user) });
}

function localRevertPassword({ userId }, res) {
  if (!userId) return res.status(400).json({ error: 'User ID is required' });
  const db = getLocalDb();
  const user = (db.users || []).find((u) => u.id === userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  user.password = defaultPassword(user.regNo);
  user.needsPasswordReset = true;
  saveLocalDb(db);
  return res.json({ success: true, user: normalizeUser(user) });
}

function localMapNfc({ userId, cardUid }, res) {
  if (!userId || !cardUid) {
    return res.status(400).json({ error: 'User ID and Card UID are required' });
  }

  const db = getLocalDb();
  const cleanUid = String(cardUid).trim();
  const user = (db.users || []).find((u) => u.id === userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const existingOther = (db.users || []).find((u) => u.cardUid === cleanUid && u.id !== userId);
  if (existingOther) {
    return res.status(400).json({ error: 'Card UID is already mapped to another user' });
  }

  // Remove old card mapping if any
  for (const [card, uid] of Object.entries(db.cards || {})) {
    if (uid === userId) delete db.cards[card];
  }

  user.cardUid = cleanUid;
  db.cards[cleanUid] = userId;
  saveLocalDb(db);
  return res.json({ success: true, user: normalizeUser(user) });
}

function localUpdateStudent({ userId, name, regNo, cardUid, passoutYear }, res) {
  if (!userId || !name || !regNo) {
    return res.status(400).json({ error: 'User ID, name, and registration number are required' });
  }

  const db = getLocalDb();
  const user = (db.users || []).find((u) => u.id === userId);
  if (!user) return res.status(404).json({ error: 'Student not found' });

  const trimmedReg = String(regNo).trim().toUpperCase();
  const regConflict = (db.users || []).find(
    (u) => String(u.regNo || '').toUpperCase() === trimmedReg && u.id !== userId
  );
  if (regConflict) return res.status(400).json({ error: 'Registration number already in use' });

  const cleanUid = cardUid ? String(cardUid).trim() : null;
  if (cleanUid) {
    const cardConflict = (db.users || []).find(
      (u) => u.cardUid === cleanUid && u.id !== userId
    );
    if (cardConflict) return res.status(400).json({ error: 'Card UID already assigned to another user' });
    user.cardUid = cleanUid;
    db.cards[cleanUid] = userId;
  }

  user.name = String(name).trim();
  user.regNo = trimmedReg;
  user.email = campusEmail(trimmedReg);
  if (passoutYear) user.passoutYear = Number(passoutYear);

  saveLocalDb(db);
  return res.json({ success: true, user: normalizeUser(user) });
}

function localUpdateDriver({ userId, name, regNo, vehicleNo, route }, res) {
  if (!userId || !name || !regNo) {
    return res.status(400).json({ error: 'User ID, name, and driver ID are required' });
  }

  const db = getLocalDb();
  const user = (db.users || []).find((u) => u.id === userId);
  if (!user) return res.status(404).json({ error: 'Driver not found' });

  const trimmedReg = String(regNo).trim().toUpperCase();
  const regConflict = (db.users || []).find(
    (u) => String(u.regNo || '').toUpperCase() === trimmedReg && u.id !== userId
  );
  if (regConflict) return res.status(400).json({ error: 'Driver ID already in use' });

  user.name = String(name).trim();
  user.regNo = trimmedReg;
  user.email = campusEmail(trimmedReg);

  if (vehicleNo || route) {
    const shuttle = (db.shuttles || []).find((s) => s.driverId === userId);
    if (shuttle) {
      if (vehicleNo) shuttle.vehicleNo = String(vehicleNo).trim();
      if (route) shuttle.route = route;
    }
  }

  saveLocalDb(db);
  return res.json({ success: true, user: normalizeUser(user) });
}

function localSendAlert({ text, audience, expiresAt }, res) {
  if (!text || !expiresAt) {
    return res.status(400).json({ error: 'Text and expiry date are required' });
  }

  const db = getLocalDb();
  const alert = {
    id: `alert-${Date.now()}`,
    text: String(text).trim(),
    audience: audience || 'all',
    expiresAt: new Date(expiresAt).toISOString(),
    createdAt: new Date().toISOString(),
  };

  db.alerts.unshift(alert);
  saveLocalDb(db);
  return res.json({ success: true, alert });
}

function localDeleteAlert({ alertId }, res) {
  if (!alertId) return res.status(400).json({ error: 'Alert ID is required' });
  const db = getLocalDb();
  db.alerts = (db.alerts || []).filter((a) => a.id !== alertId);
  saveLocalDb(db);
  return res.json({ success: true });
}

/* ==========================================================================
   SUPABASE HANDLERS (When live Supabase is connected)
   ========================================================================== */

async function handleAddMoney(svc, { userId, amount }, res) {
  const numAmount = Number(amount);
  if (!userId || !numAmount || numAmount <= 0) {
    return res.status(400).json({ error: 'Valid User ID and Amount are required' });
  }

  const { data: due } = await svc.from('dues').select('*').eq('user_id', userId).maybeSingle();
  let toWallet = numAmount;

  if (due && due.amount > 0) {
    const fine = getFine(due.since);
    const totalDebt = Number(due.amount) + fine;
    if (numAmount >= totalDebt) {
      toWallet = numAmount - totalDebt;
      await svc.from('dues').delete().eq('user_id', userId);
    } else {
      await svc
        .from('dues')
        .update({ amount: totalDebt - numAmount })
        .eq('user_id', userId);
      toWallet = 0;
    }
  }

  const { data: wallet } = await svc.from('wallets').select('balance').eq('user_id', userId).maybeSingle();
  const newBalance = Number(wallet?.balance || 0) + toWallet;
  await svc.from('wallets').upsert({ user_id: userId, balance: newBalance });
  return res.status(200).json({ success: true, wallet: newBalance });
}

async function handleWithdraw(svc, { userId, amount }, res) {
  const numAmount = Number(amount);
  if (!userId || !numAmount || numAmount <= 0) {
    return res.status(400).json({ error: 'Valid User ID and Amount are required' });
  }

  const { data: wallet } = await svc.from('wallets').select('balance').eq('user_id', userId).maybeSingle();
  if (!wallet || Number(wallet.balance) < numAmount) {
    return res.status(400).json({ error: 'Insufficient balance' });
  }

  const newBalance = Number(wallet.balance) - numAmount;
  await svc.from('wallets').update({ balance: newBalance }).eq('user_id', userId);
  return res.status(200).json({ success: true, wallet: newBalance });
}

async function handleAddStudent(svc, { name, regNo, cardUid, passoutYear }, res) {
  if (!name || !regNo) {
    return res.status(400).json({ error: 'Name and Registration Number are required' });
  }

  const { data: existing } = await svc.from('users').select('id').eq('reg_no', regNo).maybeSingle();
  if (existing) {
    return res.status(400).json({ error: 'Student already exists with this Reg No' });
  }

  const password = defaultPassword(regNo);
  const { data: auth, error: authErr } = await svc.auth.admin.createUser({
    email: campusEmail(regNo),
    password,
    email_confirm: true,
  });
  if (authErr || !auth.user) {
    return res.status(400).json({ error: authErr?.message || 'Failed to create auth user' });
  }

  const { error: profileErr } = await svc.from('users').insert({
    id: auth.user.id,
    name,
    role: 'student',
    reg_no: regNo,
    card_uid: cardUid || null,
    passout_year: Number(passoutYear) || new Date().getFullYear() + 4,
    needs_password_reset: true,
  });
  if (profileErr) {
    await svc.auth.admin.deleteUser(auth.user.id);
    return res.status(400).json({ error: profileErr.message });
  }

  return res.json({ success: true, user: normalizeUser({ id: auth.user.id, name, role: 'student', reg_no: regNo, card_uid: cardUid, needs_password_reset: true, passout_year: passoutYear }) });
}

async function handleAddDriver(svc, { name, regNo, vehicleNo, route }, res) {
  if (!name || !regNo || !vehicleNo) {
    return res.status(400).json({ error: 'Name, Driver ID, and Vehicle Number are required' });
  }

  const { data: existing } = await svc.from('users').select('id').eq('reg_no', regNo).maybeSingle();
  if (existing) {
    return res.status(400).json({ error: 'Driver already exists with this ID' });
  }

  const password = defaultPassword(regNo);
  const { data: auth, error: authErr } = await svc.auth.admin.createUser({
    email: campusEmail(regNo),
    password,
    email_confirm: true,
  });
  if (authErr || !auth.user) {
    return res.status(400).json({ error: authErr?.message || 'Failed to create auth user' });
  }

  const driverId = auth.user.id;
  const { error: profileErr } = await svc.from('users').insert({
    id: driverId,
    name,
    role: 'driver',
    reg_no: regNo,
    card_uid: regNo,
    needs_password_reset: false,
  });
  if (profileErr) {
    await svc.auth.admin.deleteUser(driverId);
    return res.status(400).json({ error: profileErr.message });
  }

  const shuttleId = `bus-${Date.now()}`;
  const start = routeStartLatLng(route || 'A');
  await svc.from('shuttles').insert({
    id: shuttleId,
    vehicle_no: vehicleNo,
    driver_id: driverId,
    route: route || 'A',
    status: 'running',
    lat: start.lat,
    lng: start.lng,
    heading: 0,
  });

  return res.json({
    success: true,
    user: normalizeUser({ id: driverId, name, role: 'driver', reg_no: regNo, card_uid: regNo, needs_password_reset: false }),
  });
}

async function handleDeleteUser(svc, { userId }, res) {
  if (!userId) return res.status(400).json({ error: 'User ID is required' });
  await svc.auth.admin.deleteUser(userId);
  return res.json({ success: true });
}

async function handleResetPassword(svc, { userId, newPassword }, res) {
  if (!userId || !newPassword) {
    return res.status(400).json({ error: 'User ID and new password are required' });
  }
  if (String(newPassword).length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const { error: authErr } = await svc.auth.admin.updateUserById(userId, { password: newPassword });
  if (authErr) return res.status(400).json({ error: authErr.message });

  const { data: profile } = await svc
    .from('users')
    .update({ needs_password_reset: false })
    .eq('id', userId)
    .select('*')
    .single();

  return res.json({ success: true, user: normalizeUser(profile) });
}

async function handleRevertPassword(svc, { userId }, res) {
  if (!userId) return res.status(400).json({ error: 'User ID is required' });

  const { data: profile, error } = await svc.from('users').select('*').eq('id', userId).single();
  if (error || !profile) return res.status(404).json({ error: 'User not found' });

  const password = defaultPassword(profile.reg_no);
  const { error: authErr } = await svc.auth.admin.updateUserById(userId, { password });
  if (authErr) return res.status(400).json({ error: authErr.message });

  const { data: updated } = await svc
    .from('users')
    .update({ needs_password_reset: true })
    .eq('id', userId)
    .select('*')
    .single();

  return res.json({ success: true, user: normalizeUser(updated) });
}

async function handleMapNfc(svc, { userId, cardUid }, res) {
  if (!userId || !cardUid) {
    return res.status(400).json({ error: 'User ID and Card UID are required' });
  }
  const { error } = await svc.from('users').update({ card_uid: String(cardUid).trim() }).eq('id', userId);
  if (error) return res.status(400).json({ error: error.message });
  return res.json({ success: true });
}

async function handleUpdateStudent(svc, { userId, name, regNo, cardUid, passoutYear }, res) {
  if (!userId || !name || !regNo) {
    return res.status(400).json({ error: 'User ID, name, and registration number are required' });
  }

  const trimmedReg = String(regNo).trim();
  const { data: profile, error: fetchErr } = await svc.from('users').select('*').eq('id', userId).single();
  if (fetchErr || !profile) return res.status(404).json({ error: 'Student not found' });
  if (profile.role !== 'student') return res.status(400).json({ error: 'User is not a student' });

  const { data: regConflict } = await svc
    .from('users')
    .select('id')
    .eq('reg_no', trimmedReg)
    .neq('id', userId)
    .maybeSingle();
  if (regConflict) return res.status(400).json({ error: 'Registration number already in use' });

  const uid = cardUid != null && String(cardUid).trim() ? String(cardUid).trim() : null;
  if (uid) {
    const { data: cardConflict } = await svc
      .from('users')
      .select('id')
      .eq('card_uid', uid)
      .neq('id', userId)
      .maybeSingle();
    if (cardConflict) return res.status(400).json({ error: 'NFC UID already assigned to another user' });
  }

  if (trimmedReg !== profile.reg_no) {
    const { error: authErr } = await svc.auth.admin.updateUserById(userId, {
      email: campusEmail(trimmedReg),
    });
    if (authErr) return res.status(400).json({ error: authErr.message });
  }

  const { data: updated, error } = await svc
    .from('users')
    .update({
      name: String(name).trim(),
      reg_no: trimmedReg,
      card_uid: uid,
      passout_year: Number(passoutYear) || null,
    })
    .eq('id', userId)
    .select('*')
    .single();
  if (error) return res.status(400).json({ error: error.message });

  return res.json({ success: true, user: normalizeUser(updated) });
}

async function handleUpdateDriver(svc, { userId, name, regNo, vehicleNo, route }, res) {
  if (!userId || !name || !regNo) {
    return res.status(400).json({ error: 'User ID, name, and driver ID are required' });
  }

  const trimmedReg = String(regNo).trim();
  const { data: profile, error: fetchErr } = await svc.from('users').select('*').eq('id', userId).single();
  if (fetchErr || !profile) return res.status(404).json({ error: 'Driver not found' });
  if (profile.role !== 'driver') return res.status(400).json({ error: 'User is not a driver' });

  const { data: regConflict } = await svc
    .from('users')
    .select('id')
    .eq('reg_no', trimmedReg)
    .neq('id', userId)
    .maybeSingle();
  if (regConflict) return res.status(400).json({ error: 'Driver ID already in use' });

  if (trimmedReg !== profile.reg_no) {
    const { error: authErr } = await svc.auth.admin.updateUserById(userId, {
      email: campusEmail(trimmedReg),
    });
    if (authErr) return res.status(400).json({ error: authErr.message });
  }

  const { data: updated, error } = await svc
    .from('users')
    .update({
      name: String(name).trim(),
      reg_no: trimmedReg,
      card_uid: trimmedReg,
    })
    .eq('id', userId)
    .select('*')
    .single();
  if (error) return res.status(400).json({ error: error.message });

  if (vehicleNo) {
    const { data: shuttle } = await svc.from('shuttles').select('id').eq('driver_id', userId).maybeSingle();
    const shuttlePatch = {
      vehicle_no: String(vehicleNo).trim(),
      ...(route ? { route } : {}),
    };
    if (shuttle) {
      await svc.from('shuttles').update(shuttlePatch).eq('id', shuttle.id);
    }
  } else if (route) {
    await svc.from('shuttles').update({ route }).eq('driver_id', userId);
  }

  return res.json({ success: true, user: normalizeUser(updated) });
}

async function handleSendAlert(svc, { text, audience, expiresAt }, res) {
  if (!text || !expiresAt) {
    return res.status(400).json({ error: 'Text and expiry date are required' });
  }
  const { data, error } = await svc
    .from('alerts')
    .insert({
      text,
      audience: audience || 'all',
      expires_at: new Date(expiresAt).toISOString(),
    })
    .select('*')
    .single();
  if (error) return res.status(400).json({ error: error.message });
  return res.json({
    success: true,
    alert: {
      id: data.id,
      text: data.text,
      audience: data.audience,
      expiresAt: data.expires_at,
      createdAt: data.created_at,
    },
  });
}

async function handleDeleteAlert(svc, { alertId }, res) {
  if (!alertId) return res.status(400).json({ error: 'Alert ID is required' });
  await svc.from('alerts').delete().eq('id', alertId);
  return res.json({ success: true });
}
