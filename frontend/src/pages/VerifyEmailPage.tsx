import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { CheckCircle2, AlertCircle, Mail, ArrowRight, ShieldCheck } from 'lucide-react';

export const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [token, setToken] = useState(searchParams.get('token') || '');
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);

  const navigate = useNavigate();

  // If token is already in URL parameters, verify automatically
  useEffect(() => {
    const urlToken = searchParams.get('token');
    const urlEmail = searchParams.get('email');
    if (urlToken) {
      handleVerify(urlToken, urlEmail || '');
    }
  }, []);

  const handleVerify = async (tokenToVerify: string, emailToVerify: string) => {
    setError(null);
    setLoading(true);

    try {
      await api.auth.verifyEmail({ token: tokenToVerify, email: emailToVerify });
      setVerified(true);
    } catch (err: any) {
      setError(err?.message || 'Email verification failed. Token may be invalid or expired.');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError('Please provide a verification token.');
      return;
    }
    handleVerify(token, email);
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 mx-auto flex items-center justify-center border border-indigo-500/30">
            <Mail className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black text-slate-100">Verify Your Email</h1>
          <p className="text-xs text-slate-400">Activate your VIT Shuttle account for campus transit tracking</p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {verified ? (
          <div className="glass-card p-6 rounded-2xl border border-emerald-500/40 shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-extrabold text-slate-100">Email Verified Successfully!</h3>
            <p className="text-xs text-slate-400">
              Your account is now activated. You can sign in and access the real-time shuttle fleet.
            </p>
            <Link
              to="/login"
              className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2"
            >
              <span>Proceed to Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="glass-card p-6 rounded-2xl border border-slate-700/80 shadow-2xl space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Registered Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@vitstudent.ac.in"
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Verification Token</label>
              <input
                type="text"
                required
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Paste your verification token"
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-900 border border-slate-700 font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Verifying Token...' : 'Confirm Verification'}
              <ShieldCheck className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
