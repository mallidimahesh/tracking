import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useShuttles } from '../context/ShuttleContext';
import { ThemeToggle } from './ThemeToggle';
import {
  Bus,
  MapPin,
  Radio,
  LogOut,
  User as UserIcon,
  Sparkles,
  RotateCcw,
  Wallet,
  Shield,
  Smartphone,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { isSocketConnected, triggerDemoStep, resetFleet } = useShuttles();
  const navigate = useNavigate();
  const location = useLocation();

  const [isDemoLoading, setIsDemoLoading] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleDemoStep = async () => {
    setIsDemoLoading(true);
    await triggerDemoStep();
    setIsDemoLoading(false);
  };

  const handleReset = async () => {
    setIsDemoLoading(true);
    await resetFleet();
    setIsDemoLoading(false);
  };

  return (
    <header className="sticky top-0 z-[600] glass-card border-b border-slate-800/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Campus Brand */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center shadow-lg shadow-indigo-600/30 group-hover:scale-105 transition-transform">
              <Bus className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-white">VIT SHUTTLE</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Campus
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Smart Transit • VIT Vellore</p>
            </div>
          </Link>

          {/* Center Links */}
          <nav className="hidden md:flex items-center gap-1.5 text-xs font-semibold">
            <Link
              to="/"
              className={`px-3 py-2 rounded-lg transition ${
                location.pathname === '/'
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              Transit Map
            </Link>

            {user?.role === 'student' && (
              <Link
                to="/student"
                className={`px-3 py-2 rounded-lg transition ${
                  location.pathname === '/student'
                    ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                Student Hub
              </Link>
            )}

            {user?.role === 'driver' && (
              <Link
                to="/driver"
                className={`px-3 py-2 rounded-lg transition ${
                  location.pathname === '/driver'
                    ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                Driver Console
              </Link>
            )}

            {user?.role === 'admin' && (
              <Link
                to="/admin"
                className={`px-3 py-2 rounded-lg transition ${
                  location.pathname === '/admin'
                    ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                Admin Fleet
              </Link>
            )}
          </nav>

          {/* Right Controls: WebSocket Indicator, Demo Buttons, Theme & User */}
          <div className="flex items-center gap-2.5">
            {/* WebSocket Pulse Indicator */}
            <div
              title={isSocketConnected ? 'Realtime WebSocket Active' : 'Connecting to Transit Server...'}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border bg-slate-800/80 border-slate-700"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isSocketConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
              <span className="text-slate-300">{isSocketConnected ? 'LIVE FEED' : 'CONNECTING'}</span>
            </div>

            {/* Clearly Labelled Demo Step Button */}
            <div className="hidden lg:flex items-center gap-1.5 p-1 rounded-lg bg-slate-900 border border-slate-800 text-xs">
              <span className="text-[10px] font-bold text-amber-400 px-1.5 uppercase">Demo Mode:</span>
              <button
                onClick={handleDemoStep}
                disabled={isDemoLoading}
                title="Advance simulated shuttle movement along VIT campus"
                className="px-2 py-1 rounded bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 text-[11px] font-semibold flex items-center gap-1 transition"
              >
                <Sparkles className="w-3 h-3 text-indigo-400" />
                <span>Simulate Step</span>
              </button>
              <button
                onClick={handleReset}
                disabled={isDemoLoading}
                title="Reset all shuttles to inactive awaiting live hardware/GPS"
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium flex items-center gap-1 transition"
              >
                <RotateCcw className="w-3 h-3 text-slate-400" />
                <span>Reset</span>
              </button>
            </div>

            {/* Student Fare Wallet Badge Placeholder */}
            {user?.role === 'student' && (
              <div
                title="VIT Flat Fare: ₹20 per campus ride (Wallet Phase 2 Ready)"
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold"
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>₹20 Campus Pass</span>
              </div>
            )}

            <ThemeToggle />

            {/* Auth Profile / Login */}
            {isAuthenticated && user ? (
              <div className="flex items-center gap-2">
                <div className="hidden sm:block text-right">
                  <div className="text-xs font-bold text-slate-200 leading-tight">{user.full_name}</div>
                  <div className="text-[10px] uppercase font-semibold text-indigo-400">{user.role}</div>
                </div>
                <button
                  onClick={handleLogout}
                  title="Log out"
                  className="p-2 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 border border-slate-700 transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="py-1.5 px-3 rounded-lg text-xs font-semibold text-slate-200 hover:bg-slate-800 transition"
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  className="py-1.5 px-3 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
