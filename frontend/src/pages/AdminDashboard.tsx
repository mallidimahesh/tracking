import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useShuttles } from '../context/ShuttleContext';
import { api } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import {
  ShieldAlert,
  Users,
  Bus,
  Cpu,
  History,
  Plus,
  Edit3,
  CheckCircle2,
  AlertCircle,
  Key,
  RotateCcw,
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const { shuttles, refreshFleet, resetFleet } = useShuttles();

  const [activeTab, setActiveTab] = useState<'fleet' | 'drivers' | 'devices' | 'audit'>('fleet');
  const [drivers, setDrivers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [newDriverEmail, setNewDriverEmail] = useState('');
  const [newDriverName, setNewDriverName] = useState('');
  const [newDriverPassword, setNewDriverPassword] = useState('');
  const [newDriverLicense, setNewDriverLicense] = useState('');
  const [newDriverPhone, setNewDriverPhone] = useState('');
  const [newDriverShuttle, setNewDriverShuttle] = useState('SH-01');

  const [newDeviceCode, setNewDeviceCode] = useState('');
  const [newDeviceShuttle, setNewDeviceShuttle] = useState('SH-01');
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);

  useEffect(() => {
    loadTabContent();
  }, [activeTab]);

  const loadTabContent = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      if (activeTab === 'drivers') {
        const res = await api.admin.getDrivers();
        setDrivers(res.drivers);
      } else if (activeTab === 'audit') {
        const res = await api.admin.getAuditLogs(40);
        setAuditLogs(res.logs);
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Failed to load data.' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.admin.createDriver({
        email: newDriverEmail,
        full_name: newDriverName,
        password: newDriverPassword,
        driver_license_no: newDriverLicense,
        phone_number: newDriverPhone,
        assigned_shuttle_code: newDriverShuttle,
      });
      setFeedback({ type: 'success', text: `Driver account for ${newDriverName} created successfully.` });
      setNewDriverEmail('');
      setNewDriverName('');
      setNewDriverPassword('');
      setNewDriverLicense('');
      setNewDriverPhone('');
      await loadTabContent();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Failed to provision driver.' });
    }
  };

  return (
    <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Admin Header */}
      <div className="glass-card p-5 sm:p-6 rounded-2xl border border-slate-700/80 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-100">Transit Fleet Administration</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                Administrator
              </span>
            </div>
            <p className="text-xs text-slate-400">VIT Vellore Campus Smart Transit Operations</p>
          </div>
        </div>

        <button
          onClick={async () => {
            await resetFleet();
            setFeedback({ type: 'success', text: 'All shuttles reset to initial inactive state.' });
          }}
          className="py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center gap-2 self-start sm:self-auto transition"
        >
          <RotateCcw className="w-4 h-4 text-slate-400" />
          <span>Reset Fleet State</span>
        </button>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 ${
            feedback.type === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 text-xs font-bold">
        <button
          onClick={() => setActiveTab('fleet')}
          className={`py-2 px-4 rounded-lg flex items-center gap-2 transition ${
            activeTab === 'fleet' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Bus className="w-4 h-4" />
          <span>Shuttle Fleet ({shuttles.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('drivers')}
          className={`py-2 px-4 rounded-lg flex items-center gap-2 transition ${
            activeTab === 'drivers' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Driver Provisioning</span>
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`py-2 px-4 rounded-lg flex items-center gap-2 transition ${
            activeTab === 'audit' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Audit Logs</span>
        </button>
      </div>

      {/* Fleet Table Tab */}
      {activeTab === 'fleet' && (
        <div className="glass-card rounded-2xl border border-slate-700/80 overflow-hidden shadow-2xl">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-100">Live Fleet Overview</h3>
            <span className="text-xs text-slate-400">Showing {shuttles.length} Registered Transit Vehicles</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/80 text-[11px] uppercase tracking-wider text-slate-400 font-bold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Vehicle No</th>
                  <th className="py-3 px-4">Shuttle Name</th>
                  <th className="py-3 px-4">Transit Route</th>
                  <th className="py-3 px-4">Driver</th>
                  <th className="py-3 px-4">GPS Status</th>
                  <th className="py-3 px-4">Speed & Heading</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {shuttles.map((s) => {
                  const routeColor = s.route_color || (s.route === 'B' ? '#2563eb' : s.route === 'C' ? '#eab308' : '#16a34a');
                  const routeName = s.route_name || (s.route === 'B' ? 'Mens Hostel Blue Route' : s.route === 'C' ? 'Out of Campus Route' : 'SJT / PRP Green Route');
                  return (
                    <tr key={s.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-400">
                        {s.vehicle_no || s.shuttle_code}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-100">{s.name}</td>
                      <td className="py-3 px-4">
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold border inline-flex items-center gap-1"
                          style={{
                            backgroundColor: `${routeColor}20`,
                            color: routeColor,
                            borderColor: `${routeColor}40`,
                          }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: routeColor }} />
                          {routeName}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {s.driver?.name || 'Assigned'}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={s.gps_status} type="gps" />
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300">
                        {s.gps_speed ? `${s.gps_speed} km/h` : '0 km/h'} • {s.gps_heading ? `${Math.round(s.gps_heading)}°` : '0°'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-emerald-400 font-semibold text-[11px]">
                          {s.gps_status === 'active' ? 'Broadcasting' : 'Standby'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Driver Provisioning Tab */}
      {activeTab === 'drivers' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Create Driver Form */}
          <form
            onSubmit={handleCreateDriver}
            className="glass-card p-5 rounded-2xl border border-slate-700/80 shadow-2xl space-y-4"
          >
            <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
              <Plus className="w-4 h-4 text-indigo-400" />
              <span>Provision New Driver</span>
            </h3>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400">Full Name</label>
              <input
                type="text"
                required
                value={newDriverName}
                onChange={(e) => setNewDriverName(e.target.value)}
                placeholder="Ramesh Kumar"
                className="w-full px-3 py-1.5 rounded-xl text-xs bg-slate-900 border border-slate-700 text-slate-200"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400">Driver Email</label>
              <input
                type="email"
                required
                value={newDriverEmail}
                onChange={(e) => setNewDriverEmail(e.target.value)}
                placeholder="driver@vitshuttle.campus"
                className="w-full px-3 py-1.5 rounded-xl text-xs bg-slate-900 border border-slate-700 text-slate-200"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400">Initial Password</label>
              <input
                type="password"
                required
                value={newDriverPassword}
                onChange={(e) => setNewDriverPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-1.5 rounded-xl text-xs bg-slate-900 border border-slate-700 text-slate-200"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400">License Number</label>
              <input
                type="text"
                value={newDriverLicense}
                onChange={(e) => setNewDriverLicense(e.target.value)}
                placeholder="TN-23-D-9999"
                className="w-full px-3 py-1.5 rounded-xl text-xs bg-slate-900 border border-slate-700 text-slate-200"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400">Assign Shuttle</label>
              <select
                value={newDriverShuttle}
                onChange={(e) => setNewDriverShuttle(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl text-xs bg-slate-900 border border-slate-700 text-slate-200"
              >
                {shuttles.map((s) => (
                  <option key={s.id} value={s.shuttle_code}>
                    {s.shuttle_code} - {s.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="w-full py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-md cursor-pointer"
            >
              Create Driver Account
            </button>
          </form>

          {/* Drivers List */}
          <div className="lg:col-span-2 glass-card p-5 rounded-2xl border border-slate-700/80 shadow-2xl space-y-3">
            <h3 className="font-bold text-sm text-slate-100">Provisioned Drivers ({drivers.length})</h3>
            <div className="divide-y divide-slate-800 text-xs">
              {drivers.map((d) => (
                <div key={d.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <h5 className="font-bold text-slate-200">{d.full_name}</h5>
                    <p className="text-[11px] text-slate-400 font-mono">{d.email}</p>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded font-mono font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/30">
                      {d.driver_profile?.assigned_shuttle_code || 'Unassigned'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Audit Log Tab */}
      {activeTab === 'audit' && (
        <div className="glass-card rounded-2xl border border-slate-700/80 overflow-hidden shadow-2xl">
          <div className="p-4 border-b border-slate-800">
            <h3 className="font-bold text-sm text-slate-100">Audit Trail History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/80 text-[11px] uppercase tracking-wider text-slate-400 font-bold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Target</th>
                  <th className="py-3 px-4">Details</th>
                  <th className="py-3 px-4 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40">
                    <td className="py-2.5 px-4 font-mono font-bold text-indigo-300">{log.action}</td>
                    <td className="py-2.5 px-4">{log.actor_name}</td>
                    <td className="py-2.5 px-4 font-mono text-slate-400">{log.target_type} #{log.target_id}</td>
                    <td className="py-2.5 px-4 text-slate-300 max-w-xs truncate">{log.details}</td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-500">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
