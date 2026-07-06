import React, { useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Database,
  Filter,
  HardDrive,
  Layers,
  Network,
  Server,
  ShieldAlert,
  Waypoints
} from 'lucide-react';
import TopologyStats from './TopologyStats';
import TopologyVisualizerFull from './TopologyVisualizerFull';
import StatusBadge from './StatusBadge';
import { GpfsDisk, PdDisk, Vdisk } from '../types';

type Props = {
  nodes: any[];
  disksByFs: Record<string, GpfsDisk[]>;
  pdisksByRg: Record<string, PdDisk[]>;
  vdisksByRg: Record<string, Vdisk[]>;
  snapshots: Record<string, any[]>;
  fsName?: string;
  mountPoint?: string;
  fsUsage?: { totalGB: number; usedGB: number; usedPct: number };
  inodeUsage?: { used: number; total: number; usedPct: number };
  nsdUsageMap?: Record<string, { sizeKB: number; freeBlocks: number; freePct: number; usagePct: number }>;
};

type VisualNsd = {
  diskName: string;
  filesystem?: string;
  failureGroup?: string | number;
  volumeId?: string;
  capacity?: string;
  usagePct?: number;
  server?: string;
};

type VisualPdisk = PdDisk & {
  rgName: string;
  server?: string;
  osDevice?: string;
  paths?: string;
};

type NodeModel = {
  id: number;
  name: string;
  matchKey: string;
  status: 'ok' | 'needs attention';
  state: string;
};

type RgModel = {
  rgName: string;
  daNames: string[];
  nodeNames: string[];
  pdiskCount: number;
  vdiskCount: number;
  badPdiskCount: number;
  pathIssueCount: number;
};

type FsModel = {
  name: string;
  nsds: VisualNsd[];
  rgNames: string[];
  vdiskNames: string[];
  usagePct?: number;
};

type DaModel = {
  rgName: string;
  daName: string;
  nodeNames: string[];
  pdiskCount: number;
  vdiskCount: number;
  badPdiskCount: number;
};

const normalizeName = (v?: string) => (v || '').trim().toLowerCase();
const unique = (values: Array<string | undefined>) => Array.from(new Set(values.map((v) => (v || '').trim()).filter(Boolean)));
const nodePageSize = 32;

const toGiB = (v?: string) => {
  const raw = parseFloat(v || '0');
  if (Number.isFinite(raw) && raw > 1024 * 1024 * 1024) return `${(raw / 1024 / 1024 / 1024).toFixed(1)} GiB`;
  return v || '';
};

const getDiskName = (d: any) => d?.nsdName || d?.diskName || '';

const isBadPdisk = (state?: string) => {
  const s = String(state || '').toLowerCase();
  return Boolean(s && s !== 'ok' && s !== 'active');
};

