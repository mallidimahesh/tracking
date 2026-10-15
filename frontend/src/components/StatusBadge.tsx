import React from 'react';

interface StatusBadgeProps {
  status: 'active' | 'stale' | 'offline' | 'online' | 'error';
  type?: 'gps' | 'sensor';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, type = 'gps' }) => {
  let colorClasses = 'bg-slate-700 text-slate-300 border-slate-600';
  let dotClasses = 'bg-slate-400';
  let label = status.toUpperCase();

  if (status === 'active' || status === 'online') {
    colorClasses = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    dotClasses = 'bg-emerald-400 animate-pulse';
    label = type === 'gps' ? 'LIVE GPS' : 'SENSOR ONLINE';
  } else if (status === 'stale') {
    colorClasses = 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    dotClasses = 'bg-amber-400';
    label = type === 'gps' ? 'STALE GPS' : 'SENSOR STALE';
  } else if (status === 'offline') {
    colorClasses = 'bg-slate-800 text-slate-400 border-slate-700';
    dotClasses = 'bg-slate-500';
    label = type === 'gps' ? 'OFFLINE' : 'SENSOR OFFLINE';
  } else if (status === 'error') {
    colorClasses = 'bg-rose-500/15 text-rose-400 border-rose-500/30';
    dotClasses = 'bg-rose-400';
    label = 'ERROR';
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide border ${colorClasses}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotClasses}`} />
      {label}
    </span>
  );
};
