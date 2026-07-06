import React, { useEffect, useRef, useState } from 'react';
import { Layers, Database, Terminal, Server, HardDrive, Info } from 'lucide-react';
import StatusBadge from './StatusBadge';

type NsEntry = {
  diskName: string;
  filesystem?: string;
  failureGroup?: string | number;
  volumeId?: string;
  capacity?: string;
  usagePct?: number;
};

type PdEntry = {
  pdiskName: string;
  declusteredArray: string;
  activePaths?: string;
  totalPaths?: string;
  capacity?: string;
  freeSpace?: string;
  state?: string;
  osDevice?: string;
  server?: string;
  paths?: string;
};

type VdEntry = {
  vdisk: string;
  declusteredArray: string;
  logGroup?: string;
  capacity?: string;
  raidCode?: string;
  activity?: string;
  type?: 'log' | 'data';
};

type NodeEntry = {
  id: number;
  name: string;
  matchKey?: string;
  topology: string;
  status: 'ok' | 'needs attention';
};

type Line = {
  from: { x: number; y: number };
  to: { x: number; y: number };
};

type Props = {
  isDark: boolean;
  fsName?: string;
  mountPoint?: string;
  fsUsage?: { totalGB: number; usedGB: number; usedPct: number };
  inodeUsage?: { used: number; total: number; usedPct: number };
  nsds: NsEntry[];
  pdisks: PdEntry[];
  vdisks: VdEntry[];
  nodes: NodeEntry[];
  rgName: string;
  daName: string;
  masterNode: string;
};