const Topology: React.FC<Props> = ({
  nodes,
  disksByFs,
  pdisksByRg,
  vdisksByRg,
  snapshots,
  fsName,
  mountPoint,
  fsUsage,
  inodeUsage,
  nsdUsageMap
}) => {
  const [selectedFs, setSelectedFs] = useState('all');
  const [selectedRg, setSelectedRg] = useState('all');
  const [selectedDa, setSelectedDa] = useState('all');
  const [nodeQuery, setNodeQuery] = useState('');
  const [nodePage, setNodePage] = useState(0);

  const fsCount = useMemo(() => {
    const byFsCount = Object.keys(disksByFs || {}).length;
    const snapFsCount = Object.keys(snapshots || {}).length;
    return Math.max(byFsCount, snapFsCount);
  }, [disksByFs, snapshots]);

  const topologyData = useMemo(() => {
    const vdisks = Object.entries(vdisksByRg).flatMap(([rg, arr]) => (arr || []).map((v) => ({ ...v, rgName: rg })));
    const vdiskByName = new Map<string, Vdisk & { rgName: string }>();
    vdisks.forEach((v) => {
      if (v.vdisk) vdiskByName.set(v.vdisk, v);
    });

    const nsds: VisualNsd[] = Object.entries(disksByFs).flatMap(([fs, arr]) =>
      (arr || []).map((d: any) => {
        const diskName = getDiskName(d);
        const entry = nsdUsageMap?.[diskName];
        return {
          diskName,
          filesystem: fs,
          failureGroup: d.failureGroup,
          volumeId: d.diskUID || '',
          capacity: d.diskSizeKB ? `${((parseInt(d.diskSizeKB, 10) || 0) / 1024 / 1024).toFixed(1)} GB` : '',
          usagePct: entry ? entry.usagePct : undefined,
          server: d.serverList || ''
        };
      })
    );

    const pdisks: VisualPdisk[] = Object.entries(pdisksByRg).flatMap(([rg, arr]) =>
      (arr || []).map((p: any) => {
        const pathStr = String(p.paths || '').trim();
        const hostMatch = pathStr.match(/\/\/([^/]+)\/(.+)$/);
        const hostFromPath = hostMatch ? hostMatch[1].trim().toLowerCase() : '';
        const devFromPath = hostMatch ? `/${hostMatch[2].replace(/^\/+/, '')}` : '';
        const serverFinal = normalizeName(hostFromPath || p.server);
        return {
          ...p,
          rgName: p.rgName || rg,
          server: serverFinal,
          capacity: toGiB(p.capacity) || p.capacity,
          freeSpace: toGiB(p.freeSpace) || p.freeSpace,
          osDevice: hostFromPath && devFromPath ? `${hostFromPath}:${devFromPath}` : (p.osDevice || devFromPath || ''),
          paths: p.paths || pathStr
        };
      })
    );

    const nodeModels: NodeModel[] = nodes.map((n, idx) => ({
      id: idx + 1,
      name: n.nodeName || '',
      matchKey: normalizeName(n.nodeName || ''),
      state: n.state || '',
      status: n.state === 'active' ? 'ok' : 'needs attention'
    }));

    const rgNames = unique([...Object.keys(pdisksByRg), ...Object.keys(vdisksByRg), ...pdisks.map((p) => p.rgName)]);
    const rgModels: RgModel[] = rgNames.map((rg) => {
      const rgPdisks = pdisks.filter((p) => p.rgName === rg);
      const rgVdisks = vdisks.filter((v) => v.rgName === rg);
      const pathIssues = rgPdisks.filter((p) => {
        const active = parseInt(p.activePaths || '0', 10);
        const total = parseInt(p.totalPaths || '0', 10);
        return total > 0 && active < total;
      }).length;
      return {
        rgName: rg,
        daNames: unique([...rgPdisks.map((p) => p.declusteredArray), ...rgVdisks.map((v) => v.declusteredArray)]),
        nodeNames: unique(rgPdisks.map((p) => p.server)),
        pdiskCount: rgPdisks.length,
        vdiskCount: rgVdisks.length,
        badPdiskCount: rgPdisks.filter((p) => isBadPdisk(p.state)).length,
        pathIssueCount: pathIssues
      };
    });

    const fsModels: FsModel[] = Object.entries(disksByFs).map(([fs, arr]) => {
      const fsNsds = (arr || []).map((d: any) => {
        const diskName = getDiskName(d);
        return nsds.find((n) => n.diskName === diskName) || { diskName, filesystem: fs };
      });
      const vdiskNames = unique(fsNsds.map((n) => n.diskName));
      const rgNamesForFs = unique(vdiskNames.map((name) => vdiskByName.get(name)?.rgName));
      const usageValues = fsNsds.map((n) => n.usagePct).filter((v): v is number => typeof v === 'number');
      return {
        name: fs,
        nsds: fsNsds,
        rgNames: rgNamesForFs,
        vdiskNames,
        usagePct: usageValues.length ? usageValues.reduce((sum, value) => sum + value, 0) / usageValues.length : undefined
      };
    });

    const daModels: DaModel[] = rgModels.flatMap((rg) =>
      rg.daNames.map((da) => {
        const daPdisks = pdisks.filter((p) => p.rgName === rg.rgName && p.declusteredArray === da);
        const daVdisks = vdisks.filter((v) => v.rgName === rg.rgName && v.declusteredArray === da);
        return {
          rgName: rg.rgName,
          daName: da,
          nodeNames: unique(daPdisks.map((p) => p.server)),
          pdiskCount: daPdisks.length,
          vdiskCount: daVdisks.length,
          badPdiskCount: daPdisks.filter((p) => isBadPdisk(p.state)).length
        };
      })
    );

    return { nsds, pdisks, vdisks, nodeModels, rgModels, fsModels, daModels };
  }, [disksByFs, nodes, nsdUsageMap, pdisksByRg, vdisksByRg]);

  const pdiskCount = topologyData.pdisks.length;
  const vdiskCount = topologyData.vdisks.length;

  const scope = useMemo(() => {
    const selectedFsModel = topologyData.fsModels.find((fs) => fs.name === selectedFs);
    const fsRgNames = selectedFs === 'all' || !selectedFsModel || selectedFsModel.rgNames.length === 0
      ? null
      : new Set(selectedFsModel.rgNames);

    const rgModels = topologyData.rgModels.filter((rg) => {
      if (selectedRg !== 'all' && rg.rgName !== selectedRg) return false;
      if (fsRgNames && !fsRgNames.has(rg.rgName)) return false;
      return true;
    });
    const rgNameSet = new Set(rgModels.map((rg) => rg.rgName));

    const daModels = topologyData.daModels.filter((da) => {
      if (!rgNameSet.has(da.rgName)) return false;
      if (selectedDa !== 'all' && da.daName !== selectedDa) return false;
      return true;
    });
    const daNameSet = new Set(daModels.map((da) => `${da.rgName}/${da.daName}`));

    const pdisks = topologyData.pdisks.filter((p) => {
      if (!rgNameSet.has(p.rgName)) return false;
      if (selectedDa !== 'all' && !daNameSet.has(`${p.rgName}/${p.declusteredArray}`)) return false;
      return true;
    });
    const vdisks = topologyData.vdisks.filter((v) => {
      if (!rgNameSet.has(v.rgName || '')) return false;
      if (selectedDa !== 'all' && !daNameSet.has(`${v.rgName}/${v.declusteredArray}`)) return false;
      return true;
    });
    const scopedNodeNames = new Set(pdisks.map((p) => normalizeName(p.server)).filter(Boolean));
    const q = nodeQuery.trim().toLowerCase();
    const nodeModels = topologyData.nodeModels.filter((node) => {
      if (scopedNodeNames.size > 0 && !scopedNodeNames.has(node.matchKey)) return false;
      if (q && !node.name.toLowerCase().includes(q)) return false;
      return true;
    });

    const nsds = topologyData.nsds.filter((nsd) => {
      if (selectedFs !== 'all' && nsd.filesystem !== selectedFs) return false;
      const vdisk = topologyData.vdisks.find((v) => v.vdisk === nsd.diskName);
      if (vdisk && !rgNameSet.has(vdisk.rgName || '')) return false;
      return true;
    });

    return { selectedFsModel, rgModels, daModels, pdisks, vdisks, nodeModels, nsds };
  }, [nodeQuery, selectedDa, selectedFs, selectedRg, topologyData]);

  const availableDaNames = useMemo(() => {
    if (selectedRg === 'all') return unique(topologyData.daModels.map((da) => da.daName));
    return unique(topologyData.daModels.filter((da) => da.rgName === selectedRg).map((da) => da.daName));
  }, [selectedRg, topologyData.daModels]);

  const shouldUseDetailedVisualizer =
    scope.nodeModels.length <= 24 &&
    scope.nsds.length <= 32 &&
    scope.rgModels.length <= 1 &&
    (scope.daModels.length <= 1 || selectedDa !== 'all');

  const pageCount = Math.max(1, Math.ceil(scope.nodeModels.length / nodePageSize));
  const safePage = Math.min(nodePage, pageCount - 1);
  const pagedNodes = scope.nodeModels.slice(safePage * nodePageSize, safePage * nodePageSize + nodePageSize);

  const resetPage = () => setNodePage(0);

  const setFs = (value: string) => {
    setSelectedFs(value);
    resetPage();
  };

  const setRg = (value: string) => {
    setSelectedRg(value);
    setSelectedDa('all');
    resetPage();
  };

  const setDa = (value: string) => {
    setSelectedDa(value);
    resetPage();
  };

  const visualRg = scope.rgModels[0]?.rgName || topologyData.rgModels[0]?.rgName || 'RG';
  const visualDa = scope.daModels[0]?.daName || topologyData.daModels[0]?.daName || 'DA';
  const visualNodes = scope.nodeModels.map((node) => ({
    id: node.id,
    name: node.name,
    matchKey: node.matchKey,
    topology: selectedRg === 'all' ? visualRg : selectedRg,
    status: node.status
  }));

  return (
    <div className="text-slate-900">
      <div className="max-w-[1560px] mx-auto w-full space-y-8">
        <TopologyStats
          nodeCount={nodes.length}
          pdiskCount={pdiskCount}
          vdiskCount={vdiskCount}
          fsCount={fsCount}
          isDark={false}
        />

        <section className="bg-white/95 rounded-lg border border-slate-200/80 shadow-[0_18px_44px_-34px_rgba(15,23,42,0.75)] overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/80 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center ring-1 ring-blue-100">
                <Filter size={18} />
              </div>
              <div>
                <h4 className="text-lg font-black text-slate-950">Topology Scope</h4>
                <p className="text-xs text-slate-500">
                  Auto switches from detailed topology to aggregate layout when scope exceeds 24 nodes, 32 NSDs, or multiple RG/DA.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-500">
              <span className={`h-2 w-2 rounded-full ${shouldUseDetailedVisualizer ? 'bg-emerald-500' : 'bg-blue-500'}`} />
              {shouldUseDetailedVisualizer ? 'Detailed physical view' : 'Aggregate production view'}
            </div>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <label className="space-y-1">
              <span className="text-[11px] font-black text-slate-500 uppercase tracking-wide">Filesystem</span>
              <select
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                value={selectedFs}
                onChange={(e) => setFs(e.target.value)}
              >
                <option value="all">All filesystems</option>
                {topologyData.fsModels.map((fs) => (
                  <option key={fs.name} value={fs.name}>{fs.name}</option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-[11px] font-black text-slate-500 uppercase tracking-wide">Recovery Group</span>
              <select
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                value={selectedRg}
                onChange={(e) => setRg(e.target.value)}
              >
                <option value="all">All recovery groups</option>
                {topologyData.rgModels.map((rg) => (
                  <option key={rg.rgName} value={rg.rgName}>{rg.rgName}</option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-[11px] font-black text-slate-500 uppercase tracking-wide">Declustered Array</span>
              <select
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                value={selectedDa}
                onChange={(e) => setDa(e.target.value)}
              >
                <option value="all">All DAs</option>
                {availableDaNames.map((da) => (
                  <option key={da} value={da}>{da}</option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-[11px] font-black text-slate-500 uppercase tracking-wide">Node Search</span>
              <input
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                placeholder="Filter nodes..."
                value={nodeQuery}
                onChange={(e) => {
                  setNodeQuery(e.target.value);
                  resetPage();
                }}
              />
            </label>
          </div>

          <div className="px-6 pb-6 grid grid-cols-2 lg:grid-cols-5 gap-3">
            <ScopeMetric icon={Database} label="Scoped FS" value={selectedFs === 'all' ? topologyData.fsModels.length : 1} />
            <ScopeMetric icon={Waypoints} label="Scoped RG" value={scope.rgModels.length} />
            <ScopeMetric icon={Layers} label="Scoped DA" value={scope.daModels.length} />
            <ScopeMetric icon={Server} label="Scoped Nodes" value={scope.nodeModels.length} />
            <ScopeMetric icon={HardDrive} label="Scoped PDisks" value={scope.pdisks.length} />
          </div>
        </section>

        {shouldUseDetailedVisualizer ? (
          <TopologyVisualizerFull
            isDark={false}
            fsName={selectedFs === 'all' ? fsName : selectedFs}
            mountPoint={mountPoint}
            fsUsage={fsUsage}
            inodeUsage={inodeUsage}
            nsds={scope.nsds}
            pdisks={scope.pdisks}
            vdisks={scope.vdisks}
            nodes={visualNodes}
            rgName={visualRg}
            daName={visualDa}
            masterNode={visualNodes[0]?.name || 'node'}
          />
        ) : (
          <AggregateTopology
            fsModels={topologyData.fsModels}
            rgModels={scope.rgModels}
            daModels={scope.daModels}
            nsds={scope.nsds}
            vdisks={scope.vdisks}
            nodes={scope.nodeModels}
            pagedNodes={pagedNodes}
            nodePage={safePage}
            pageCount={pageCount}
            setNodePage={setNodePage}
            selectedFs={selectedFs}
          />
        )}
      </div>
    </div>
  );
};

const ScopeMetric = ({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number }) => (
  <div className="rounded-lg border border-slate-200/80 bg-slate-50/80 px-4 py-3">
    <div className="flex items-center gap-2 text-slate-500 text-[10px] font-black uppercase tracking-wide">
      <Icon size={14} className="text-blue-500" />
      {label}
    </div>
    <div className="mt-1 text-2xl font-black text-slate-950">{value}</div>
  </div>
);

const AggregateTopology = ({
  fsModels,
  rgModels,
  daModels,
  nsds,
  vdisks,
  nodes,
  pagedNodes,
  nodePage,
  pageCount,
  setNodePage,
  selectedFs
}: {
  fsModels: FsModel[];
  rgModels: RgModel[];
  daModels: DaModel[];
  nsds: VisualNsd[];
  vdisks: Array<Vdisk & { rgName: string }>;
  nodes: NodeModel[];
  pagedNodes: NodeModel[];
  nodePage: number;
  pageCount: number;
  setNodePage: (page: number) => void;
  selectedFs: string;
}) => {
  const visibleFsModels = selectedFs === 'all' ? fsModels : fsModels.filter((fs) => fs.name === selectedFs);

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-1 bg-white/95 rounded-lg border border-slate-200/80 shadow-[0_18px_44px_-34px_rgba(15,23,42,0.75)] overflow-hidden">
          <SectionHeader icon={Database} title="Filesystems" subtitle="Capacity context and NSD fan-out" />
          <div className="p-4 space-y-3 max-h-[520px] overflow-auto">
            {visibleFsModels.map((fs) => (
              <div key={fs.name} className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-base font-black text-slate-950">{fs.name}</div>
                    <div className="text-xs text-slate-500 mt-1">{fs.nsds.length} NSDs / {fs.rgNames.length || '-'} RGs</div>
                  </div>
                  <span className="text-xs font-black text-blue-600">{typeof fs.usagePct === 'number' ? `${fs.usagePct.toFixed(1)}%` : 'N/A'}</span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-white overflow-hidden">
                  <div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.min(Math.max(fs.usagePct || 0, 0), 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="xl:col-span-2 bg-white/95 rounded-lg border border-slate-200/80 shadow-[0_18px_44px_-34px_rgba(15,23,42,0.75)] overflow-hidden">
          <SectionHeader icon={Waypoints} title="Recovery Groups" subtitle="RG health, DA distribution, server coverage" />
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
            {rgModels.map((rg) => (
              <div key={rg.rgName} className="rounded-lg border border-slate-200 bg-white p-4 shadow-[0_14px_32px_-28px_rgba(15,23,42,0.75)]">
                <div className="flex items-center justify-between">
                  <div className="font-black text-slate-950">{rg.rgName}</div>
                  <StatusBadge status={rg.badPdiskCount || rg.pathIssueCount ? 'warning' : 'healthy'} />
                </div>
                <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                  <TinyStat label="DA" value={rg.daNames.length} />
                  <TinyStat label="Nodes" value={rg.nodeNames.length} />
                  <TinyStat label="PDisk" value={rg.pdiskCount} />
                  <TinyStat label="VDisk" value={rg.vdiskCount} />
                </div>
                {(rg.badPdiskCount > 0 || rg.pathIssueCount > 0) && (
                  <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                    <ShieldAlert size={14} />
                    {rg.badPdiskCount} bad pdisks, {rg.pathIssueCount} path issues
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white/95 rounded-lg border border-slate-200/80 shadow-[0_18px_44px_-34px_rgba(15,23,42,0.75)] overflow-hidden">
        <SectionHeader icon={Layers} title="Declustered Arrays" subtitle="Compact matrix for multi-DA GPFS EC layouts" />
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
          {daModels.map((da) => (
            <div key={`${da.rgName}-${da.daName}`} className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-black uppercase tracking-wide text-slate-400">{da.rgName}</div>
                  <div className="text-xl font-black text-indigo-600">{da.daName}</div>
                </div>
                <StatusBadge status={da.badPdiskCount ? 'warning' : 'healthy'} />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <TinyStat label="Nodes" value={da.nodeNames.length} />
                <TinyStat label="PDisks" value={da.pdiskCount} />
                <TinyStat label="VDisks" value={da.vdiskCount} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white/95 rounded-lg border border-slate-200/80 shadow-[0_18px_44px_-34px_rgba(15,23,42,0.75)] overflow-hidden">
        <SectionHeader icon={Server} title="Server Node Matrix" subtitle={`${nodes.length} nodes in current scope, ${nodePageSize} per page`} />
        <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8 gap-3">
          {pagedNodes.map((node) => (
            <div key={node.name} className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Server size={15} className="text-blue-500 shrink-0" />
                  <span className="font-black text-sm text-slate-950 truncate">{node.name}</span>
                </div>
                <span className={`h-2 w-2 rounded-full shrink-0 ${node.status === 'ok' ? 'bg-emerald-500' : 'bg-red-500'}`} />
              </div>
              <div className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{node.state || 'unknown'}</div>
            </div>
          ))}
        </div>
        <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between">
          <button
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40"
            disabled={nodePage === 0}
            onClick={() => setNodePage(Math.max(0, nodePage - 1))}
          >
            <ChevronLeft size={16} />
            Previous
          </button>
          <span className="text-xs font-black uppercase tracking-wide text-slate-500">
            Page {nodePage + 1} / {pageCount}
          </span>
          <button
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40"
            disabled={nodePage >= pageCount - 1}
            onClick={() => setNodePage(Math.min(pageCount - 1, nodePage + 1))}
          >
            Next
            <ChevronRight size={16} />
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <LogicalTable
          icon={Network}
          title="NSD Sample"
          subtitle={`${nsds.length} NSDs in current scope; showing first 48`}
          rows={nsds.slice(0, 48).map((nsd) => [nsd.diskName, nsd.filesystem || '-', typeof nsd.usagePct === 'number' ? `${nsd.usagePct.toFixed(1)}%` : '-'])}
          headers={['NSD', 'Filesystem', 'Usage']}
        />
        <LogicalTable
          icon={HardDrive}
          title="VDisk Sample"
          subtitle={`${vdisks.length} VDisks total; showing first 48`}
          rows={vdisks.slice(0, 48).map((vd) => [vd.vdisk, vd.rgName || '-', vd.declusteredArray || '-'])}
          headers={['VDisk', 'RG', 'DA']}
        />
      </section>
    </div>
  );
};

const SectionHeader = ({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle: string }) => (
  <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/80 flex items-center gap-3">
    <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center ring-1 ring-blue-100">
      <Icon size={17} />
    </div>
    <div>
      <h4 className="text-base font-black text-slate-950">{title}</h4>
      <p className="text-xs text-slate-500">{subtitle}</p>
    </div>
  </div>
);

const TinyStat = ({ label, value }: { label: string; value: number }) => (
  <div className="rounded-lg bg-slate-50 border border-slate-100 px-2 py-2">
    <div className="text-lg font-black text-slate-950">{value}</div>
    <div className="text-[9px] font-black uppercase tracking-wide text-slate-400">{label}</div>
  </div>
);

const LogicalTable = ({
  icon,
  title,
  subtitle,
  headers,
  rows
}: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  headers: string[];
  rows: string[][];
}) => (
  <div className="bg-white/95 rounded-lg border border-slate-200/80 shadow-[0_18px_44px_-34px_rgba(15,23,42,0.75)] overflow-hidden">
    <SectionHeader icon={icon} title={title} subtitle={subtitle} />
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50/90 text-slate-500 uppercase text-[11px] font-black tracking-wide">
          <tr>
            {headers.map((header) => <th key={header} className="px-5 py-3">{header}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.length === 0 ? (
            <tr>
              <td className="px-5 py-8 text-center text-slate-400" colSpan={headers.length}>No records in current scope</td>
            </tr>
          ) : rows.map((row, idx) => (
            <tr key={idx} className="hover:bg-blue-50/50 transition-colors">
              {row.map((cell, cellIdx) => (
                <td key={cellIdx} className={`px-5 py-3 ${cellIdx === 0 ? 'font-mono font-semibold text-slate-900' : 'text-slate-600'}`}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export default Topology;
