
import React, { useState } from 'react';
import { ServerNode, PDisk, VDisk, NSD } from '../types';
import { Cpu, HardDrive, LayoutGrid, ArrowRight, Layers, Database, Info } from 'lucide-react';

interface TopologyViewProps {
  nodes: ServerNode[];
  pdisks: PDisk[];
  vdisks: VDisk[];
  nsds: NSD[];
}

const TopologyView: React.FC<TopologyViewProps> = ({ nodes, pdisks, vdisks, nsds }) => {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [hoveredDisk, setHoveredDisk] = useState<string | null>(null);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <LayoutGrid className="text-blue-400" />
          Physical to Logical Topology
        </h2>
        <div className="text-sm text-slate-400 bg-slate-800/80 px-3 py-1 rounded-full border border-slate-700">
          Showing <span className="text-blue-400 font-bold">DA1</span> Declustered Array
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {nodes.map(node => (
          <div 
            key={node.name}
            className={`relative group rounded-2xl border transition-all duration-300 ${
              selectedNode === node.name ? 'bg-blue-900/10 border-blue-500 shadow-blue-500/10' : 'bg-slate-800/40 border-slate-700 hover:border-slate-500'
            }`}
            onClick={() => setSelectedNode(node.name)}
          >
            {/* Server Header */}
            <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-slate-700 p-2 rounded-lg">
                  <Cpu size={18} className="text-blue-300" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-100 uppercase tracking-wider">{node.name}</h3>
                  <p className="text-[10px] text-slate-500 uppercase">{node.topology}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${node.status === 'ok' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                <span className="text-[10px] text-slate-400 uppercase font-medium">{node.status}</span>
              </div>
            </div>

            {/* PDisks Grid */}
            <div className="p-4 grid grid-cols-5 gap-2 relative">
              {pdisks.filter(p => p.server === node.name).map((pdisk, idx) => {
                const isDiskHovered = hoveredDisk === pdisk.name;
                const someDiskHoveredInNode = hoveredDisk !== null && pdisks.find(pd => pd.name === hoveredDisk)?.server === node.name;

                // Tooltip 位置自适应逻辑
                const tooltipPosClass = idx === 0 
                  ? "left-0" 
                  : idx === 4 
                    ? "right-0" 
                    : "left-1/2 -translate-x-1/2";

                return (
                  <div 
                    key={pdisk.name}
                    onMouseEnter={() => setHoveredDisk(pdisk.name)}
                    onMouseLeave={() => setHoveredDisk(null)}
                    className={`relative aspect-square bg-slate-900 border transition-all duration-300 rounded flex items-center justify-center cursor-help z-10 ${
                      isDiskHovered 
                        ? 'border-blue-500 bg-blue-600 scale-125 shadow-lg shadow-blue-500/40 z-30' 
                        : (someDiskHoveredInNode ? 'opacity-20 border-slate-800 grayscale scale-90' : 'border-slate-700/50')
                    }`}
                  >
                    <HardDrive size={12} className={isDiskHovered ? 'text-white' : 'text-slate-500'} />
                    
                    {/* Tooltip 还原到上方浮动样式 */}
                    {isDiskHovered && (
                      <div className={`absolute bottom-full mb-4 min-w-[160px] bg-slate-950 border border-slate-700 p-4 rounded-xl shadow-2xl z-50 pointer-events-none animate-in fade-in zoom-in duration-200 ${tooltipPosClass}`}>
                        <div className="flex items-center gap-1.5 mb-2.5 pb-2 border-b border-slate-800">
                          <Info size={10} className="text-blue-400" />
                          <p className="text-[10px] font-mono font-bold text-white uppercase">{pdisk.name}</p>
                        </div>
                        <div className="space-y-1.5 text-[9px]">
                          <div className="flex justify-between items-center gap-3">
                            <span className="text-slate-500">Device:</span> 
                            <span className="text-slate-300 font-mono text-right truncate max-w-[80px]">{pdisk.osDevice}</span>
                          </div>
                          <div className="flex justify-between items-center gap-3">
                            <span className="text-slate-500">Capacity:</span> 
                            <span className="text-slate-300 text-right">{pdisk.capacity}</span>
                          </div>
                          <div className="flex justify-between items-center gap-3">
                            <span className="text-slate-500">Free:</span> 
                            <span className="text-emerald-400 font-bold text-right">{pdisk.freeSpace}</span>
                          </div>
                        </div>
                        <div className="mt-3 h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 w-[90%]" />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            {/* Stats */}
            <div className="px-4 pb-4 pt-0">
               <div className="bg-slate-900/50 rounded-lg p-2 border border-slate-700/30 flex justify-between items-center">
                  <span className="text-[10px] text-slate-500 font-medium uppercase tracking-tight">Array DA1</span>
                  <span className="text-xs font-mono text-slate-300">5 / 5 OK</span>
               </div>
            </div>
          </div>
        ))}
      </div>

      {/* Logical Mapping Connection */}
      <div className="flex flex-col items-center py-4 text-slate-600">
        <div className="w-1 h-8 bg-gradient-to-b from-slate-700 to-transparent mb-2" />
        <div className="flex items-center gap-3">
           <Layers className="text-slate-500" size={20} />
           <span className="text-xs font-semibold tracking-widest uppercase">Declustered Array Mapping (DA1)</span>
        </div>
      </div>

      {/* VDisk / NSD Layer */}
      <div className="bg-slate-800/20 border border-dashed border-slate-700 rounded-3xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {vdisks.filter(v => v.type === 'data').map((vdisk) => (
            <div key={vdisk.name} className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex items-start justify-between group hover:border-amber-500/50 transition-colors">
              <div className="flex gap-3">
                <div className="bg-amber-500/10 text-amber-500 p-2 rounded-lg group-hover:bg-amber-500 group-hover:text-slate-950 transition-colors">
                  <Database size={16} />
                </div>
                <div>
                  <h4 className="text-sm font-mono font-medium text-slate-200">{vdisk.name}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">RAID {vdisk.raidCode}</span>
                    <span className="text-[10px] text-slate-500">{vdisk.capacity}</span>
                  </div>
                </div>
              </div>
              <ArrowRight size={14} className="text-slate-700 group-hover:text-amber-500 transition-colors" />
            </div>
          ))}
        </div>
        
        <div className="mt-8 flex justify-center">
           <div className="bg-slate-800/40 p-1 rounded-full border border-slate-700 flex items-center">
              <div className="px-6 py-2 bg-blue-600 text-white text-xs font-bold rounded-full shadow-lg shadow-blue-500/20 flex items-center gap-2">
                 <LayoutGrid size={14} />
                 FS: fs01 (ONLINE)
              </div>
              <div className="px-4 py-2 text-slate-400 text-[10px] font-medium uppercase tracking-widest">
                8 Integrated NSDs
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default TopologyView;
