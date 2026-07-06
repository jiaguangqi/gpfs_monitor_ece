
import React, { useState } from 'react';
import { Server, HardDrive, Layers, Database, Info } from 'lucide-react';
import { CLUSTER_NODES, PDISKS, NSDS, VDISKS } from '../mockData';
import { PDisk, NSD } from '../types';

interface VisualizerProps {
  isDark: boolean;
}

const Visualizer: React.FC<VisualizerProps> = ({ isDark }) => {
  const [activePDisk, setActivePDisk] = useState<PDisk | null>(null);
  const [activeNSD, setActiveNSD] = useState<NSD | null>(null);

  return (
    <div className="flex flex-col py-6 px-4 items-center relative w-full min-w-[1000px]">
      
      {/* 1. 文件系统层 - 降低基础 z-index 至 10，防止挡住下方的弹出框 */}
      <div className="w-full flex flex-col items-center mb-16 relative z-[10]">
        <div className={`px-10 py-5 rounded-2xl shadow-2xl border flex items-center gap-5 transform hover:scale-105 transition-all cursor-default ${isDark ? 'bg-blue-600 border-blue-400 shadow-blue-900/20' : 'bg-blue-600 border-blue-500 shadow-blue-500/30'}`}>
          <div className="bg-white/20 p-3 rounded-xl"><Database className="text-white" size={32} /></div>
          <div>
            <h2 className="text-2xl font-black text-white tracking-tighter">FILESYSTEM: fs01</h2>
            <p className="text-blue-100 text-[10px] font-bold uppercase opacity-80 tracking-widest">Type: mmvdisk | Capacity: ~400 GiB</p>
          </div>
        </div>
        <div className={`h-16 w-[2px] ${isDark ? 'data-flow' : 'bg-blue-200'}`}></div>
      </div>

      {/* 2. NSD / VDisk 层 - 提高基础 z-index 至 20，确保其子元素 tooltip 能盖过 z-10 */}
      <div className="w-full max-w-6xl relative z-[20] mb-24">
        <div className="flex items-center gap-3 mb-6 justify-center">
          <Layers className="text-blue-500" size={18} />
          <h3 className={`text-xs font-bold uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Network Shared Disks Mapping</h3>
        </div>
        
        <div className="grid grid-cols-8 gap-3 relative">
          {NSDS.map((nsd, i) => {
            const vdisk = VDISKS.find(v => v.name === nsd.diskName);
            const isHovered = activeNSD?.diskName === nsd.diskName;
            
            // Tooltip 对齐逻辑
            const tooltipPosClass = i === 0 ? "left-0" : i === 7 ? "right-0" : "left-1/2 -translate-x-1/2";

            return (
              <div 
                key={i} 
                onMouseEnter={() => setActiveNSD(nsd)}
                onMouseLeave={() => setActiveNSD(null)}
                className={`p-3 rounded-xl border transition-all group relative cursor-help ${
                  isHovered 
                    ? (isDark ? 'bg-slate-800 border-blue-500 shadow-xl scale-110 z-[100]' : 'bg-white border-blue-400 shadow-lg scale-110 z-[100]')
                    : (isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-slate-200 shadow-sm')
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <div className={`text-[10px] font-bold font-mono transition-colors ${isHovered ? 'text-blue-500' : 'text-slate-500'}`}>NSD {i+1}</div>
                  <div className={`w-1.5 h-1.5 rounded-full ${isHovered ? 'bg-blue-500 animate-ping' : 'bg-blue-500/40'}`}></div>
                </div>
                <div className={`text-[8px] font-mono break-all leading-tight min-h-[2.5em] mb-2 uppercase transition-colors ${isHovered ? (isDark ? 'text-blue-400' : 'text-blue-600') : (isDark ? 'text-slate-300' : 'text-slate-700 font-semibold')}`}>
                  {nsd.diskName}
                </div>
                <div className={`h-1.5 w-full rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                  <div className={`h-full bg-blue-500 w-[65%] transition-all ${isHovered ? 'shadow-[0_0_8px_#3b82f6]' : ''}`} />
                </div>

                {/* NSD Tooltip - 设置 z-[120] 确保处于最顶层 */}
                {isHovered && (
                  <div className={`absolute bottom-full mb-6 p-4 min-w-[240px] rounded-xl shadow-[0_30px_60px_-12px_rgba(0,0,0,0.45)] border whitespace-nowrap animate-in fade-in zoom-in duration-200 pointer-events-none z-[120] ${isDark ? 'bg-slate-950 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-900'} ${tooltipPosClass}`}>
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                      <Layers size={14} className="text-blue-500" />
                      <span className="font-mono text-[11px] font-black text-blue-500 uppercase">LOGICAL NSD INFO</span>
                    </div>
                    <div className="space-y-2.5 text-[11px]">
                      <div className="flex justify-between items-center gap-6">
                        <span className="text-slate-500 font-bold uppercase text-[9px] shrink-0 tracking-wider">Capacity</span>
                        <span className="font-black text-right">{vdisk?.capacity || '49 GiB'}</span>
                      </div>
                      <div className="flex justify-between items-center gap-6">
                        <span className="text-slate-500 font-bold uppercase text-[9px] shrink-0 tracking-wider">RAID Code</span>
                        <span className="text-right px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 font-black">{vdisk?.raidCode || '4+3p'}</span>
                      </div>
                      <div className="flex justify-between items-center gap-6">
                        <span className="text-slate-500 font-bold uppercase text-[9px] shrink-0 tracking-wider">Failure Grp</span>
                        <span className="text-right font-mono font-bold">{nsd.failureGroup}</span>
                      </div>
                      <div className="flex justify-between items-center gap-6">
                        <span className="text-slate-500 font-bold uppercase text-[9px] shrink-0 tracking-wider">Pool</span>
                        <span className="text-right text-emerald-500 font-black">system</span>
                      </div>
                      <div className="flex justify-between items-center gap-6">
                        <span className="text-slate-500 font-bold uppercase text-[9px] shrink-0 tracking-wider">Volume ID</span>
                        <span className="text-right font-mono text-[10px] opacity-70">{nsd.volumeId}</span>
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

        {/* 连线背景 */}
        <div className="absolute top-full left-0 w-full h-24 pointer-events-none overflow-visible" style={{ zIndex: -1 }}>
          <svg className="w-full h-full overflow-visible opacity-50">
            <defs>
              <linearGradient id="nsdToRgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.2" />
              </linearGradient>
            </defs>
            {NSDS.map((_, i) => {
               const startX = `${(i * 12.5) + 6.25}%`;
               return (
                 <path 
                   key={i} 
                   d={`M ${startX} -5 C ${startX} 50, 50% 30, 50% 90`} 
                   fill="none" 
                   stroke="url(#nsdToRgGrad)" 
                   strokeWidth="1.5"
                 />
               );
            })}
          </svg>
        </div>
      </div>

      {/* 3. 存储组层 (RG / DA) */}
      <div className="flex flex-col items-center w-full mb-24 relative z-[15]">
        <div className={`px-14 py-8 rounded-[3rem] border shadow-2xl relative transition-all ${isDark ? 'bg-slate-900 border-slate-700 shadow-blue-500/5' : 'bg-white border-slate-200 shadow-blue-500/10'}`}>
          <div className="flex flex-col md:flex-row items-center gap-10">
            <div className="text-center">
              <p className="text-[10px] text-slate-400 font-bold uppercase mb-1 tracking-widest">Recovery Group</p>
              <p className={`text-2xl font-black tracking-tight ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>rg01</p>
            </div>
            <div className={`h-12 w-[1px] hidden md:block ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
            <div className="text-center">
              <p className="text-[10px] text-slate-400 font-bold uppercase mb-1 tracking-widest">Declustered Array</p>
              <p className={`text-2xl font-black tracking-tight ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>DA1</p>
            </div>
            <div className={`h-12 w-[1px] hidden md:block ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
            <div className="text-center">
              <p className="text-[10px] text-slate-400 font-bold uppercase mb-1 tracking-widest">Master Node</p>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                <p className={`text-lg font-black uppercase ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>ec2</p>
              </div>
            </div>
          </div>
        </div>

        {/* 连线：RG -> Nodes */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 w-full max-w-[1200px] h-24 pointer-events-none overflow-visible" style={{ zIndex: -1 }}>
          <svg className="w-full h-full overflow-visible opacity-50">
            <defs>
               <linearGradient id="rgToNodeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.3" />
               </linearGradient>
            </defs>
            {[12.5, 37.5, 62.5, 87.5].map((x, i) => (
              <path 
                key={i} 
                d={`M 50% -10 C 50% 50, ${x}% 40, ${x}% 95`} 
                fill="none" 
                stroke="url(#rgToNodeGrad)" 
                strokeWidth="2.5"
                strokeDasharray="6,8"
                className="animate-dash-flow"
              />
            ))}
          </svg>
        </div>
      </div>

      {/* 4. 物理节点层 */}
      <div className="grid grid-cols-4 gap-6 w-full max-w-7xl relative z-[5]">
        {CLUSTER_NODES.map((node) => {
          const nodePDisks = PDISKS.filter(p => p.server === node.name);
          return (
            <div key={node.name} className={`rounded-2xl border transition-all group ${isDark ? 'bg-slate-800/30 border-slate-700/50 hover:border-slate-600' : 'bg-white border-slate-200 shadow-sm hover:shadow-md'}`}>
              <div className={`px-5 py-4 border-b flex items-center justify-between rounded-t-2xl transition-colors ${isDark ? 'bg-slate-800/50 border-slate-700/50' : 'bg-slate-50 border-slate-100'}`}>
                <div className="flex items-center gap-3">
                  <Server size={18} className="text-blue-500" />
                  <span className={`font-black text-sm tracking-tighter uppercase ${isDark ? 'text-white' : 'text-slate-900'}`}>{node.name}</span>
                </div>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full border border-emerald-500/20 font-bold">ONLINE</span>
              </div>
              
              <div className="p-5 relative">
                <div className="flex items-center justify-between mb-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <span>Physical Disks</span>
                  <span className="text-emerald-500">{nodePDisks.length} / 5 OK</span>
                </div>
                
                <div className="grid grid-cols-5 gap-2.5 relative">
                  {nodePDisks.map((p, idx) => {
                    const isHovered = activePDisk?.name === p.name;
                    const someDiskHoveredInNode = activePDisk !== null && activePDisk.server === node.name;
                    const tooltipPosClass = idx === 0 ? "left-0" : idx === 4 ? "right-0" : "left-1/2 -translate-x-1/2";

                    return (
                      <div 
                        key={p.name} 
                        onMouseEnter={() => setActivePDisk(p)}
                        onMouseLeave={() => setActivePDisk(null)}
                        className={`group relative aspect-square rounded-lg border flex items-center justify-center transition-all duration-300 cursor-pointer ${
                          isHovered 
                            ? (isDark ? 'bg-blue-600 border-blue-400 scale-125 z-[100] shadow-xl shadow-blue-500/40' : 'bg-blue-600 border-blue-500 scale-125 z-[100] shadow-xl shadow-blue-500/30') 
                            : (someDiskHoveredInNode 
                                ? 'opacity-30 scale-90 grayscale' 
                                : (isDark ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-100')
                              )
                        }`}
                      >
                        <HardDrive size={14} className={`transition-colors ${isHovered ? 'text-white' : (isDark ? 'text-slate-600' : 'text-slate-400')}`} />
                        
                        {isHovered && (
                          <div className={`absolute bottom-full mb-4 p-4 min-w-[180px] rounded-xl shadow-2xl z-[110] border whitespace-nowrap animate-in fade-in zoom-in duration-200 pointer-events-none ${isDark ? 'bg-slate-950 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-900'} ${tooltipPosClass}`}>
                            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                              <Info size={12} className="text-blue-500" />
                              <span className="font-mono text-[11px] font-black text-blue-500 uppercase">{p.name}</span>
                            </div>
                            <div className="space-y-2 text-[10px]">
                              <div className="flex justify-between items-center gap-6">
                                <span className="text-slate-500 font-bold uppercase text-[8px] shrink-0">OS Dev</span>
                                <span className="font-mono text-right">{p.osDevice}</span>
                              </div>
                              <div className="flex justify-between items-center gap-6">
                                <span className="text-slate-500 font-bold uppercase text-[8px] shrink-0">Cap</span>
                                <span className="text-right">{p.capacity}</span>
                              </div>
                              <div className="flex justify-between items-center gap-6">
                                <span className="text-slate-500 font-bold uppercase text-[8px] shrink-0">Free</span>
                                <span className="text-emerald-500 font-bold text-right">{p.freeSpace}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              
              <div className={`px-5 py-3 text-[10px] font-medium border-t rounded-b-2xl transition-colors ${isDark ? 'bg-slate-800/20 text-slate-500 border-slate-700/20' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                Topology: {node.topology}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};

export default Visualizer;
