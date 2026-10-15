import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Bus, Lock, Mail, AlertCircle, ArrowRight, CheckCircle2, KeyRound } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResendSuccess(null);
    setLoading(true);

    try {
      const res = await api.auth.login({ email, password });
      login(res.token, res.user);

      // Navigate based on role
      if (res.user.role === 'driver') {
        navigate('/driver');
      } else if (res.user.role === 'admin') {
        navigate('/admin');
      } else if (res.user.role === 'student') {
        navigate('/student');
      } else {
        navigate('/outsider');
      }
    } catch (err: any) {
      if (err?.data?.needs_verification) {
        setNeedsVerification(true);
      }
      setError(err?.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    try {
      const res = await api.auth.resendVerification(email);
      setResendSuccess(res.message);
    } catch (err: any) {
      setError(err?.message || 'Failed to resend verification.');
    }
  };

  // Quick Demo Credentials Fill
  const fillCredentials = (role: 'driver' | 'admin' | 'student') => {
    if (role === 'driver') {
      setEmail('driver1@vitshuttle.campus');
      setPassword('Driver@2026');
    } else if (role === 'admin') {
      setEmail('admin@vitshuttle.campus');
      setPassword('Admin@VIT2026');
    } else if (role === 'student') {
      setEmail('rahul.sharma2023@vitstudent.ac.in');
      setPassword('Student@2026');
    }
    setError(null);
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-500 mx-auto flex items-center justify-center shadow-lg shadow-indigo-600/30">
            <Bus className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-black text-slate-100">Sign In to VIT Shuttle</h1>
          <p className="text-xs text-slate-400">Access campus transit tracking and driver telematics</p>
        </div>

        {/* Error / Alert */}
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <div className="space-y-1">
              <span>{error}</span>
              {needsVerification && (
                <div>
                  <button
                    onClick={handleResendVerification}
                    className="underline text-indigo-400 hover:text-indigo-300 font-semibold"
                  >
                    Resend Verification Link
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {resendSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{resendSuccess}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="glass-card p-6 rounded-2xl border border-slate-700/80 shadow-2xl space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@vitstudent.ac.in or driver@campus"
                className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
            <ArrowRight className="w-4 h-4" />
          </button>

          {/* Quick Credential Test Buttons */}
          <div className="pt-2 border-t border-slate-800 space-y-2">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
              <span className="font-semibold">Quick Test Accounts:</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5 text-[11px]">
              <button
                type="button"
                onClick={() => fillCredentials('driver')}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition"
              >
                Driver SH-01
              </button>
              <button
                type="button"
                onClick={() => fillCredentials('admin')}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition"
              >
                Administrator
              </button>
              <button
                type="button"
                onClick={() => fillCredentials('student')}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition"
              >
                Student Demo
              </button>
            </div>
          </div>
        </form>

        {/* Register Links */}
        <div className="text-center text-xs text-slate-400 space-y-1">
          <div>
            Don't have an account?{' '}
            <Link to="/register" className="font-bold text-indigo-400 hover:text-indigo-300">
              Register here
            </Link>
          </div>
          <div>
            Received a verification token?{' '}
            <Link to="/verify-email" className="font-medium text-slate-300 underline">
              Verify Email
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
