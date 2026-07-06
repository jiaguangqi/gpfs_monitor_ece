
import React from 'react';
import { Server, Database, Disc, Layers } from 'lucide-react';

interface StatsProps {
  nodeCount: number;
  pdiskCount: number;
  vdiskCount: number;
  fsCount: number;
  isDark: boolean;
}

const StatsCards: React.FC<StatsProps> = ({ nodeCount, pdiskCount, vdiskCount, fsCount, isDark }) => {
  const stats = [
    { label: 'Cluster Nodes', value: nodeCount, icon: Server, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Physical Disks', value: pdiskCount, icon: Disc, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: 'Virtual Disks (NSD)', value: vdiskCount, icon: Layers, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { label: 'Filesystems', value: fsCount, icon: Database, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {stats.map((stat, i) => (
        <div key={i} className={`border p-5 rounded-xl transition-all shadow-lg hover:translate-y-[-2px] ${isDark ? 'bg-slate-800/50 border-slate-700 hover:bg-slate-800' : 'bg-white border-slate-200 hover:shadow-xl'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{stat.label}</p>
              <p className={`text-3xl font-black mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>{stat.value}</p>
            </div>
            <div className={`${stat.bg} ${stat.color} p-3 rounded-lg`}>
              <stat.icon size={24} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default StatsCards;