const TopologyVisualizerFull: React.FC<Props> = ({ isDark, fsName, mountPoint, fsUsage, inodeUsage, nsds, pdisks, vdisks, nodes, rgName, daName, masterNode }) => {
  const [activePDisk, setActivePDisk] = useState<PdEntry | null>(null);
  const [activeNSD, setActiveNSD] = useState<NsEntry | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rgRef = useRef<HTMLDivElement | null>(null);
  const nsdRef = useRef<HTMLDivElement | null>(null);
  const nodeRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [trapezoid, setTrapezoid] = useState<{ points: string; gradient?: { y1: number; y2: number } } | null>(null);

  useEffect(() => {
    const computeLines = () => {
      if (!containerRef.current || !rgRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const rgRect = rgRef.current.getBoundingClientRect();
      const start = {
        x: rgRect.left + rgRect.width / 2 - containerRect.left,
        y: rgRect.bottom - containerRect.top
      };
      const newLines: Line[] = [];
      nodes.forEach((node) => {
        const el = nodeRefs.current[node.name];
        if (!el) return;
        const rect = el.getBoundingClientRect();
        newLines.push({
          from: start,
          to: {
            x: rect.left + rect.width / 2 - containerRect.left,
            y: rect.top - containerRect.top
          }
        });
      });
      setLines(newLines);
    };
    const computeTrapezoid = () => {
      if (!containerRef.current || !rgRef.current || !nsdRef.current) return;
      const c = containerRef.current.getBoundingClientRect();
      const rg = rgRef.current.getBoundingClientRect();
      const nsd = nsdRef.current.getBoundingClientRect();
      const cx = rg.left + rg.width / 2 - c.left;
      const narrow = rg.width * 0.45;
      const bottomY = rg.top - c.top; // near RG top
      const topY = nsd.bottom - c.top; // just under NSD cards
      const topLeft = nsd.left - c.left;
      const topRight = nsd.right - c.left;
      const bottomLeft = cx - narrow / 2;
      const bottomRight = cx + narrow / 2;
      const points = `${topLeft},${topY} ${topRight},${topY} ${bottomRight},${bottomY} ${bottomLeft},${bottomY}`;
      setTrapezoid({ points, gradient: { y1: bottomY, y2: topY } });
    };
    const handle = () => requestAnimationFrame(computeLines);
    const handleTrap = () => requestAnimationFrame(computeTrapezoid);
    handle();
    handleTrap();
    window.addEventListener('resize', handle);
    window.addEventListener('resize', handleTrap);
    return () => {
      window.removeEventListener('resize', handle);
      window.removeEventListener('resize', handleTrap);
    };
  }, [nodes, nsds]);

  return (
    <div className="w-full overflow-x-auto rounded-lg border border-slate-200/80 bg-[linear-gradient(180deg,#f8fbff_0%,#f3f7fb_48%,#eef4f9_100%)] shadow-[0_24px_60px_-46px_rgba(15,23,42,0.75)]">
    <div ref={containerRef} className="flex flex-col py-8 px-5 items-center relative w-full min-w-[1120px]">
      <style>{`@keyframes dashFlow { to { stroke-dashoffset: -60; } }`}</style>
      {/* Filesystem layer */}
      <div className="w-full flex flex-col items-center mb-16 relative z-[10]">
        <div className={`px-10 py-5 rounded-lg shadow-[0_22px_60px_-34px_rgba(37,99,235,0.9)] border flex flex-col md:flex-row md:items-center gap-6 transform hover:-translate-y-0.5 transition-all cursor-default ${isDark ? 'bg-blue-600 border-blue-400 shadow-blue-900/20' : 'bg-blue-600 border-blue-500'}`}>
          <div className="bg-white/20 p-3 rounded-lg self-start md:self-center ring-1 ring-white/20"><Database className="text-white" size={32} /></div>
          <div className="space-y-1">
            <h2 className="text-2xl font-black text-white tracking-tighter">{fsName || 'FILESYSTEMS'}</h2>
            <p className="text-blue-100 text-[11px] font-bold uppercase opacity-80 tracking-widest">
              Mount: {mountPoint || 'N/A'}
            </p>
          </div>
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 w-full md:w-auto">
            <div className="bg-white/10 rounded-lg p-3 ring-1 ring-white/10">
              <div className="text-[10px] text-blue-100 font-bold uppercase tracking-wider mb-1">Capacity</div>
              <div className="flex items-center justify-between text-white text-sm font-bold mb-2">
                <span>{fsUsage ? `${fsUsage.usedGB.toFixed(1)} / ${fsUsage.totalGB.toFixed(1)} GB` : 'N/A'}</span>
                <span>{fsUsage ? `${fsUsage.usedPct.toFixed(1)}%` : '--'}</span>
              </div>
              <div className="h-2 w-full bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-white/80" style={{ width: `${Math.min(Math.max(fsUsage?.usedPct || 0, 0), 100)}%` }} />
              </div>
            </div>
            <div className="bg-white/10 rounded-lg p-3 ring-1 ring-white/10">
              <div className="text-[10px] text-blue-100 font-bold uppercase tracking-wider mb-1">Inodes</div>
              <div className="flex items-center justify-between text-white text-sm font-bold mb-2">
                <span>{inodeUsage ? `${inodeUsage.used} / ${inodeUsage.total}` : 'N/A'}</span>
                <span>{inodeUsage ? `${inodeUsage.usedPct.toFixed(1)}%` : '--'}</span>
              </div>
              <div className="h-2 w-full bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-white/80" style={{ width: `${Math.min(Math.max(inodeUsage?.usedPct || 0, 0), 100)}%` }} />
              </div>
            </div>
          </div>
        </div>
        <div className={`h-16 w-[2px] ${isDark ? 'bg-blue-500/40' : 'bg-blue-200'}`}></div>
      </div>

      {/* NSD / VDisk layer */}
      <div className="w-full max-w-6xl relative z-[20] mb-24">
        <div className="flex items-center gap-3 mb-6 justify-center">
          <Layers className="text-blue-500" size={18} />
          <h3 className={`text-xs font-bold uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Network Shared Disks Mapping</h3>
        </div>

        <div ref={nsdRef} className="grid grid-cols-8 gap-3 relative">
          {nsds.map((nsd, i) => {
            const vdisk = vdisks.find((v) => v.vdisk === nsd.diskName);
            const usage = Math.min(Math.max(nsd.usagePct ?? 0, 0), 100);
            const isHovered = activeNSD?.diskName === nsd.diskName;
            const tooltipPosClass = i === 0 ? 'left-0' : i === 7 ? 'right-0' : 'left-1/2 -translate-x-1/2';

            return (
              <div
                key={i}
                onMouseEnter={() => setActiveNSD(nsd)}
                onMouseLeave={() => setActiveNSD(null)}
                className={`p-3 rounded-lg border transition-all duration-200 group relative cursor-help ${
                  isHovered
                    ? (isDark ? 'bg-slate-800 border-blue-500 shadow-xl scale-105 z-[100]' : 'bg-white border-blue-400 shadow-[0_18px_40px_-22px_rgba(37,99,235,0.9)] scale-105 z-[100]')
                    : (isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-white/95 border-slate-200/80 shadow-[0_12px_28px_-24px_rgba(15,23,42,0.6)]')
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <div className={`text-[10px] font-bold font-mono transition-colors ${isHovered ? 'text-blue-500' : 'text-slate-500'}`}>NSD {i + 1}</div>
                  <div className={`w-1.5 h-1.5 rounded-full ${isHovered ? 'bg-blue-500 animate-ping' : 'bg-blue-500/40'}`}></div>
                </div>
                <div className={`text-[8px] font-mono break-all leading-tight min-h-[2.5em] mb-2 uppercase transition-colors ${isHovered ? (isDark ? 'text-blue-400' : 'text-blue-600') : (isDark ? 'text-slate-300' : 'text-slate-700 font-semibold')}`}>
                  {nsd.diskName}
                </div>
                <div className={`h-1.5 w-full rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                  <div
                    className={`h-full bg-blue-500 transition-all ${isHovered ? 'shadow-[0_0_8px_#3b82f6]' : ''}`}
                    style={{ width: `${usage}%` }}
                  />
                </div>

                {isHovered && (
                  <div className={`absolute bottom-full mb-6 p-4 min-w-[240px] rounded-lg shadow-[0_30px_60px_-12px_rgba(0,0,0,0.38)] border whitespace-nowrap animate-in fade-in zoom-in duration-200 pointer-events-none z-[120] ${isDark ? 'bg-slate-950 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-900'} ${tooltipPosClass}`}>
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                      <Layers size={14} className="text-blue-500" />
                      <span className="font-mono text-[11px] font-black text-blue-500 uppercase">LOGICAL NSD INFO</span>
                    </div>
                    <div className="space-y-2.5 text-[11px]">
                      <div className="flex justify-between items-center gap-6">
                        <span className="text-slate-500 font-bold uppercase text-[9px] shrink-0 tracking-wider">Capacity</span>
                        <span className="font-black text-right">{vdisk?.capacity || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center gap-6">
                        <span className="text-slate-500 font-bold uppercase text-[9px] shrink-0 tracking-wider">RAID Code</span>
                        <span className="text-right px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 font-black">{vdisk?.raidCode || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center gap-6">
                        <span className="text-slate-500 font-bold uppercase text-[9px] shrink-0 tracking-wider">Failure Grp</span>
                        <span className="text-right font-mono font-bold">{nsd.failureGroup || '-'}</span>
                      </div>
                      <div className="flex justify-between items-center gap-6">
                        <span className="text-slate-500 font-bold uppercase text-[9px] shrink-0 tracking-wider">Pool</span>
                        <span className="text-right text-emerald-500 font-black">system</span>
                      </div>
                      <div className="flex justify-between items-center gap-6">
                        <span className="text-slate-500 font-bold uppercase text-[9px] shrink-0 tracking-wider">Volume ID</span>
                        <span className="text-right font-mono text-[10px] opacity-70">{nsd.volumeId || '-'}</span>
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-[9px] text-slate-500 uppercase font-black tracking-widest">Health</span>
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                        <span className="text-[10px] text-emerald-500 font-black uppercase tracking-tighter">Ready</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* RG layer */}
      <div className="flex flex-col items-center w-full mb-24 relative z-[15]">
        <div ref={rgRef} className={`px-14 py-8 rounded-[2rem] border relative transition-all ${isDark ? 'bg-slate-900 border-slate-700 shadow-blue-500/5' : 'bg-white/95 border-slate-200 shadow-[0_22px_60px_-40px_rgba(37,99,235,0.7)]'}`}>
          <div className="flex flex-col md:flex-row items-center gap-10">
            <div className="text-center">
              <p className="text-[10px] text-slate-400 font-bold uppercase mb-1 tracking-widest">Recovery Group</p>
              <p className={`text-2xl font-black tracking-tight ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>{rgName}</p>
            </div>
            <div className={`h-12 w-[1px] hidden md:block ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
            <div className="text-center">
              <p className="text-[10px] text-slate-400 font-bold uppercase mb-1 tracking-widest">Declustered Array</p>
              <p className={`text-2xl font-black tracking-tight ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>{daName}</p>
            </div>
            <div className={`h-12 w-[1px] hidden md:block ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
            <div className="text-center">
              <p className="text-[10px] text-slate-400 font-bold uppercase mb-1 tracking-widest">Master Node</p>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                <p className={`text-lg font-black uppercase ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{masterNode}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Spotlight trapezoid from RG to NSDs */}
      {trapezoid && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-[8]">
          <defs>
            <linearGradient
              id="rg-nsd-gradient"
              x1="0"
              x2="0"
              y1={trapezoid.gradient?.y1 ?? 0}
              y2={trapezoid.gradient?.y2 ?? 0}
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.26" />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon points={trapezoid.points} fill="url(#rg-nsd-gradient)" />
        </svg>
      )}

      {/* Physical nodes */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-[9]">
        {lines.map((line, idx) => {
          const midY = line.from.y + (line.to.y - line.from.y) / 2;
          const d = `M ${line.from.x} ${line.from.y} C ${line.from.x} ${midY}, ${line.to.x} ${midY}, ${line.to.x} ${line.to.y}`;
          return (
            <path
              key={idx}
              d={d}
              fill="none"
              stroke="#b7c8dd"
              strokeWidth="1.5"
              strokeDasharray="6 6"
              style={{ animation: 'dashFlow 6s linear infinite' }}
              strokeLinecap="round"
            />
          );
        })}
      </svg>

      <div className="grid grid-cols-4 gap-5 w-full max-w-7xl relative z-[10]">
        {nodes.map((node) => {
                  const nodeKey = (node.matchKey || node.name || '').toLowerCase();
                  const nodePDisks = pdisks.filter((p) => (p.server || '').toLowerCase() === nodeKey);
                  return (
                    <div
                      key={node.name}
              ref={(el) => { nodeRefs.current[node.name] = el; }}
              className={`rounded-lg border transition-all duration-200 group ${isDark ? 'bg-slate-800/30 border-slate-700/50 hover:border-slate-600' : 'bg-white/95 border-slate-200/80 shadow-[0_16px_38px_-30px_rgba(15,23,42,0.75)] hover:-translate-y-0.5 hover:shadow-[0_18px_44px_-30px_rgba(15,23,42,0.85)]'}`}>
              <div className={`px-5 py-4 border-b flex items-center justify-between rounded-t-lg transition-colors ${isDark ? 'bg-slate-800/50 border-slate-700/50' : 'bg-slate-50/90 border-slate-100'}`}>
                <div className="flex items-center gap-3">
                  <Server size={18} className="text-blue-500" />
                  <span className={`font-black text-sm tracking-tighter uppercase ${isDark ? 'text-white' : 'text-slate-900'}`}>{node.name}</span>
                </div>
                <StatusBadge status={node.status === 'ok' ? 'healthy' : 'failed'} />
              </div>

              <div className="p-5 relative">
                <div className="flex items-center justify-between mb-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <span>Physical Disks</span>
                  <span className="text-emerald-500">{nodePDisks.length} disks</span>
                </div>

                    <div className="grid grid-cols-5 gap-2.5 relative">
                      {nodePDisks.map((p, idx) => {
                        const isHovered = activePDisk?.pdiskName === p.pdiskName;
                        const someDiskHoveredInNode = activePDisk !== null && (activePDisk.server || '').toLowerCase().includes(node.name.toLowerCase());
                        const tooltipPosClass = idx === 0 ? 'left-0' : idx === 4 ? 'right-0' : 'left-1/2 -translate-x-1/2';
                        const state = String(p.state || '').toLowerCase();
                        const isHealthy = state.startsWith('ok');
                        const diskBg = isHealthy
                          ? (isHovered
                              ? (isDark ? 'bg-blue-600 border-blue-400' : 'bg-blue-600 border-blue-500')
                              : (isDark ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-100'))
                          : (isHovered
                              ? 'bg-red-600 border-red-400'
                              : 'bg-red-100 border-red-300');
                        const diskIcon = isHealthy
                          ? (isHovered ? 'text-white' : (isDark ? 'text-slate-600' : 'text-slate-400'))
                          : 'text-red-700';

                        return (
                          <div
                            key={p.pdiskName}
                            onMouseEnter={() => setActivePDisk(p)}
                            onMouseLeave={() => setActivePDisk(null)}
                            className={`group relative aspect-square rounded-lg border flex items-center justify-center transition-all duration-300 cursor-pointer ${
                          isHovered
                            ? `${diskBg} scale-125 z-[100] shadow-xl ${isHealthy ? 'shadow-blue-500/30' : 'shadow-red-400/30'}`
                            : (someDiskHoveredInNode
                                ? 'opacity-30 scale-90 grayscale'
                                : diskBg)
                        }`}
                          >
                        <HardDrive size={14} className={`transition-colors ${diskIcon}`} />

                        {isHovered && (
                          <div className={`absolute bottom-full mb-4 p-4 min-w-[180px] rounded-lg shadow-2xl z-[110] border whitespace-nowrap animate-in fade-in zoom-in duration-200 pointer-events-none ${isDark ? 'bg-slate-950 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-900'} ${tooltipPosClass}`}>
                            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                              <Info size={12} className="text-blue-500" />
                              <span className="font-mono text-[11px] font-black text-blue-500 uppercase">{p.pdiskName}</span>
                            </div>
                            <div className="space-y-2 text-[10px]">
                          <div className="flex justify-between items-center gap-6">
                            <span className="text-slate-500 font-bold uppercase text-[8px] shrink-0">OS Dev</span>
                            <span className="font-mono text-right">{p.osDevice || p.paths || '-'}</span>
                          </div>
                          <div className="flex justify-between items-center gap-6">
                            <span className="text-slate-500 font-bold uppercase text-[8px] shrink-0">Cap</span>
                            <span className="text-right">{p.capacity || '-'}</span>
                          </div>
                          <div className="flex justify-between items-center gap-6">
                            <span className="text-slate-500 font-bold uppercase text-[8px] shrink-0">Free</span>
                            <span className="text-emerald-500 font-bold text-right">{p.freeSpace || '-'}</span>
                          </div>
                          <div className="flex justify-between items-center gap-6">
                            <span className="text-slate-500 font-bold uppercase text-[8px] shrink-0">State</span>
                            <span className={`text-right font-bold ${isHealthy ? 'text-emerald-500' : 'text-red-600'}`}>{p.state || '-'}</span>
                          </div>
                        </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className={`px-5 py-3 text-[10px] font-medium border-t rounded-b-lg transition-colors ${isDark ? 'bg-slate-800/20 text-slate-500 border-slate-700/20' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                Topology: {node.topology}
              </div>
            </div>
          );
        })}
      </div>
    </div>
    </div>
  );
};

export default TopologyVisualizerFull;
