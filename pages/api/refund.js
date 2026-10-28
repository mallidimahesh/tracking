import { getServiceRoleClient, hasSupabase } from '../../lib/supabaseClient';
import { getLocalDb, saveLocalDb } from '../../lib/serverDb';

async function refundDirect(svc, id, admin_id, reason) {
  const { data: tx, error } = await svc.from('transactions').select('*').eq('id', id).single();
  if (error || !tx) return { error: 'Transaction not found' };
  if (tx.status === 'refunded') return { error: 'Transaction already refunded' };

  const meta = { ...(tx.metadata || {}), refunded_at: new Date().toISOString() };
  if (admin_id) meta.refunded_by = admin_id;
  if (reason) meta.refund_reason = reason;

  const { error: txErr } = await svc
    .from('transactions')
    .update({ status: 'refunded', metadata: meta })
    .eq('id', id);
  if (txErr) return { error: txErr.message };

  const { data: wallet } = await svc.from('wallets').select('balance').eq('user_id', tx.user_id).maybeSingle();
  const newBalance = Number(wallet?.balance || 0) + Number(tx.amount || 0);
  const { error: walletErr } = await svc.from('wallets').upsert({ user_id: tx.user_id, balance: newBalance });
  if (walletErr) return { error: walletErr.message };

  return { ok: true, result: { tx_id: id, wallet_balance: newBalance } };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { id } = req.body;
  if (!id) return res.status(400).json({ error: 'id required' });

  const svc = getServiceRoleClient();
  const admin_id = req.body.admin_id || null;
  const reason = req.body.reason || null;

  if (svc && hasSupabase) {
    try {
      const rpc = await svc.rpc('sp_refund_transaction', {
        p_tx_id: id,
        p_admin_id: admin_id,
        p_reason: reason,
      });

      if (!rpc.error) {
        return res.json({ ok: true, result: rpc.data });
      }

      const direct = await refundDirect(svc, id, admin_id, reason);
      if (direct.error) return res.status(400).json({ error: direct.error });
      return res.json(direct);
    } catch (err) {
      console.warn('[refund] Supabase refund failed, falling back to local DB:', err.message);
    }
  }

  // Local fallback
  const db = getLocalDb();
  const tx = (db.transactions || []).find((t) => t.id === id);
  if (!tx) return res.status(404).json({ error: 'Transaction not found' });
  if (tx.status === 'refunded') return res.status(400).json({ error: 'Transaction already refunded' });

  tx.status = 'refunded';
  tx.refundedAt = new Date().toISOString();
  if (reason) tx.refundReason = reason;

  const currentBal = Number(db.wallets?.[tx.userId] || 0);
  const newBal = currentBal + Number(tx.amount || 0);
  db.wallets[tx.userId] = newBal;
  saveLocalDb(db);

  return res.json({ ok: true, result: { tx_id: id, wallet_balance: newBal } });
}
