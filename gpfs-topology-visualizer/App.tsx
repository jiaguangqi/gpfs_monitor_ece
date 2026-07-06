
import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Database, 
  LayoutDashboard,
  Settings,
  Terminal,
  Cpu,
  ShieldAlert,
  Search,
  Bell,
  Sun,
  Moon
} from 'lucide-react';
import { CLUSTER_NODES, PDISKS, NSDS, FILESYSTEMS } from './mockData';
import StatsCards from './components/StatsCards';
import Visualizer from './components/Visualizer';
import GeminiInsight from './components/GeminiInsight';

const App: React.FC = () => {
  const [isDark, setIsDark] = useState(true);

  // 同步暗色模式类到 HTML 根节点
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  return (
    <div className={`flex min-h-screen transition-colors duration-300 ${isDark ? 'bg-[#020617] text-slate-200' : 'bg-slate-50 text-slate-900'}`}>
      {/* 侧边栏 */}
      <aside className={`w-64 border-r hidden md:flex flex-col sticky top-0 h-screen shrink-0 transition-colors ${isDark ? 'border-slate-800 bg-[#020617]' : 'border-slate-200 bg-white'}`}>
        <div className="p-8">
          <div className="flex items-center gap-3 text-blue-600 mb-12">
            <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg shadow-blue-600/30">
              <Activity size={24} />
            </div>
            <h1 className="text-xl font-black tracking-tighter uppercase italic">GPFS SCALE</h1>
          </div>

          <nav className="space-y-2">
            <SidebarItem icon={LayoutDashboard} label="Dashboard" active isDark={isDark} />
            <SidebarItem icon={Database} label="Filesystems" isDark={isDark} />
            <SidebarItem icon={Cpu} label="Node Classes" isDark={isDark} />
            <SidebarItem icon={ShieldAlert} label="Recovery Groups" isDark={isDark} />
            <SidebarItem icon={Settings} label="Settings" isDark={isDark} />
          </nav>
        </div>

        <div className="mt-auto p-6">
           <div className={`p-4 rounded-2xl border transition-colors ${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
              <p className="text-[10px] font-bold text-slate-500 uppercase mb-3">System Health</p>
              <div className="flex items-center justify-between text-xs mb-2">
                 <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Cluster Status</span>
                 <span className="text-emerald-500 font-bold text-[10px]">OPERATIONAL</span>
              </div>
              <div className={`h-1.5 w-full rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}>
                 <div className="h-full bg-emerald-500 w-full shadow-[0_0_8px_#10b981]"></div>
              </div>
           </div>
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className={`h-16 border-b flex items-center justify-between px-8 backdrop-blur-md sticky top-0 z-50 transition-colors ${isDark ? 'border-slate-800 bg-[#020617]/80' : 'border-slate-200 bg-white/80'}`}>
           <div className="flex items-center gap-4 flex-1">
              <div className="relative w-64 hidden lg:block">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                 <input 
                    className={`w-full border rounded-full py-1.5 pl-9 pr-4 text-xs focus:outline-none focus:border-blue-500 transition-colors ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'}`} 
                    placeholder="Search resources..." 
                 />
              </div>
           </div>
           
           <div className="flex items-center gap-4">
              {/* 主题切换按钮 */}
              <button 
                onClick={() => setIsDark(!isDark)}
                className={`p-2 rounded-lg border transition-all ${isDark ? 'border-slate-800 hover:bg-slate-800 text-amber-400' : 'border-slate-200 hover:bg-slate-100 text-indigo-600'}`}
                title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                {isDark ? <Sun size={18} /> : <Moon size={18} />}
              </button>

              <div className={`flex items-center gap-2 px-3 py-1 rounded-full border transition-colors ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                <span className={`text-[10px] font-bold uppercase tracking-wide ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>EC01_RG01</span>
              </div>

              <button className={`p-2 transition-colors relative ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}>
                 <Bell size={18} />
                 <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
              </button>
           </div>
        </header>

        <div className="p-4 md:p-8 max-w-7xl mx-auto w-full">
           <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
              <div>
                <h1 className={`text-3xl md:text-4xl font-black tracking-tighter mb-2 italic uppercase transition-colors ${isDark ? 'text-white' : 'text-slate-900'}`}>Storage Topology</h1>
                <p className={`text-sm font-medium transition-colors ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>IBM Spectrum Scale ECE Architecture - Real-time Visual Simulation</p>
              </div>
              <div className="flex gap-3">
                 <button className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-2 ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-sm'}`}>
                    <Terminal size={14} /> CLI
                 </button>
                 <button className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg shadow-blue-600/20 transition-all">
                    Refresh
                 </button>
              </div>
           </div>

           <StatsCards 
              nodeCount={CLUSTER_NODES.length} 
              pdiskCount={PDISKS.length} 
              vdiskCount={NSDS.length}
              fsCount={FILESYSTEMS.length} 
              isDark={isDark}
           />

           <div className={`mt-8 rounded-[2rem] border p-2 md:p-8 shadow-inner overflow-x-auto transition-colors ${isDark ? 'bg-slate-900/20 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
             <Visualizer isDark={isDark} />
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-12">
              <div className="lg:col-span-8">
                 <GeminiInsight isDark={isDark} />
              </div>
              <div className={`lg:col-span-4 rounded-3xl p-6 border transition-colors ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                 <div className="flex items-center justify-between mb-6">
                    <h3 className={`text-xs font-bold uppercase tracking-widest flex items-center gap-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                       <Terminal size={16} /> Node Status Summary
                    </h3>
                    <div className="text-[10px] text-blue-500 font-mono">ec1-ec4</div>
                 </div>
                 <div className="space-y-4">
                    {CLUSTER_NODES.map(node => (
                      <div key={node.id} className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${isDark ? 'bg-black/20 border-slate-800/50' : 'bg-slate-50 border-slate-100'}`}>
                        <div className="flex items-center gap-3">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                          <span className={`text-xs font-mono font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{node.name}</span>
                        </div>
                        <span className={`text-[10px] font-bold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>100/100 METRIC</span>
                      </div>
                    ))}
                 </div>
              </div>
           </div>
        </div>
        
        <footer className={`mt-auto p-8 border-t text-center transition-colors ${isDark ? 'border-slate-800 text-slate-600' : 'border-slate-200 text-slate-400'}`}>
           <p className="text-[10px] font-bold uppercase tracking-widest">
              GPFS MMVDISK TOPOLOGY VISUALIZER &copy; 2024
           </p>
        </footer>
      </main>
    </div>
  );
};

const SidebarItem = ({ icon: Icon, label, active = false, isDark }: { icon: any, label: string, active?: boolean, isDark: boolean }) => (
  <a href="#" className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all group ${active ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20' : (isDark ? 'text-slate-500 hover:text-white hover:bg-slate-800/50' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100')}`}>
    <Icon size={18} className={active ? 'text-white' : (isDark ? 'group-hover:text-blue-400' : 'group-hover:text-blue-600')} />
    <span className="text-sm font-bold tracking-tight">{label}</span>
  </a>
);

export default App;
