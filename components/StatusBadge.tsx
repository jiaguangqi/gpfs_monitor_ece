
import React from 'react';

interface StatusBadgeProps {
  status?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const safeStatus = status || 'unknown';
  const s = safeStatus.toLowerCase();
  
  let bgColor = 'bg-slate-100 ring-slate-200/80';
  let textColor = 'text-slate-700';
  let dotColor = 'bg-slate-400';

  if (s === 'active' || s === 'healthy' || s === 'ready' || s === 'up' || s === 'yes' || s === 'ok') {
    bgColor = 'bg-emerald-50 ring-emerald-200/80';
    textColor = 'text-emerald-700';
    dotColor = 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.65)]';
  } else if (s === 'degraded' || s === 'tips' || s === 'suspended' || s === 'warning') {
    bgColor = 'bg-amber-50 ring-amber-200/80';
    textColor = 'text-amber-700';
    dotColor = 'bg-amber-500';
  } else if (s === 'failed' || s === 'down' || s === 'error' || s === 'no') {
    bgColor = 'bg-red-50 ring-red-200/80';
    textColor = 'text-red-700';
    dotColor = 'bg-red-500';
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-black uppercase tracking-wide ring-1 ${bgColor} ${textColor}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
      {safeStatus}
    </span>
  );
};

export default StatusBadge;
