import { useRouter } from 'next/router';
import { useState } from 'react';
import { applyAuthSession } from '../lib/authSession';

export default function Home() {
  const router = useRouter();
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Password reset flow for first time login
  const [showReset, setShowReset] = useState(false);
  const [tempUser, setTempUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetError, setResetError] = useState('');

  async function login(e) {
    e.preventDefault();
    setError('');
    try {
      const isEmail = loginId.includes('@');
      const res = await fetch(isEmail ? '/api/login' : '/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          isEmail
            ? { email: loginId.trim(), password }
            : { login: loginId, password }
        ),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Invalid user id or password');
        return;
      }

      const user = data.user;
      if (data.session) await applyAuthSession(data.session);
      if (user.needsPasswordReset) {
        setTempUser(user);
        setShowReset(true);
      } else {
        localStorage.setItem('cs_user', JSON.stringify(user));
        router.push(`/${user.role}`);
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    }
  }

  async function handlePasswordReset(e) {
    e.preventDefault();
    setResetError('');
    if (!newPassword) {
      setResetError('Password cannot be empty');
      return;
    }
    if (newPassword !== confirmPassword) {
      setResetError('Passwords do not match');
      return;
    }
    if (newPassword === `${tempUser.regNo}@123` || newPassword === 'admin@123') {
      setResetError('Please choose a different password than the default');
      return;
    }

    if (String(newPassword).length < 6) {
      setResetError('Password must be at least 6 characters');
      return;
    }

    try {
      const res = await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset_password', userId: tempUser.id, newPassword })
      });
      const data = await res.json();
      if (!res.ok) {
        setResetError(data.error || 'Failed to reset password');
        return;
      }

      localStorage.setItem('cs_user', JSON.stringify(data.user));
      router.push(`/${data.user.role}`);
    } catch (err) {
      setResetError('Connection error. Please try again.');
    }
  }

  return (
    <div className="login-shell">
      <section className="login-hero">
        <div>
          <div className="brand-pill">⚡ VIT Vellore Shuttle NFC</div>
          <h1>Track. Tap. Ride.</h1>
          <p>
            Real-time GPS telemetry for SJT/PRP Green Route & Mens Hostel Blue Route.
            Instant NFC fare validation, cloud telemetry, and responsive campus transit.
          </p>
        </div>
        <div className="hero-grid">
          <span>📡 Live GPS</span>
          <span>⚡ Mobile NFC</span>
          <span>💳 Digital Wallet</span>
          <span>🗺️ Command Map</span>
        </div>
      </section>

      <div className="login-form-pane">
        {!showReset ? (
          <form className="login-card" onSubmit={login}>
            <div>
              <h2>Sign in</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
                Enter your campus credentials or driver ID to continue
              </p>
            </div>

            <div>
              <label>User ID / Reg No</label>
              <input
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                placeholder="e.g. ADMIN or DRV01"
                required
              />
            </div>

            <div>
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
              />
            </div>

            {error && (
              <div style={{ color: '#f87171', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', padding: '10px 14px', fontSize: '13px' }}>
                {error}
              </div>
            )}

            <button type="submit" style={{ width: '100%', marginTop: '8px' }}>
              Authenticate & Continue &rarr;
            </button>

            <div style={{ marginTop: '16px', padding: '14px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '12px', border: '1px dashed rgba(255, 255, 255, 0.12)', fontSize: '12px' }}>
              <div style={{ fontWeight: 800, color: 'var(--accent-emerald)', marginBottom: '8px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Quick Demo Credentials
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', color: 'var(--text-secondary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>👑 Admin: <strong style={{ color: '#fff' }}>ADMIN</strong></span>
                  <span style={{ fontFamily: 'monospace', color: '#94a3b8' }}>admin123</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>🚌 Driver 1: <strong style={{ color: '#fff' }}>DRV01</strong></span>
                  <span style={{ fontFamily: 'monospace', color: '#94a3b8' }}>driver123</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>🚌 Driver 2: <strong style={{ color: '#fff' }}>DRV02</strong></span>
                  <span style={{ fontFamily: 'monospace', color: '#94a3b8' }}>driver123</span>
                </div>
              </div>
            </div>
          </form>
        ) : (
          <form className="login-card" onSubmit={handlePasswordReset}>
            <h2>Reset Password</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
              First time login detected for <strong style={{ color: '#fff' }}>{tempUser?.name}</strong>. Please create a new password.
            </p>
            <div>
              <label>New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 6 characters"
                required
              />
            </div>
            <div>
              <label>Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                required
              />
            </div>
            {resetError && (
              <div style={{ color: '#f87171', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', padding: '10px 14px', fontSize: '13px' }}>
                {resetError}
              </div>
            )}
            <button type="submit" style={{ width: '100%', marginTop: '8px' }}>
              Save & Login
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
