
import React from 'react';
import {
  Activity,
  BellRing,
  Camera,
  Database,
  FolderTree,
  HardDrive,
  LayoutDashboard,
  Network,
  Percent,
  Radar,
  Server,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Waypoints
} from 'lucide-react';
import { ViewType } from '../types';

interface SidebarProps {
  currentView: ViewType;
  setView: (view: ViewType) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, setView }) => {
  const sections = [
    {
      label: 'Operate',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'topology', label: 'GPFS Topology', icon: Waypoints },
        { id: 'health', label: 'Health Status', icon: ShieldCheck },
        { id: 'events', label: 'Event Logs', icon: BellRing },
      ]
    },
    {
      label: 'Inventory',
      items: [
        { id: 'nodes', label: 'Cluster Nodes', icon: Server },
        { id: 'storage-nsds', label: 'GPFS NSDs', icon: Network },
        { id: 'storage-disks', label: 'GPFS DISKs', icon: HardDrive },
        { id: 'quotas', label: 'GPFS Quotas', icon: Percent },
        { id: 'filesets', label: 'GPFS Filesets', icon: FolderTree },
        { id: 'recovery-groups', label: 'GPFS Recovery Groups', icon: Waypoints },
        { id: 'snapshots', label: 'GPFS Snapshots', icon: Camera },
        { id: 'pdisks', label: 'GPFS Pdisks', icon: Database },
        { id: 'vdisks', label: 'GPFS Vdisks', icon: Radar },
      ]
    },
    {
      label: 'System',
      items: [
        { id: 'setup', label: 'Setup', icon: SlidersHorizontal },
        { id: 'config', label: 'Configuration', icon: Settings },
      ]
    }
  ] as const;

  return (
    <aside className="w-72 bg-[#07111f] text-slate-300 h-screen flex flex-col sticky top-0 border-r border-slate-950/80 shadow-[18px_0_54px_-34px_rgba(2,6,23,0.95)] relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(59,130,246,0.28),transparent_32%),linear-gradient(180deg,rgba(15,23,42,0),rgba(2,6,23,0.55))]" />
      <div className="relative p-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-lg bg-blue-500/15 ring-1 ring-blue-300/30 flex items-center justify-center shadow-[0_18px_40px_-26px_rgba(96,165,250,0.9)]">
            <Database className="text-blue-300" size={22} />
          </div>
          <div>
            <h1 className="text-base font-black text-white tracking-tight">GPFS Monitor</h1>
            <p className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-[0.22em] font-bold">Spectrum Scale v5.2</p>
            <p className="text-[10px] text-blue-300 mt-1 font-black uppercase tracking-[0.18em]">UI v2.1</p>
          </div>
        </div>
      </div>
      <nav className="relative flex-1 px-3 py-5 space-y-5 overflow-y-auto">
        {sections.map((section) => (
          <div key={section.label}>
            <p className="px-3 mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
              {section.label}
            </p>
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setView(item.id as ViewType)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-[0_18px_36px_-20px_rgba(59,130,246,0.95)]'
                        : 'text-slate-400 hover:bg-white/10 hover:text-slate-100'
                    }`}
                  >
                    <span className={`h-8 w-8 rounded-lg flex items-center justify-center ring-1 transition-colors ${
                      isActive ? 'bg-white/20 ring-white/20' : 'bg-white/5 ring-white/5 text-slate-500'
                    }`}>
                      <Icon size={17} />
                    </span>
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="relative p-4 border-t border-white/10">
        <div className="rounded-lg bg-white/[0.05] border border-white/10 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-emerald-300 text-xs font-black uppercase tracking-wider">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.8)]" />
              Live
            </div>
            <Activity size={14} className="text-slate-500" />
          </div>
          <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center text-xs font-bold text-white">
            GP
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium text-white truncate">gpfs-admin</p>
            <p className="text-xs text-slate-500 truncate">Cluster: oglab.cn</p>
          </div>
        </div>
      </div>
      </div>
    </aside>
  );
};

export default Sidebar;
