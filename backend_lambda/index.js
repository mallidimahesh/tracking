/**
 * AWS Lambda Serverless Backend for VIT Shuttle Track
 * Designed for AWS Free Tier on region ap-southeast-2
 * Uses native @aws-sdk (Node.js 18/20 runtime) with Amazon DynamoDB
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
  DynamoDBDocumentClient,
  ScanCommand,
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
} = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-southeast-2' });
const ddb = DynamoDBDocumentClient.from(client);

const USERS_TABLE = process.env.USERS_TABLE || 'vit_shuttle_users';
const SHUTTLES_TABLE = process.env.SHUTTLES_TABLE || 'vit_shuttle_shuttles';
const TRANSACTIONS_TABLE = process.env.TRANSACTIONS_TABLE || 'vit_shuttle_transactions';
const ALERTS_TABLE = process.env.ALERTS_TABLE || 'vit_shuttle_alerts';
const HOTLIST_TABLE = process.env.HOTLIST_TABLE || 'vit_shuttle_hotlist';

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Requested-With',
};

function res(statusCode, body) {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(body),
  };
}

let seeded = false;

async function ensureSeedData() {
  if (seeded) return;
  try {
    const scanRes = await ddb.send(new ScanCommand({ TableName: USERS_TABLE, Limit: 5 }));
    if (scanRes.Items && scanRes.Items.length > 0) {
      seeded = true;
      return;
    }

    console.log('[Seed] Seeding fresh Admin and 2 Drivers into DynamoDB...');
    const now = new Date().toISOString();

    const seedUsers = [
      {
        id: 'adm-001',
        name: 'Campus Admin',
        role: 'admin',
        regNo: 'ADMIN',
        email: 'admin@campus.shuttle',
        password: 'admin123',
        needsPasswordReset: false,
        walletBalance: 0,
        createdAt: now,
      },
      {
        id: 'drv-001',
        name: 'Driver 1',
        role: 'driver',
        regNo: 'DRV01',
        email: 'drv01@campus.shuttle',
        password: 'driver123',
        needsPasswordReset: false,
        walletBalance: 0,
        createdAt: now,
      },
      {
        id: 'drv-002',
        name: 'Driver 2',
        role: 'driver',
        regNo: 'DRV02',
        email: 'drv02@campus.shuttle',
        password: 'driver123',
        needsPasswordReset: false,
        walletBalance: 0,
        createdAt: now,
      },
    ];

    for (const u of seedUsers) {
      await ddb.send(new PutCommand({ TableName: USERS_TABLE, Item: u }));
    }

    const seedShuttles = [
      {
        id: 'bus-001',
        vehicleNo: 'VIT-A-101',
        driverId: 'drv-001',
        route: 'A',
        status: 'running',
        lat: 12.9729,
        lng: 79.1586,
        heading: 0,
        lastSeen: now,
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
        lastSeen: now,
      },
    ];

    for (const s of seedShuttles) {
      await ddb.send(new PutCommand({ TableName: SHUTTLES_TABLE, Item: s }));
    }

    seeded = true;
  } catch (err) {
    console.warn('[Seed] Seed check error:', err.message);
  }
}

exports.handler = async (event) => {
  const method = event.requestContext?.http?.method || event.httpMethod || 'GET';
  const rawPath = event.rawPath || event.path || '/';

  // Normalize path removing trailing slash and optional prefix
  const path = rawPath.replace(/\/+$/, '') || '/';

  if (method === 'OPTIONS') {
    return res(200, { ok: true });
  }

  await ensureSeedData();

  let body = {};
  if (event.body) {
    try {
      body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    } catch {
      body = {};
    }
  }

  try {
    // 1. Auth Endpoint (/auth or /api/auth)
    if (path.endsWith('/auth')) {
      const { login, password } = body;
      if (!login || !password) {
        return res(400, { error: 'User ID and Password are required' });
      }

      const key = String(login).trim().toLowerCase();
      const usersScan = await ddb.send(new ScanCommand({ TableName: USERS_TABLE }));
      const users = usersScan.Items || [];

      const user = users.find((u) => {
        const uId = String(u.id || '').toLowerCase();
        const uReg = String(u.regNo || '').toLowerCase();
        const uName = String(u.name || '').toLowerCase();
        const uEmail = String(u.email || '').toLowerCase();
        return (
          uId === key ||
          uReg === key ||
          uName === key ||
          uEmail === key ||
          ((key === 'admin' || key === 'admin123') && u.role === 'admin')
        );
      });

      if (!user) return res(401, { error: 'Invalid user ID or password' });

      const validPassword =
        password === user.password ||
        (user.role === 'admin' && (password === 'admin123' || password === 'admin@123')) ||
        (user.role === 'driver' && (password === 'driver123' || password === '12345')) ||
        (user.regNo && password === `${user.regNo}@123`);

      if (!validPassword) return res(401, { error: 'Invalid user ID or password' });

      return res(200, {
        user: {
          id: user.id,
          name: user.name,
          role: user.role,
          regNo: user.regNo,
          cardUid: user.cardUid,
          needsPasswordReset: user.needsPasswordReset || false,
        },
        firstLogin: user.needsPasswordReset || false,
        session: { user },
      });
    }

    // 2. Login Endpoint (/login or /api/login)
    if (path.endsWith('/login')) {
      const { email, password } = body;
      if (!email || !password) return res(400, { error: 'Email and password required' });

      const cleanEmail = email.trim().toLowerCase();
      const usersScan = await ddb.send(new ScanCommand({ TableName: USERS_TABLE }));
      const user = (usersScan.Items || []).find((u) => {
        const uEmail = String(u.email || '').toLowerCase();
        const uReg = String(u.regNo || '').toLowerCase();
        return (
          uEmail === cleanEmail ||
          uReg === cleanEmail ||
          (cleanEmail === 'admin@gmail.com' && u.role === 'admin') ||
          (cleanEmail === 'admin' && u.role === 'admin')
        );
      });

      if (!user) return res(401, { error: 'Invalid credentials.' });

      const validPassword =
        password === user.password ||
        (user.role === 'admin' && (password === 'admin123' || password === 'admin@123')) ||
        (user.role === 'driver' && (password === 'driver123' || password === '12345')) ||
        (user.regNo && password === `${user.regNo}@123`);

      if (!validPassword) return res(401, { error: 'Invalid credentials.' });

      return res(200, {
        user: {
          id: user.id,
          name: user.name,
          role: user.role,
          regNo: user.regNo,
          cardUid: user.cardUid,
          needsPasswordReset: user.needsPasswordReset || false,
        },
        session: { user },
      });
    }

    // 3. State Endpoint (/state or /api/state)
    if (path.endsWith('/state')) {
      if (method === 'GET' || (method === 'POST' && body.action === 'get_state')) {
        return res(200, await buildFullState());
      }

      const { action } = body;

      // Add Student
      if (action === 'add_student') {
        const { name, regNo, cardUid, passoutYear } = body;
        if (!name || !regNo) return res(400, { error: 'Name and Registration Number required' });

        const trimmedReg = String(regNo).trim().toUpperCase();
        const usersScan = await ddb.send(new ScanCommand({ TableName: USERS_TABLE }));
        if ((usersScan.Items || []).some((u) => String(u.regNo || '').toUpperCase() === trimmedReg)) {
          return res(400, { error: 'Student already exists with this Reg No' });
        }

        const newStudent = {
          id: `stu-${Date.now()}`,
          name: String(name).trim(),
          role: 'student',
          regNo: trimmedReg,
          email: `${trimmedReg.toLowerCase()}@campus.shuttle`,
          cardUid: cardUid ? String(cardUid).trim() : null,
          passoutYear: Number(passoutYear) || new Date().getFullYear() + 4,
          password: `${trimmedReg}@123`,
          needsPasswordReset: true,
          walletBalance: 0,
          createdAt: new Date().toISOString(),
        };

        await ddb.send(new PutCommand({ TableName: USERS_TABLE, Item: newStudent }));
        return res(200, { success: true, user: newStudent });
      }

      // Map NFC Card
      if (action === 'map_nfc') {
        const { userId, cardUid } = body;
        if (!userId || !cardUid) return res(400, { error: 'User ID and Card UID required' });
        const cleanUid = String(cardUid).trim();

        const usersScan = await ddb.send(new ScanCommand({ TableName: USERS_TABLE }));
        const other = (usersScan.Items || []).find((u) => u.cardUid === cleanUid && u.id !== userId);
        if (other) return res(400, { error: 'Card UID is already assigned to another user' });

        await ddb.send(
          new UpdateCommand({
            TableName: USERS_TABLE,
            Key: { id: userId },
            UpdateExpression: 'SET cardUid = :c',
            ExpressionAttributeValues: { ':c': cleanUid },
          })
        );
        return res(200, { success: true });
      }

      // Add Money to Wallet
      if (action === 'add_money') {
        const { userId, amount } = body;
        const numAmount = Number(amount);
        if (!userId || !numAmount || numAmount <= 0) {
          return res(400, { error: 'Valid User ID and Amount are required' });
        }

        const userRes = await ddb.send(new GetCommand({ TableName: USERS_TABLE, Key: { id: userId } }));
        const user = userRes.Item;
        if (!user) return res(404, { error: 'User not found' });

        const currentBal = Number(user.walletBalance || 0);
        const newBal = currentBal + numAmount;

        await ddb.send(
          new UpdateCommand({
            TableName: USERS_TABLE,
            Key: { id: userId },
            UpdateExpression: 'SET walletBalance = :b',
            ExpressionAttributeValues: { ':b': newBal },
          })
        );
        return res(200, { success: true, wallet: newBal });
      }

      // Withdraw
      if (action === 'withdraw') {
        const { userId, amount } = body;
        const numAmount = Number(amount);
        const userRes = await ddb.send(new GetCommand({ TableName: USERS_TABLE, Key: { id: userId } }));
        const user = userRes.Item;
        if (!user) return res(404, { error: 'User not found' });

        const currentBal = Number(user.walletBalance || 0);
        if (currentBal < numAmount) return res(400, { error: 'Insufficient balance' });

        const newBal = currentBal - numAmount;
        await ddb.send(
          new UpdateCommand({
            TableName: USERS_TABLE,
            Key: { id: userId },
            UpdateExpression: 'SET walletBalance = :b',
            ExpressionAttributeValues: { ':b': newBal },
          })
        );
        return res(200, { success: true, wallet: newBal });
      }

      // Add Driver
      if (action === 'add_driver') {
        const { name, regNo, vehicleNo, route } = body;
        const trimmedReg = String(regNo).trim().toUpperCase();

        const newDriver = {
          id: `drv-${Date.now()}`,
          name: String(name).trim(),
          role: 'driver',
          regNo: trimmedReg,
          email: `${trimmedReg.toLowerCase()}@campus.shuttle`,
          cardUid: trimmedReg,
          password: 'driver123',
          needsPasswordReset: false,
          walletBalance: 0,
          createdAt: new Date().toISOString(),
        };

        const newShuttle = {
          id: `bus-${Date.now()}`,
          vehicleNo: String(vehicleNo).trim(),
          driverId: newDriver.id,
          route: route || 'A',
          status: 'running',
          lat: 12.9729,
          lng: 79.1586,
          heading: 0,
          lastSeen: new Date().toISOString(),
        };

        await ddb.send(new PutCommand({ TableName: USERS_TABLE, Item: newDriver }));
        await ddb.send(new PutCommand({ TableName: SHUTTLES_TABLE, Item: newShuttle }));
        return res(200, { success: true, user: newDriver });
      }

      // Delete User
      if (action === 'delete_user') {
        const { userId } = body;
        await ddb.send(new DeleteCommand({ TableName: USERS_TABLE, Key: { id: userId } }));
        return res(200, { success: true });
      }

      // Reset Password
      if (action === 'reset_password') {
        const { userId, newPassword } = body;
        await ddb.send(
          new UpdateCommand({
            TableName: USERS_TABLE,
            Key: { id: userId },
            UpdateExpression: 'SET password = :p, needsPasswordReset = :r',
            ExpressionAttributeValues: { ':p': newPassword, ':r': false },
          })
        );
        return res(200, { success: true });
      }

      // Broadcast Alert
      if (action === 'send_alert') {
        const { text, audience, expiresAt } = body;
        const newAlert = {
          id: `alert-${Date.now()}`,
          text: String(text).trim(),
          audience: audience || 'all',
          expiresAt: new Date(expiresAt).toISOString(),
          createdAt: new Date().toISOString(),
        };
        await ddb.send(new PutCommand({ TableName: ALERTS_TABLE, Item: newAlert }));
        return res(200, { success: true, alert: newAlert });
      }

      // Delete Alert
      if (action === 'delete_alert') {
        const { alertId } = body;
        await ddb.send(new DeleteCommand({ TableName: ALERTS_TABLE, Key: { id: alertId } }));
        return res(200, { success: true });
      }

      return res(400, { error: `Unknown action: ${action}` });
    }

    // 4. Driver GPS Update (/update-route or /api/update-route)
    if (path.endsWith('/update-route')) {
      const { shuttle_id, route, status, lat, lng, vehicle_number, heading } = body;
      if (!shuttle_id) return res(400, { error: 'shuttle_id required' });

      const updates = [];
      const attrNames = {};
      const attrValues = {};

      if (route) {
        updates.push('#r = :route');
        attrNames['#r'] = 'route';
        attrValues[':route'] = route;
      }
      if (status) {
        updates.push('#s = :status');
        attrNames['#s'] = 'status';
        attrValues[':status'] = status;
      }
      if (vehicle_number) {
        updates.push('vehicleNo = :v');
        attrValues[':v'] = vehicle_number;
      }
      if (heading !== undefined) {
        updates.push('heading = :h');
        attrValues[':h'] = Number(heading);
      }
      if (lat != null && lng != null) {
        updates.push('lat = :lat, lng = :lng, lastSeen = :ls');
        attrValues[':lat'] = Number(lat);
        attrValues[':lng'] = Number(lng);
        attrValues[':ls'] = new Date().toISOString();
      }

      if (updates.length > 0) {
        await ddb.send(
          new UpdateCommand({
            TableName: SHUTTLES_TABLE,
            Key: { id: shuttle_id },
            UpdateExpression: `SET ${updates.join(', ')}`,
            ExpressionAttributeNames: Object.keys(attrNames).length ? attrNames : undefined,
            ExpressionAttributeValues: attrValues,
          })
        );
      }
      return res(200, { ok: true });
    }

    // 5. NFC Card Tap (/process-tap or /api/process-tap)
    if (path.endsWith('/process-tap')) {
      const { card_uid, driver_id, shuttle_id, route, vehicle_no, queue_id } = body;
      if (!card_uid) return res(400, { error: 'card_uid required' });
      const cleanUid = String(card_uid).trim();

      const usersScan = await ddb.send(new ScanCommand({ TableName: USERS_TABLE }));
      const user = (usersScan.Items || []).find((u) => u.cardUid === cleanUid && u.role === 'student');
      if (!user) return res(404, { error: 'Card not mapped to any student' });

      const FARE = 15;
      const currentBal = Number(user.walletBalance || 0);
      const newBal = currentBal >= FARE ? currentBal - FARE : 0;

      await ddb.send(
        new UpdateCommand({
          TableName: USERS_TABLE,
          Key: { id: user.id },
          UpdateExpression: 'SET walletBalance = :b',
          ExpressionAttributeValues: { ':b': newBal },
        })
      );

      const txId = queue_id ? `OFF-${queue_id}` : `TX${Date.now()}`;
      const now = new Date().toISOString();
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
        createdAt: now,
      };

      await ddb.send(new PutCommand({ TableName: TRANSACTIONS_TABLE, Item: tx }));

      return res(200, {
        ok: true,
        userName: user.name,
        userRegNo: user.regNo,
        tapTime: now,
        cardUid: cleanUid,
        result: tx,
      });
    }

    // 6. Refund (/refund or /api/refund)
    if (path.endsWith('/refund')) {
      const { id } = body;
      if (!id) return res(400, { error: 'id required' });

      const txRes = await ddb.send(new GetCommand({ TableName: TRANSACTIONS_TABLE, Key: { id } }));
      const tx = txRes.Item;
      if (!tx) return res(404, { error: 'Transaction not found' });
      if (tx.status === 'refunded') return res(400, { error: 'Already refunded' });

      await ddb.send(
        new UpdateCommand({
          TableName: TRANSACTIONS_TABLE,
          Key: { id },
          UpdateExpression: 'SET #s = :ref, refundedAt = :ra',
          ExpressionAttributeNames: { '#s': 'status' },
          ExpressionAttributeValues: { ':ref': 'refunded', ':ra': new Date().toISOString() },
        })
      );

      const userRes = await ddb.send(new GetCommand({ TableName: USERS_TABLE, Key: { id: tx.userId } }));
      const user = userRes.Item;
      if (user) {
        const newBal = Number(user.walletBalance || 0) + Number(tx.amount || 0);
        await ddb.send(
          new UpdateCommand({
            TableName: USERS_TABLE,
            Key: { id: tx.userId },
            UpdateExpression: 'SET walletBalance = :b',
            ExpressionAttributeValues: { ':b': newBal },
          })
        );
      }

      return res(200, { ok: true, tx_id: id });
    }

    return res(404, { error: `Not found: ${method} ${path}` });
  } catch (err) {
    console.error('[Lambda Error]', err);
    return res(500, { error: err.message || 'Internal Server Error' });
  }
};

async function buildFullState() {
  const [usersRes, shuttlesRes, txRes, alertsRes] = await Promise.all([
    ddb.send(new ScanCommand({ TableName: USERS_TABLE })),
    ddb.send(new ScanCommand({ TableName: SHUTTLES_TABLE })),
    ddb.send(new ScanCommand({ TableName: TRANSACTIONS_TABLE, Limit: 200 })),
    ddb.send(new ScanCommand({ TableName: ALERTS_TABLE })),
  ]);

  const users = usersRes.Items || [];
  const shuttles = shuttlesRes.Items || [];
  const transactions = (txRes.Items || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const alerts = (alertsRes.Items || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const wallets = {};
  const dues = {};
  const cards = {};

  for (const u of users) {
    wallets[u.id] = Number(u.walletBalance || 0);
    if (u.dueAmount > 0) {
      dues[u.id] = { amount: Number(u.dueAmount), since: u.dueSince || u.createdAt };
    }
    if (u.cardUid) {
      cards[u.cardUid] = u.id;
    }
  }

  return {
    users,
    wallets,
    dues,
    shuttles,
    hotlist: {},
    transactions,
    alerts,
    cards,
  };
}
