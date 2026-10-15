import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { Bus, Lock, Mail, User, AlertCircle, ArrowRight, CheckCircle2, ShieldCheck, GraduationCap } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const [roleType, setRoleType] = useState<'student' | 'outsider'>('student');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{ message: string; email: string; token?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const isVitEmail = email.trim().toLowerCase().endsWith('@vitstudent.ac.in');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (roleType === 'student' && !isVitEmail) {
      setError('Student registration is strictly restricted to verified @vitstudent.ac.in email addresses.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      if (roleType === 'student') {
        const res = await api.auth.registerStudent({ email, full_name: fullName, password });
        setSuccessData({ message: res.message, email: res.email, token: res.verification_token });
      } else {
        const res = await api.auth.registerOutsider({ email, full_name: fullName, password });
        setSuccessData({ message: res.message, email: res.email, token: res.verification_token });
      }
    } catch (err: any) {
      setError(err?.message || 'Registration failed. Please check your inputs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-500 mx-auto flex items-center justify-center shadow-lg shadow-indigo-600/30">
            <Bus className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-black text-slate-100">Create an Account</h1>
          <p className="text-xs text-slate-400">Join the VIT Vellore Smart Campus Transit Network</p>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setRoleType('student');
              setError(null);
            }}
            className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition ${
              roleType === 'student'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>VIT Student</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setRoleType('outsider');
              setError(null);
            }}
            className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition ${
              roleType === 'outsider'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Outsider / Visitor</span>
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {successData && (
          <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs space-y-3">
            <div className="flex items-center gap-2 font-bold text-sm text-emerald-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>Registration Submitted</span>
            </div>
            <p>{successData.message}</p>
            {successData.token && (
              <div className="p-2.5 rounded bg-slate-900/80 border border-slate-800 font-mono text-[11px] text-slate-300">
                Verification Token (Dev Mode): <strong>{successData.token}</strong>
              </div>
            )}
            <Link
              to={`/verify-email?token=${successData.token || ''}&email=${encodeURIComponent(successData.email)}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs"
            >
              <span>Proceed to Email Verification</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* Registration Form */}
        {!successData && (
          <form onSubmit={handleSubmit} className="glass-card p-6 rounded-2xl border border-slate-700/80 shadow-2xl space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300">
                  {roleType === 'student' ? 'VIT Student Email (@vitstudent.ac.in)' : 'Personal Email Address'}
                </label>
                {roleType === 'student' && email && (
                  <span
                    className={`text-[10px] font-bold ${
                      isVitEmail ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {isVitEmail ? '✓ Valid Domain' : '⚠ Requires @vitstudent.ac.in'}
                  </span>
                )}
              </div>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={
                    roleType === 'student' ? 'firstname.lastname2024@vitstudent.ac.in' : 'yourname@example.com'
                  }
                  className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Password (Min. 6 characters)</label>
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
              {loading ? 'Submitting Registration...' : `Register as ${roleType === 'student' ? 'Student' : 'Visitor'}`}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        <div className="text-center text-xs text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="font-bold text-indigo-400 hover:text-indigo-300">
            Sign In here
          </Link>
        </div>
      </div>
    </div>
  );
};
