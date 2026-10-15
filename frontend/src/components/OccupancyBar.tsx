import React from 'react';

interface OccupancyBarProps {
  current: number;
  capacity: number;
  percentage: number;
  showNumbers?: boolean;
}

export const OccupancyBar: React.FC<OccupancyBarProps> = ({
  current,
  capacity,
  percentage,
  showNumbers = true,
}) => {
  const clampedPct = Math.min(100, Math.max(0, percentage));
  const available = Math.max(0, capacity - current);
  const isFull = current >= capacity;

  // Determine color based on occupancy level
  let barColor = 'bg-emerald-500';
  let badgeColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';

  if (clampedPct >= 90 || isFull) {
    barColor = 'bg-rose-500';
    badgeColor = 'text-rose-400 bg-rose-500/10 border-rose-500/30';
  } else if (clampedPct >= 65) {
    barColor = 'bg-amber-500';
    badgeColor = 'text-amber-400 bg-amber-500/10 border-amber-500/30';
  }

  return (
    <div className="w-full space-y-1.5">
      {showNumbers && (
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Occupancy:</span>
            <span className="font-semibold text-slate-200">
              {current} / {capacity}
            </span>
            <span className="text-slate-500">({percentage}%)</span>
          </div>
          <span
            className={`px-2 py-0.5 rounded text-[11px] font-medium border ${badgeColor}`}
          >
            {isFull ? 'FULL' : `${available} seats left`}
          </span>
        </div>
      )}
      <div className="w-full h-2.5 bg-slate-800/80 rounded-full overflow-hidden border border-slate-700/50">
        <div
          className={`h-full transition-all duration-500 ease-out rounded-full ${barColor}`}
          style={{ width: `${clampedPct}%` }}
        />
      </div>
    </div>
  );
};
