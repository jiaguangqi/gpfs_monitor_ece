import React from 'react';
import { Server, Database, Disc, Layers } from 'lucide-react';

interface StatsProps {
  nodeCount: number;
  pdiskCount: number;
  vdiskCount: number;
  fsCount: number;
  isDark: boolean;
}

const TopologyStats: React.FC<StatsProps> = ({ nodeCount, pdiskCount, vdiskCount, fsCount, isDark }) => {
  const stats = [
    { label: 'Cluster Nodes', value: nodeCount, icon: Server, color: 'text-blue-600', bg: 'bg-blue-50', ring: 'ring-blue-100' },
    { label: 'Physical Disks', value: pdiskCount, icon: Disc, color: 'text-emerald-600', bg: 'bg-emerald-50', ring: 'ring-emerald-100' },
    { label: 'Virtual Disks (NSD)', value: vdiskCount, icon: Layers, color: 'text-amber-600', bg: 'bg-amber-50', ring: 'ring-amber-100' },
    { label: 'Filesystems', value: fsCount, icon: Database, color: 'text-violet-600', bg: 'bg-violet-50', ring: 'ring-violet-100' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {stats.map((stat, i) => (
        <div key={i} className={`border p-5 rounded-lg transition-all duration-200 hover:-translate-y-0.5 ${isDark ? 'bg-slate-800/70 border-slate-700 hover:bg-slate-800 shadow-lg shadow-slate-950/20' : 'bg-white/95 border-slate-200/80 shadow-[0_16px_36px_-28px_rgba(15,23,42,0.65)] hover:shadow-[0_18px_42px_-26px_rgba(15,23,42,0.75)]'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-xs font-black uppercase tracking-[0.14em] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{stat.label}</p>
              <p className={`text-4xl font-black mt-2 tracking-tight ${isDark ? 'text-white' : 'text-slate-950'}`}>{stat.value}</p>
            </div>
            <div className={`${stat.bg} ${stat.color} ${stat.ring} p-3 rounded-lg ring-1`}>
              <stat.icon size={24} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TopologyStats;
