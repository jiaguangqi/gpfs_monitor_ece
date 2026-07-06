
import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import StatusBadge from './components/StatusBadge';
import Topology from './components/Topology';
import { parseGpfsOutput } from './services/parser';
import { 
  GpfsNode, 
  GpfsConfig, 
  GpfsNSD, 
  GpfsDisk, 
  ClusterSummary, 
  HealthEvent, 
  ViewType,
  FsUsage,
  InodeUsage,
  PdDisk,
  Vdisk,
  EventLogEntry,
  WebhookConfig,
  GpfsQuota,
  GpfsFileset
} from './types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell 
} from 'recharts';
import {
  Activity,
  AlertTriangle,
  Bell,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Cpu,
  Database,
  Download,
  Folder,
  FolderTree,
  HardDrive,
  Network,
  Percent,
  RefreshCw,
  Search,
  Send,
  Server,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  UserCircle,
  X
} from 'lucide-react';

const REFRESH_INTERVAL = 5 * 60 * 1000; // 5分钟

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  `${window.location.protocol}//${window.location.hostname}:3001`;

const VIEW_TITLES: Record<ViewType, { title: string; description: string }> = {
  dashboard: { title: 'Cluster Overview', description: 'Live IBM Storage Scale telemetry and capacity signals' },
  topology: { title: 'GPFS Physical Topology', description: 'Filesystem, NSD, recovery group, declustered array, and node disk mapping' },
  nodes: { title: 'Cluster Nodes', description: 'Node state, quorum, and GPFS membership from mmgetstate' },
  'storage-nsds': { title: 'GPFS NSDs', description: 'Network shared disk ownership and usage by filesystem' },
  'storage-disks': { title: 'GPFS Disks', description: 'Disk status, availability, metadata, data, and storage pools' },
  quotas: { title: 'GPFS Quotas', description: 'Filesystem user, group, and fileset quota usage from mmlsquota' },
  filesets: { title: 'GPFS Filesets', description: 'Fileset status, junction path, inode space, and ownership attributes from mmlsfileset' },
  'recovery-groups': { title: 'GPFS Recovery Groups', description: 'Recovery group, DA, pdisk, vdisk, NSD, and filesystem relationship map' },
  snapshots: { title: 'GPFS Snapshots', description: 'Filesystem snapshot inventory and expiration status' },
  pdisks: { title: 'Physical Disks', description: 'Recovery group physical disk pathing and free capacity' },
  vdisks: { title: 'Virtual Disks', description: 'Declustered array vdisk activity, RAID, and checksum detail' },
  events: { title: 'Event Logs', description: 'Locally captured GPFS health anomalies and alert history' },
  setup: { title: 'Setup', description: 'Feishu webhooks, notification filters, and backend polling controls' },
  config: { title: 'Configuration', description: 'Cluster configuration values returned by mmlsconfig' },
  health: { title: 'Health Status', description: 'Component health rollup from mmhealth cluster show' },
};

const panelClass = 'bg-white/90 backdrop-blur-xl rounded-lg border border-slate-200/80 shadow-[0_22px_70px_-46px_rgba(15,23,42,0.78)] ring-1 ring-white/80';
const surfaceClass = 'bg-white/75 backdrop-blur-xl rounded-lg border border-slate-200/70 shadow-[0_18px_54px_-42px_rgba(15,23,42,0.72)] ring-1 ring-white/70';
const softButtonClass = 'inline-flex items-center gap-2 rounded-lg border border-slate-200/90 bg-white/85 px-3.5 py-2 text-xs font-black text-slate-600 shadow-sm shadow-slate-200/60 transition-all hover:-translate-y-px hover:border-blue-200 hover:bg-blue-50/60 hover:text-blue-700';

const MiniMetric = ({
  icon: Icon,
  label,
  value,
  detail,
  tone = 'blue'
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  detail?: React.ReactNode;
  tone?: 'blue' | 'green' | 'red' | 'amber' | 'slate';
}) => {
  const toneMap = {
    blue: 'bg-blue-50 text-blue-600 ring-blue-100',
    green: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
    red: 'bg-red-50 text-red-600 ring-red-100',
    amber: 'bg-amber-50 text-amber-600 ring-amber-100',
    slate: 'bg-slate-50 text-slate-600 ring-slate-100'
  };

  return (
    <div className={`${panelClass} group relative overflow-hidden p-5 min-h-[126px] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_28px_80px_-48px_rgba(37,99,235,0.75)]`}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-emerald-400 to-amber-400 opacity-70" />
      <div className="flex items-start gap-4">
        <div className={`h-12 w-12 rounded-lg ring-1 flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105 ${toneMap[tone]}`}>
          <Icon size={24} />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
          <div className="mt-1 text-2xl font-black text-slate-950 tracking-tight">{value}</div>
          {detail && <div className="mt-2 text-xs font-semibold text-slate-500">{detail}</div>}
        </div>
      </div>
    </div>
  );
};

const FilterButton = ({ children }: { children: React.ReactNode }) => (
  <button className={softButtonClass}>
    {children}
    <ChevronDown size={14} className="text-slate-400" />
  </button>
);

const ProgressLine = ({ label, value, caption, tone = 'green' }: { label: string; value: number; caption: string; tone?: 'green' | 'amber' | 'red' | 'blue' }) => {
  const color = tone === 'red' ? 'bg-red-500' : tone === 'amber' ? 'bg-amber-500' : tone === 'blue' ? 'bg-blue-500' : 'bg-emerald-500';
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-slate-700">{label}</span>
        <span className="font-bold text-slate-700">{value.toFixed(1)}%</span>
      </div>
      <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden ring-1 ring-slate-200/70">
        <div className={`h-full rounded-full ${color} shadow-[0_0_14px_rgba(59,130,246,0.28)]`} style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }} />
      </div>
      <div className="text-xs text-slate-500 text-right">{caption}</div>
    </div>
  );
};

const mergeEventLogs = (events: EventLogEntry[]) => {
  const seen = new Set<string>();
  return events
    .filter((event) => {
      const key = event.id || `${event.timestamp}-${event.source}-${event.message}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 200);
};

const decodeGpfsValue = (value?: string) => {
  if (!value) return '';
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const toNumber = (value?: string) => {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
};

const formatKib = (value?: string, empty = '-') => {
  const n = toNumber(value);
  if (!n) return empty;
  if (n >= 1024 * 1024 * 1024) return `${(n / 1024 / 1024 / 1024).toFixed(2)} TiB`;
  if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(2)} GiB`;
  if (n >= 1024) return `${(n / 1024).toFixed(2)} MiB`;
  return `${n.toLocaleString()} KiB`;
};

const formatBytes = (value?: string, empty = '-') => {
  const n = toNumber(value);
  if (!n) return empty;
  if (n >= 1024 ** 4) return `${(n / 1024 ** 4).toFixed(2)} TiB`;
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(2)} GiB`;
  if (n >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(2)} MiB`;
  if (n >= 1024) return `${(n / 1024).toFixed(2)} KiB`;
  return `${n.toLocaleString()} B`;
};

const quotaPercent = (row: GpfsQuota) => {
  const usage = toNumber(row.blockUsage);
  const quota = toNumber(row.blockQuota) || toNumber(row.blockLimit);
  return quota > 0 ? (usage / quota) * 100 : 0;
};

const quotaDisplayName = (row: GpfsQuota) => {
  if (row.quotaType === 'FILESET') return decodeGpfsValue(row.filesetname || row.filesetName || row.name || 'fileset');
  return row.name && row.name !== '-' ? row.name : row.id || '-';
};

const App: React.FC = () => {
  const [view, setView] = useState<ViewType>('dashboard');
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  
  const [nodes, setNodes] = useState<GpfsNode[]>([]);
  const [configs, setConfigs] = useState<GpfsConfig[]>([]);
  const [nsds, setNsds] = useState<GpfsNSD[]>([]);
  const [disks, setDisks] = useState<GpfsDisk[]>([]);
  const [disksByFs, setDisksByFs] = useState<Record<string, GpfsDisk[]>>({});
  const [clusterSummary, setClusterSummary] = useState<ClusterSummary[]>([]);
  const [healthEvents, setHealthEvents] = useState<HealthEvent[]>([]);
  const [fsUsage, setFsUsage] = useState<FsUsage | null>(null);
  const [inodeUsage, setInodeUsage] = useState<InodeUsage | null>(null);
  const [nsdUsageMap, setNsdUsageMap] = useState<Record<string, { sizeKB: number; freeBlocks: number; freePct: number; usagePct: number }>>({});
  const [collapsedFs, setCollapsedFs] = useState<Record<string, boolean>>({});
  const [snapshots, setSnapshots] = useState<Record<string, any[]>>({});
  const [totalSnapshots, setTotalSnapshots] = useState<number>(0);
  const [primaryFsName, setPrimaryFsName] = useState<string>('');
  const [primaryMountPoint, setPrimaryMountPoint] = useState<string>('');
  const [nodeClassMap, setNodeClassMap] = useState<Record<string, string>>({});
  const [pdisksByRg, setPdisksByRg] = useState<Record<string, PdDisk[]>>({});
  const [vdisksByRg, setVdisksByRg] = useState<Record<string, Vdisk[]>>({});
  const [recoveryGroups, setRecoveryGroups] = useState<any[]>([]);
  const [recoveryGroupDetails, setRecoveryGroupDetails] = useState<Record<string, {
    servers: any[];
    arrays: any[];
    logGroups: any[];
    pdisks: any[];
    vdisks: any[];
    vdiskSets: any[];
  }>>({});
  const [recoveryGroupFilter, setRecoveryGroupFilter] = useState<string>('all');
  const [quotaRows, setQuotaRows] = useState<GpfsQuota[]>([]);
  const [filesets, setFilesets] = useState<GpfsFileset[]>([]);
  const [quotaGroupMembers, setQuotaGroupMembers] = useState<Record<string, string[]>>({});
  const [quotaFsFilter, setQuotaFsFilter] = useState<string>('all');
  const [quotaView, setQuotaView] = useState<'all' | 'users' | 'groups' | 'filesets'>('all');
  const [quotaGroupFilter, setQuotaGroupFilter] = useState<string>('all');
  const [eventLogs, setEventLogs] = useState<EventLogEntry[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [notifySeverities, setNotifySeverities] = useState<Set<string>>(new Set(['error', 'warning']));
  const [newWebhook, setNewWebhook] = useState<{ name: string; url: string }>({ name: '', url: '' });
  const [backendConfig, setBackendConfig] = useState<any>(null);
  const [nodeTopologyMap, setNodeTopologyMap] = useState<Record<string, { matchingMetric?: string; diskTopology?: string; needsAttention?: string }>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [dataError, setDataError] = useState<string | null>(null);
  const [settingsDirty, setSettingsDirty] = useState(false);
  const [selectedNode, setSelectedNode] = useState<GpfsNode | null>(null);

  const matchesSearch = useCallback((...values: unknown[]) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return values.some((value) => {
      if (value === null || value === undefined) return false;
      if (typeof value === 'object') {
        return JSON.stringify(value).toLowerCase().includes(q);
      }
      return String(value).toLowerCase().includes(q);
    });
  }, [searchQuery]);

  const exportJson = useCallback((filename: string, payload: unknown) => {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, []);

  const renderInventoryToolbar = (
    filters: string[],
    exportName: string,
    payload: unknown,
    actions?: React.ReactNode
  ) => (
    <div className={`${surfaceClass} px-5 py-4 flex flex-wrap items-center justify-between gap-3`}>
      <div className="flex flex-wrap items-center gap-2">
        {filters.map((filter) => <FilterButton key={filter}>{filter}</FilterButton>)}
      </div>
      <div className="flex items-center gap-2">
        {actions}
        <button
          className={softButtonClass}
          onClick={() => setSearchQuery('')}
        >
          Reset
        </button>
        <button
          className={softButtonClass}
          onClick={loadData}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
        <button
          className={softButtonClass}
          onClick={() => exportJson(exportName, payload)}
        >
          <Download size={14} />
          Export
        </button>
      </div>
    </div>
  );

  const renderTableFooter = (visible: number, total: number, label: string) => (
    <div className="px-5 py-4 border-t border-slate-100/90 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
      <span className="text-sm font-semibold text-slate-500">
        Showing {visible > 0 ? `1 to ${visible}` : '0 to 0'} of {total} {label}
      </span>
      <div className="flex items-center gap-2">
        <button className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-blue-600"><ChevronLeft size={16} /></button>
        <button className="h-9 w-9 inline-flex items-center justify-center rounded-lg bg-blue-600 text-white text-sm font-black shadow-[0_12px_24px_-14px_rgba(37,99,235,0.9)]">1</button>
        <button className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-blue-600"><ChevronRight size={16} /></button>
        <FilterButton>20 / page</FilterButton>
      </div>
    </div>
  );

  // 核心逻辑：从后端 API 获取真实数据
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // 假设后端运行在同一台机器的 3001 端口
      const response = await fetch(`${API_BASE_URL}/api/status`);
      if (!response.ok) throw new Error('Network response was not ok');
      
      const data = await response.json();
      setDataError(null);
      
      // 解析后端返回的各命令 -Y 原始字符串
      const parsedNodes = parseGpfsOutput<GpfsNode>(data.mmgetstate);
      const parsedConfigs = parseGpfsOutput<GpfsConfig>(data.mmlsconfig);
      setNodes(parsedNodes);
      setConfigs(parsedConfigs);

      const parsedClusterSummary = parseGpfsOutput<ClusterSummary>(data.mmhealth_cluster);
      const parsedHealthEvents = parseGpfsOutput<HealthEvent>(data.mmhealth_node);
      const componentHealthEvents: HealthEvent[] = [];
      if (data.mmhealth_components && typeof data.mmhealth_components === 'object') {
        Object.entries(data.mmhealth_components as Record<string, string>).forEach(([comp, raw]) => {
          parseGpfsOutput<any>(raw || '').forEach((row: any) => {
            const status = String(
              row.status ||
              row.Status ||
              row.state ||
              row.State ||
              row.eventStatus ||
              row.EventStatus ||
              ''
            ).toUpperCase();
            if (!['FAILED', 'ERROR', 'DEPEND'].includes(status)) return;
            const message =
              row.reasons ||
              row.reason ||
              row.Reasons ||
              row.details ||
              row.message ||
              row.Message ||
              status;
            componentHealthEvents.push({
              node: row.nodeName || row.node || row.Node || row.resource || row.Resource || '-',
              component: row.component || row.Component || comp,
              event: status,
              severity: status.toLowerCase(),
              message,
              activeSince: row.lastChanged || row.lastUpdate || row.activeSince || ''
            });
          });
        });
      }
      setClusterSummary(parsedClusterSummary);
      setHealthEvents([...parsedHealthEvents, ...componentHealthEvents]);

      const nsdFsMap: Record<string, string> = {};
      if (data.mmlsnsd_fsOnly) {
        const fsOnlyList = parseGpfsOutput<GpfsNSD>(data.mmlsnsd_fsOnly);
        fsOnlyList.forEach((n) => {
          if (n.diskName && n.fileSystem) {
            nsdFsMap[n.diskName] = n.fileSystem;
          }
        });
      }

      const parsedNsds = parseGpfsOutput<GpfsNSD>(data.mmlsnsd).map((n) => ({
        ...n,
        fileSystem: n.fileSystem || nsdFsMap[n.diskName] || '',
      }));
      setNsds(parsedNsds);

      const parsedDisksByFs: Record<string, GpfsDisk[]> = {};
      let flatDisks: GpfsDisk[] = [];
      if (typeof data.mmlsdisk === 'string') {
        const list = parseGpfsOutput<GpfsDisk>(data.mmlsdisk);
        parsedDisksByFs['default'] = list;
        flatDisks = list;
      } else if (data.mmlsdisk && typeof data.mmlsdisk === 'object') {
        Object.entries(data.mmlsdisk as Record<string, string>).forEach(([fsName, raw]) => {
          const list = parseGpfsOutput<GpfsDisk>(raw || '').map((d) => ({ ...d, filesystem: fsName }));
          parsedDisksByFs[fsName] = list;
          flatDisks = flatDisks.concat(list);
        });
      }
      setDisks(flatDisks);
      setDisksByFs(parsedDisksByFs);
      const fsNames = Object.keys(parsedDisksByFs);
      setPrimaryFsName(fsNames[0] || primaryFsName || '');

      const parsedQuotaRows: GpfsQuota[] = [];
      const parseQuotaRaw = (raw: string | undefined, source: GpfsQuota['source'], fallbackFs?: string, fallbackFileset?: string) => {
        parseGpfsOutput<GpfsQuota>(raw || '').forEach((row) => {
          parsedQuotaRows.push({
            ...row,
            filesystemName: row.filesystemName || fallbackFs || '',
            filesetname: row.filesetname || row.filesetName || fallbackFileset || '',
            source,
          });
        });
      };

      if (data.mmlsquota_by_fs && typeof data.mmlsquota_by_fs === 'object') {
        Object.entries(data.mmlsquota_by_fs as Record<string, string>).forEach(([fsName, raw]) => {
          parseQuotaRaw(raw, 'active', fsName);
        });
      } else if (data.mmlsquota) {
        parseQuotaRaw(data.mmlsquota, 'active', fsNames[0] || primaryFsName || '');
      }

      if (data.mmlsquota_defaults && typeof data.mmlsquota_defaults === 'object') {
        Object.entries(data.mmlsquota_defaults as Record<string, Record<string, string>>).forEach(([fsName, defaults]) => {
          Object.values(defaults || {}).forEach((raw) => parseQuotaRaw(raw, 'default', fsName));
        });
      }

      if (data.mmlsquota_filesets && typeof data.mmlsquota_filesets === 'object') {
        Object.entries(data.mmlsquota_filesets as Record<string, Record<string, string>>).forEach(([fsName, byFileset]) => {
          Object.entries(byFileset || {}).forEach(([fileset, raw]) => parseQuotaRaw(raw, 'fileset', fsName, fileset));
        });
      }

      const parsedFilesets: GpfsFileset[] = [];
      if (data.mmlsfileset && typeof data.mmlsfileset === 'object') {
        Object.entries(data.mmlsfileset as Record<string, string>).forEach(([fsName, raw]) => {
          parseGpfsOutput<GpfsFileset>(raw || '').forEach((fileset) => {
            parsedFilesets.push({
              ...fileset,
              filesystemName: fileset.filesystemName || fsName,
              path: decodeGpfsValue(fileset.path),
              comment: decodeGpfsValue(fileset.comment),
            });
          });
        });
      }
      setQuotaRows(parsedQuotaRows);
      setFilesets(parsedFilesets);
      setQuotaGroupMembers(data.quota_group_members || {});

      // 解析 mmdf 获取容量和 inode 信息
      const mmdfRecords = parseGpfsOutput<any>(data.mmdf);
      const fsTotal = mmdfRecords.find((r: any) => r.fsSize !== undefined);
      const inodeInfo = mmdfRecords.find((r: any) => r.maxInodes !== undefined);
      const nsdUsage: Record<string, { sizeKB: number; freeBlocks: number; freePct: number; usagePct: number }> = {};

      mmdfRecords
        .filter((r: any) => r.nsdName !== undefined)
        .forEach((r: any) => {
          const sizeKB = parseInt(r.diskSize || r.diskSizeKB || '0', 10);
          const freeBlocks = parseInt(r.freeBlocks || '0', 10);
          const freePct = parseFloat(r.freeBlocksPct || '0');
          const usagePct = 100 - freePct;
          nsdUsage[r.nsdName] = { sizeKB, freeBlocks, freePct, usagePct };
        });

      setNsdUsageMap(nsdUsage);

      // 解析 snapshot 信息
      const snapshotMap: Record<string, any[]> = {};
      let snapshotCount = 0;
      const decodeField = (v?: string) => {
        if (!v) return v;
        try {
          return decodeURIComponent(v);
        } catch {
          return v.replace(/%3A/gi, ':');
        }
      };

      if (data.snapshots) {
        Object.entries(data.snapshots as Record<string, string>).forEach(([fsName, raw]) => {
          const list = parseGpfsOutput<any>(raw || '').map((item: any) => ({
            ...item,
            created: decodeField(item.created),
            expirationTime: decodeField(item.expirationTime),
          }));
          snapshotMap[fsName] = list;
          snapshotCount += list.length;
        });
      }
      setSnapshots(snapshotMap);
      setTotalSnapshots(snapshotCount);

      // 解析 nodeclass 信息，生成 node class -> members 映射
      if (data.mmlsnodeclass) {
        const ncList = parseGpfsOutput<any>(data.mmlsnodeclass);
        const ncMap: Record<string, string> = {};
        ncList.forEach((nc) => {
          const key = (nc.nodeClassName || '').toLowerCase();
          if (key && nc.members) {
            ncMap[key] = nc.members;
          }
        });
        setNodeClassMap(ncMap);
      }

      // 解析 mmvdisk 信息
      const pdiskMap: Record<string, PdDisk[]> = {};
      const vdiskMap: Record<string, Vdisk[]> = {};
      const rgSummaryRows = parseGpfsOutput<any>(data.mmvdisk_rg_list || '');
      const rgDetailsMap: Record<string, {
        servers: any[];
        arrays: any[];
        logGroups: any[];
        pdisks: any[];
        vdisks: any[];
        vdiskSets: any[];
      }> = {};
      const pdiskServerMap: Record<string, string> = {};
      const pdiskPathMap: Record<string, string> = {};
      if (data.mmlspdisk) {
        parseGpfsOutput<any>(data.mmlspdisk).forEach((p) => {
          if (p.pdiskName && p.server) {
            pdiskServerMap[p.pdiskName] = String(p.server).toLowerCase();
          }
          if (p.pdiskName && p.paths) {
            pdiskPathMap[p.pdiskName] = p.paths;
          }
          if (p.pdiskName && p.paths) {
            // paths like //ec1/dev/sdb
            const m = String(p.paths).match(/\/\/([^/]+)\//);
            if (m && m[1]) {
              pdiskServerMap[p.pdiskName] = m[1].toLowerCase();
            }
          }
        });
      }
      if (data.mmvdisk && typeof data.mmvdisk === 'object') {
        Object.entries(data.mmvdisk as Record<string, { all?: string; vd?: string; pd?: string }>).forEach(([rgName, obj]) => {
          const allRows = parseGpfsOutput<any>(obj?.all || `${obj?.pd || ''}\n${obj?.vd || ''}`);
          rgDetailsMap[rgName] = {
            servers: allRows.filter((r: any) => r.nodeName && r.daemonState !== undefined),
            arrays: allRows.filter((r: any) => r.declusteredArray && r.totalPdisks !== undefined && r.totalCapacity !== undefined),
            logGroups: allRows.filter((r: any) => r.lgName),
            pdisks: allRows.filter((r: any) => r.pdiskName),
            vdisks: allRows.filter((r: any) => r.vdisk && r.activity !== undefined && r.capacity !== undefined && r.raidCode !== undefined),
            vdiskSets: allRows.filter((r: any) => r.vdiskSets !== undefined && r.totalRawSize !== undefined),
          };
          if (obj?.pd) {
            const pds = parseGpfsOutput<any>(obj.pd || '')
              .filter((r: any) => r.pdiskName)
              .map((r: any) => ({
                ...r,
                rgName,
                server: r.server || pdiskServerMap[r.pdiskName] || '',
                paths: r.paths || pdiskPathMap[r.pdiskName] || ''
              }));
            pdiskMap[rgName] = pds;
          }
          if (obj?.vd) {
            const vds = parseGpfsOutput<any>(obj.vd || '')
              .filter((r: any) => r.vdisk && r.activity !== undefined && r.capacity !== undefined && r.raidCode !== undefined)
              .map((r: any) => ({ ...r, rgName }));
            vdiskMap[rgName] = vds;
          }
        });
      }
      setRecoveryGroups(rgSummaryRows.length > 0 ? rgSummaryRows : Object.keys(rgDetailsMap).map((rgName) => ({ rgName })));
      setRecoveryGroupDetails(rgDetailsMap);

      // Fallback: if mmvdisk pd disks are missing (e.g., command failed when a node is down), use mmlspdisk output
      const hasPdFromRg = Object.values(pdiskMap).some((arr) => (arr && arr.length > 0));
      if (!hasPdFromRg && data.mmlspdisk) {
        const byRg: Record<string, PdDisk[]> = {};
        parseGpfsOutput<any>(data.mmlspdisk).forEach((p) => {
          if (!p.pdiskName) return;
          const rgName = p.recoveryGroup || p.rgName || 'unknown';
          const server = (p.server || '').toLowerCase();
          const paths = p.paths || pdiskPathMap[p.pdiskName] || '';
          if (!byRg[rgName]) byRg[rgName] = [];
          byRg[rgName].push({ ...p, rgName, server, paths });
        });
        Object.assign(pdiskMap, byRg);
      }

      // Enrich pdisk entries with path/server hints from mmlspdisk even when mmvdisk data exists
      Object.values(pdiskMap).forEach((arr) => {
        arr.forEach((p: any) => {
          const pname = p.pdiskName;
          if (!p.paths && pdiskPathMap[pname]) {
            p.paths = pdiskPathMap[pname];
          }
          const hostFromPath = p.paths ? (String(p.paths).match(/\/\/([^/]+)\//)?.[1].toLowerCase() || '') : '';
          if (!p.server || p.server === '') {
            p.server = hostFromPath || pdiskServerMap[pname] || '';
          } else if (hostFromPath) {
            // prefer host extracted from path over generic server column
            p.server = hostFromPath;
          }
          p.server = String(p.server || '').toLowerCase();
        });
      });

      setPdisksByRg(pdiskMap);
      setVdisksByRg(vdiskMap);

      // 解析 df -Th | grep gpfs 获取挂载点
      if (data.df_gpfs) {
        const lines = String(data.df_gpfs)
          .split('\n')
          .map((l: string) => l.trim())
          .filter(Boolean);
        let mount = primaryMountPoint;
        lines.forEach((line: string) => {
          const parts = line.split(/\s+/);
          if (parts.length >= 7) {
            const fsName = parts[0];
            const mp = parts[6];
            if (!mount) mount = mp;
            if (primaryFsName && fsName === primaryFsName) {
              mount = mp;
            }
          }
        });
        if (mount) setPrimaryMountPoint(mount);
      }

      // 节点拓扑/匹配度
      const nodeTopologyMap: Record<string, { matchingMetric?: string; diskTopology?: string; needsAttention?: string }> = {};
      if (data.mmvdisk_server && typeof data.mmvdisk_server === 'object') {
        Object.values(data.mmvdisk_server as Record<string, string>).forEach((raw) => {
          parseGpfsOutput<any>(raw || '').forEach((row) => {
            const name = (row.nodeName || '').toLowerCase();
            if (name) {
              nodeTopologyMap[name] = {
                matchingMetric: row.matchingMetric,
                diskTopology: row.diskTopology,
                needsAttention: row.needsAttention
              };
            }
          });
        });
      }
      setNodeTopologyMap(nodeTopologyMap);

      // 生成事件日志（仅本地会话）
      const newEvents: EventLogEntry[] = [];
      const nowIso = new Date().toISOString();
      parsedClusterSummary.forEach((c) => {
        if (Number(c.failed) > 0) {
          newEvents.push({
            id: `${nowIso}-${c.component}-failed`,
            timestamp: nowIso,
            severity: 'error',
            source: 'mmhealth cluster',
            message: `${c.component} failed: ${c.failed}`,
          });
        } else if (Number(c.degraded) > 0) {
          newEvents.push({
            id: `${nowIso}-${c.component}-degraded`,
            timestamp: nowIso,
            severity: 'warning',
            source: 'mmhealth cluster',
            message: `${c.component} degraded: ${c.degraded}`,
          });
        }
      });

      parsedHealthEvents.forEach((h) => {
        const sev = (h.severity || '').toLowerCase();
        if (sev === 'failed' || sev === 'degraded' || sev === 'depend') {
          newEvents.push({
            id: `${nowIso}-${h.node}-${h.component}-${sev}`,
            timestamp: nowIso,
            severity: sev === 'failed' ? 'error' : 'warning',
            source: `mmhealth node ${h.node}`,
            message: `${h.component} status=${h.severity} (${h.message || h.event})`
          });
        }
      });

      disks.forEach((d) => {
        if (d.status && d.status.toLowerCase() !== 'ready') {
          newEvents.push({
            id: `${nowIso}-${d.nsdName}-status`,
            timestamp: nowIso,
            severity: 'warning',
            source: 'mmlsdisk',
            message: `${d.nsdName} status=${d.status}`,
          });
        }
        if (d.availability && d.availability.toLowerCase() !== 'up') {
          newEvents.push({
            id: `${nowIso}-${d.nsdName}-avail`,
            timestamp: nowIso,
            severity: 'warning',
            source: 'mmlsdisk',
            message: `${d.nsdName} availability=${d.availability}`,
          });
        }
      });

      Object.entries(pdiskMap).forEach(([rg, arr]) => {
        arr.forEach((pd) => {
          const st = (pd.state || '').toLowerCase();
          if (st && st !== 'ok' && st !== 'active') {
            newEvents.push({
              id: `${nowIso}-${rg}-${pd.pdiskName}-state`,
              timestamp: nowIso,
              severity: 'error',
              source: `mmvdisk pdisk ${rg}`,
              message: `${pd.pdiskName} state=${pd.state}`
            });
          }
        });
      });

      if (newEvents.length > 0) {
        setEventLogs((prev) => mergeEventLogs([...newEvents, ...prev]));
        // 后端已负责自动推送，前端不再重复发送，避免频繁通知
      }

      if (fsTotal) {
        const totalBlocks = parseInt(fsTotal.fsSize || '0', 10);
        const freeBlocks = parseInt(fsTotal.freeBlocks || '0', 10);
        const usedBlocks = Math.max(totalBlocks - freeBlocks, 0);
        // mmdf 以 1KB block 计，换算 GB
        const totalGB = totalBlocks / 1024 / 1024;
        const usedGB = usedBlocks / 1024 / 1024;
        const usedPct = totalBlocks > 0 ? (usedBlocks / totalBlocks) * 100 : 0;
        setFsUsage({ totalGB, usedGB, usedPct });
      }

      if (inodeInfo) {
        const used = parseInt(inodeInfo.usedInodes || '0', 10);
        const total = parseInt(inodeInfo.maxInodes || '0', 10);
        const usedPct = total > 0 ? (used / total) * 100 : 0;
        setInodeUsage({ used, total, usedPct });
      }
      
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Failed to fetch data from GPFS API:", error);
      setDataError(error instanceof Error ? error.message : 'Failed to fetch GPFS API data');
    } finally {
      setLoading(false);
    }
  }, [notifySeverities, webhooks]);

  useEffect(() => {
    const storedEvents = localStorage.getItem('gpfs_event_logs');
    if (storedEvents) {
      try {
        setEventLogs(mergeEventLogs(JSON.parse(storedEvents)));
      } catch {}
    }
    fetch(`${API_BASE_URL}/api/events?limit=200`)
      .then((r) => r.ok ? r.json() : null)
      .then((payload) => {
        if (payload?.events) {
          setEventLogs((prev) => mergeEventLogs([...(payload.events as EventLogEntry[]), ...prev]));
        }
      })
      .catch(() => {});
    // 读取后端配置
    fetch(`${API_BASE_URL}/api/config`)
      .then((r) => r.json())
      .then((cfg) => {
        setBackendConfig(cfg);
        if (cfg.webhooks) setWebhooks(cfg.webhooks);
        if (cfg.notifySeverities) setNotifySeverities(new Set(cfg.notifySeverities));
        setSettingsDirty(false);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    localStorage.setItem('gpfs_event_logs', JSON.stringify(eventLogs.slice(0, 200)));
  }, [eventLogs]);

  useEffect(() => {
    loadData();
    const intervalMs = backendConfig?.uiRefreshMs || REFRESH_INTERVAL;
    const intervalId = setInterval(loadData, intervalMs);
    return () => clearInterval(intervalId);
  }, [loadData, backendConfig?.uiRefreshMs]);

  const renderDashboard = () => {
    const summaryData = clusterSummary.map(s => ({
      name: s.component,
      Healthy: parseInt(s.healthy?.toString() || '0'),
      Failed: parseInt(s.failed?.toString() || '0'),
      Degraded: parseInt(s.degraded?.toString() || '0'),
      Other: parseInt(s.other?.toString() || '0'),
    }));

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white/90 backdrop-blur-xl p-5 rounded-lg shadow-[0_22px_70px_-46px_rgba(15,23,42,0.78)] ring-1 ring-white/80 border border-slate-200/80 transition-all duration-200 hover:-translate-y-0.5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500">Total Nodes</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">{nodes.length}</h3>
              </div>
              <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                <Server size={20} />
              </div>
            </div>
            <div className="mt-4 flex items-center text-xs text-green-600 font-medium">
              <ShieldCheck size={14} className="mr-1" /> Monitoring Active
            </div>
          </div>
          
          <div className="bg-white/90 backdrop-blur-xl p-5 rounded-lg shadow-[0_22px_70px_-46px_rgba(15,23,42,0.78)] ring-1 ring-white/80 border border-slate-200/80 transition-all duration-200 hover:-translate-y-0.5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500">NSDs (Disks)</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">{nsds.length}</h3>
              </div>
              <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
                <HardDrive size={20} />
              </div>
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur-xl p-5 rounded-lg shadow-[0_22px_70px_-46px_rgba(15,23,42,0.78)] ring-1 ring-white/80 border border-slate-200/80 transition-all duration-200 hover:-translate-y-0.5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500">Quorum Status</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">
                  {nodes.some(n => n.state === 'active') ? 'Achieved' : 'Checking...'}
                </h3>
              </div>
              <div className="p-2 bg-orange-50 rounded-lg text-orange-600">
                <Network size={20} />
              </div>
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur-xl p-5 rounded-lg shadow-[0_22px_70px_-46px_rgba(15,23,42,0.78)] ring-1 ring-white/80 border border-slate-200/80 transition-all duration-200 hover:-translate-y-0.5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500">FS Capacity Used</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">
                  {fsUsage ? `${fsUsage.usedGB.toFixed(1)} / ${fsUsage.totalGB.toFixed(1)} GB` : 'N/A'}
                </h3>
              </div>
              <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                <HardDrive size={20} />
              </div>
            </div>
            <div className="mt-4 flex items-center text-xs text-slate-500 font-medium">
              {fsUsage ? `${fsUsage.usedPct.toFixed(1)}% used` : 'Awaiting data'}
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur-xl p-5 rounded-lg shadow-[0_22px_70px_-46px_rgba(15,23,42,0.78)] ring-1 ring-white/80 border border-slate-200/80 transition-all duration-200 hover:-translate-y-0.5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500">Inode Usage</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">
                  {inodeUsage ? `${inodeUsage.used} / ${inodeUsage.total}` : 'N/A'}
                </h3>
              </div>
              <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
                <Server size={20} />
              </div>
            </div>
            <div className="mt-4 flex items-center text-xs text-slate-500 font-medium">
              {inodeUsage ? `${inodeUsage.usedPct.toFixed(1)}% used` : 'Awaiting data'}
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur-xl p-5 rounded-lg shadow-[0_22px_70px_-46px_rgba(15,23,42,0.78)] ring-1 ring-white/80 border border-slate-200/80 transition-all duration-200 hover:-translate-y-0.5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500">Total Snapshots</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">{totalSnapshots}</h3>
              </div>
              <div className="p-2 bg-sky-50 rounded-lg text-sky-600">
                <Clock size={20} />
              </div>
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur-xl p-5 rounded-lg shadow-[0_22px_70px_-46px_rgba(15,23,42,0.78)] ring-1 ring-white/80 border border-slate-200/80 transition-all duration-200 hover:-translate-y-0.5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500">Total Pdisks</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">
                  {Object.values(pdisksByRg).reduce((sum, arr) => sum + (arr?.length || 0), 0)}
                </h3>
              </div>
              <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                <HardDrive size={20} />
              </div>
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur-xl p-5 rounded-lg shadow-[0_22px_70px_-46px_rgba(15,23,42,0.78)] ring-1 ring-white/80 border border-slate-200/80 transition-all duration-200 hover:-translate-y-0.5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500">Total Vdisks</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">
                  {Object.values(vdisksByRg).reduce((sum, arr) => sum + (arr?.length || 0), 0)}
                </h3>
              </div>
              <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                <Activity size={20} />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white/90 backdrop-blur-xl p-6 rounded-lg shadow-[0_22px_70px_-46px_rgba(15,23,42,0.78)] ring-1 ring-white/80 border border-slate-200/80">
            <h4 className="text-lg font-bold text-slate-900 mb-6">Component Health Summary</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summaryData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Healthy" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Other" fill="#64748b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Failed" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur-xl p-6 rounded-lg shadow-[0_22px_70px_-46px_rgba(15,23,42,0.78)] ring-1 ring-white/80 border border-slate-200/80">
            <h4 className="text-lg font-bold text-slate-900 mb-6">Node State Distribution</h4>
            <div className="h-64 flex items-center justify-center">
               <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Active', value: nodes.filter(n => n.state === 'active').length },
                        { name: 'Inactive', value: nodes.filter(n => n.state !== 'active').length },
                      ]}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      <Cell fill="#3b82f6" />
                      <Cell fill="#e2e8f0" />
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
               </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-xl rounded-lg shadow-[0_22px_70px_-46px_rgba(15,23,42,0.78)] ring-1 ring-white/80 border border-slate-200/80 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
            <h4 className="text-lg font-bold text-slate-900">Recent Health Events</h4>
            <button
              className="text-sm text-blue-600 font-medium hover:underline"
              onClick={() => setView('events')}
            >
              View All
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/90 text-slate-500 uppercase text-[11px] font-black tracking-[0.12em]">
                <tr>
                  <th className="px-6 py-3">Node</th>
                  <th className="px-6 py-3">Component</th>
                  <th className="px-6 py-3">Severity</th>
                  <th className="px-6 py-3">Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {healthEvents
                  .filter((evt) => ['failed','error','depend'].includes(String(evt.severity).toLowerCase()))
                  .filter((evt) => matchesSearch(evt))
                  .length > 0 ? healthEvents
                  .filter((evt) => ['failed','error','depend'].includes(String(evt.severity).toLowerCase()))
                  .filter((evt) => matchesSearch(evt))
                  .map((evt, idx) => (
                  <tr key={idx} className="hover:bg-blue-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">{evt.node}</td>
                    <td className="px-6 py-4">{evt.component}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={evt.severity} />
                    </td>
                    <td className="px-6 py-4 text-slate-500 max-w-xs truncate">{evt.message}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-slate-400">No active events recorded</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderDashboardV2 = () => {
    const summaryData = clusterSummary.map(s => ({
      name: s.component,
      Healthy: Number(s.healthy || 0),
      Degraded: Number(s.degraded || 0),
      Failed: Number(s.failed || 0),
      Other: Number(s.other || 0),
    }));
    const failedCount = clusterSummary.reduce((sum, s) => sum + Number(s.failed || 0), 0);
    const degradedCount = clusterSummary.reduce((sum, s) => sum + Number(s.degraded || 0), 0);
    const activeNodeCount = nodes.filter((n) => n.state === 'active').length;
    const alertCount = eventLogs.filter((e) => e.severity === 'error' || e.severity === 'warning').length + failedCount + degradedCount;
    const fsPct = fsUsage?.usedPct || 0;
    const fsUsed = fsUsage?.usedGB || 0;
    const fsTotal = fsUsage?.totalGB || 0;
    const healthAlertRows = healthEvents
      .filter((e) => {
        const s = String(e.severity || e.event || '').toLowerCase();
        return ['failed', 'error', 'depend', 'degraded', 'warning'].some((term) => s.includes(term));
      })
      .slice(0, 5)
      .map((e) => ({
        time: e.activeSince || '--',
        severity: String(e.severity || e.event || 'info').toLowerCase(),
        message: `${e.node || 'cluster'} ${e.component || ''} ${e.message || e.event || ''}`.trim(),
      }));
    const recentAlertRows = eventLogs.length > 0
      ? eventLogs
        .filter((e) => e.severity === 'error' || e.severity === 'warning')
        .slice(0, 5)
        .map((e) => ({
        time: new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        severity: e.severity,
        message: e.message,
      }))
      : healthAlertRows;
    const configValue = (name: string) => configs.find((c) => c.configParameter === name)?.value || '-';

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
          <MiniMetric
            icon={CheckCircle2}
            label="Overall Health"
            value={failedCount > 0 ? 'Critical' : degradedCount > 0 ? 'Warning' : 'Healthy'}
            detail={failedCount > 0 ? `${failedCount} failed components` : degradedCount > 0 ? `${degradedCount} degraded components` : 'All critical components are OK'}
            tone={failedCount > 0 ? 'red' : degradedCount > 0 ? 'amber' : 'green'}
          />
          <MiniMetric icon={Server} label="Nodes" value={`${activeNodeCount} / ${nodes.length || 0}`} detail="Online" tone="slate" />
          <MiniMetric icon={Database} label="NSDs" value={`${nsds.length} / ${nsds.length}`} detail="Ready inventory" tone="slate" />
          <MiniMetric icon={Folder} label="File Systems" value={Object.keys(disksByFs).length || 0} detail={primaryMountPoint ? 'Mounted' : 'Awaiting mount'} tone="slate" />
          <MiniMetric icon={Bell} label="Alerts" value={alertCount} detail={alertCount > 0 ? 'Needs attention' : 'No active alerts'} tone={alertCount > 0 ? 'red' : 'green'} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">
          <div className="space-y-6 min-w-0">
            <section className={`${panelClass} overflow-hidden`}>
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <h4 className="text-lg font-black text-slate-950">Capacity Overview</h4>
                <button className="text-sm font-bold text-blue-600" onClick={() => setView('storage-disks')}>View all</button>
              </div>
              <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="rounded-lg border border-slate-200 p-4">
                  <div className="flex items-center justify-between mb-5">
                    <h5 className="font-black text-slate-800">File System Capacity</h5>
                    <button className="text-xs font-bold text-blue-600" onClick={() => setView('storage-disks')}>View all</button>
                  </div>
                  <ProgressLine
                    label={primaryFsName || 'filesystem'}
                    value={fsPct}
                    caption={fsUsage ? `${fsUsed.toFixed(1)} GB / ${fsTotal.toFixed(1)} GB` : 'Awaiting mmdf data'}
                    tone={fsPct > 85 ? 'red' : fsPct > 70 ? 'amber' : 'green'}
                  />
                  <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-sm text-slate-500">Total Capacity</span>
                    <span className="text-2xl font-black text-slate-950">{fsPct.toFixed(1)}%</span>
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 p-4">
                  <div className="flex items-center justify-between mb-5">
                    <h5 className="font-black text-slate-800">Snapshot Usage</h5>
                    <button className="text-xs font-bold text-blue-600" onClick={() => setView('snapshots')}>View all</button>
                  </div>
                  <ProgressLine
                    label="Snapshots"
                    value={totalSnapshots > 0 ? Math.min(totalSnapshots * 2, 100) : 0}
                    caption={`${totalSnapshots} snapshots discovered`}
                    tone="blue"
                  />
                  <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-sm text-slate-500">Total Snapshot</span>
                    <span className="text-2xl font-black text-slate-950">{totalSnapshots}</span>
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <h5 className="font-black text-slate-800">Quota Overview</h5>
                      <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-black text-emerald-700">New</span>
                    </div>
                    <button className="text-xs font-bold text-blue-600" onClick={() => setView('quotas')}>View all</button>
                  </div>
                  <div className="space-y-3">
                    {[
                      ['Active quota rows', quotaRows.filter((row) => row.source === 'active').length],
                      ['User quota rows', quotaRows.filter((row) => row.quotaType === 'USR').length],
                      ['Group quota rows', quotaRows.filter((row) => row.quotaType === 'GRP').length],
                      ['Fileset quota rows', quotaRows.filter((row) => row.quotaType === 'FILESET' || row.source === 'fileset').length],
                    ].map(([label, value]) => (
                      <div key={label} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                        <span className="text-xs font-semibold text-slate-500">{label}</span>
                        <span className="text-xs font-black uppercase text-slate-600">{value}</span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-4 text-xs text-slate-400">Quota usage is parsed from mmlsquota by filesystem.</p>
                </div>
              </div>
            </section>

            <section className={`${panelClass} p-6`}>
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-lg font-black text-slate-950">Component Health</h4>
                <div className="flex gap-4 text-xs font-semibold text-slate-500">
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Healthy</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> Warning</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" /> Critical</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-slate-400" /> Unknown</span>
                </div>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={summaryData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="Healthy" stackId="a" fill="#16a34a" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Degraded" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Failed" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Other" stackId="a" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>

          <aside className="space-y-6 min-w-0">
            <section className={`${panelClass} overflow-hidden`}>
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <h4 className="text-lg font-black text-slate-950">Recent Alerts</h4>
                <button className="text-sm font-bold text-blue-600" onClick={() => setView('events')}>View all</button>
              </div>
              <div className="divide-y divide-slate-100">
                {recentAlertRows.length === 0 ? (
                  <div className="px-5 py-8 text-sm text-slate-400">No active alerts recorded</div>
                ) : recentAlertRows.map((item, idx) => (
                  <div key={idx} className="px-5 py-3 flex items-start gap-3">
                    <span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${item.severity.includes('error') || item.severity.includes('failed') ? 'bg-red-500' : item.severity.includes('warning') || item.severity.includes('degraded') ? 'bg-amber-500' : 'bg-blue-500'}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-slate-500">{item.time}</span>
                        <StatusBadge status={item.severity} />
                      </div>
                      <p className="mt-1 text-sm text-slate-700 leading-snug">{item.message}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/80 text-xs text-slate-500">
                Showing {Math.min(recentAlertRows.length, 5)} of {alertCount} alerts
              </div>
            </section>

            <section className={`${panelClass} overflow-hidden`}>
              <div className="px-5 py-4 border-b border-slate-100">
                <h4 className="text-lg font-black text-slate-950">Cluster Information</h4>
              </div>
              <div className="p-5 space-y-3 text-sm">
                {[
                  ['Cluster Name', configValue('clusterName')],
                  ['GPFS Version', configValue('minReleaseLevel')],
                  ['Nodes', String(nodes.length)],
                  ['NSDs', String(nsds.length)],
                  ['Protocols', configValue('cesSharedRoot') !== '-' ? 'CES enabled' : '-'],
                  ['Last Health Check', lastUpdated.toLocaleTimeString()],
                  ['Uptime', '-']
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-4">
                    <span className="text-slate-500">{label}</span>
                    <span className="font-semibold text-slate-800 text-right">{value}</span>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </div>
    );
  };

  const renderNodes = () => (
    <div className="bg-white/90 backdrop-blur-xl rounded-lg shadow-[0_22px_70px_-46px_rgba(15,23,42,0.78)] ring-1 ring-white/80 border border-slate-200/80 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/80">
        <h4 className="text-lg font-bold text-slate-900">Live Node States (mmgetstate)</h4>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50/90 text-slate-500 uppercase text-[11px] font-black tracking-[0.12em]">
            <tr>
              <th className="px-6 py-3">#</th>
              <th className="px-6 py-3">Node Name</th>
              <th className="px-6 py-3">State</th>
              <th className="px-6 py-3">Quorum Nodes</th>
              <th className="px-6 py-3">Quorum Status</th>
              <th className="px-6 py-3">Remarks</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {nodes.filter((node) => matchesSearch(node)).map((node) => (
              <tr key={node.nodeNumber} className="hover:bg-blue-50/50 transition-colors">
                <td className="px-6 py-4 text-slate-400 font-mono">{node.nodeNumber}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Cpu size={14} />
                    </div>
                    <span className="font-semibold text-slate-900">{node.nodeName}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <StatusBadge status={node.state} />
                </td>
                <td className="px-6 py-4 text-slate-600">
                  {node.nodesUp} / {node.totalNodes}
                </td>
                <td className="px-6 py-4 font-medium text-slate-700">
                  {node.quorum} quorum
                </td>
                <td className="px-6 py-4 text-slate-500 italic">
                  {node.remarks}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderNodesV2 = () => {
    const filteredNodes = nodes.filter((node) => matchesSearch(node));
    return (
      <div className="space-y-4">
        <div className={`${panelClass} px-5 py-4 flex flex-wrap items-center justify-between gap-3`}>
          <div className="flex flex-wrap items-center gap-2">
            <FilterButton>Role: All</FilterButton>
            <FilterButton>Status: All</FilterButton>
            <FilterButton>CPU: All</FilterButton>
            <FilterButton>Memory: All</FilterButton>
            <FilterButton>Rack: All</FilterButton>
            <FilterButton>More Filters</FilterButton>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 shadow-sm"
              onClick={() => setSearchQuery('')}
            >
              Reset
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 shadow-sm"
              onClick={() => exportJson('gpfs-nodes.json', filteredNodes)}
            >
              <Download size={14} />
              Export
            </button>
          </div>
        </div>

        <div className={`${panelClass} overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/90 text-slate-500 uppercase text-[11px] font-black tracking-[0.12em]">
                <tr>
                  <th className="px-5 py-3">Node Name</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">IP Address</th>
                  <th className="px-5 py-3">Quorum</th>
                  <th className="px-5 py-3">Nodes Up</th>
                  <th className="px-5 py-3">Version</th>
                  <th className="px-5 py-3">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredNodes.map((node) => (
                  <tr key={node.nodeNumber} className="hover:bg-blue-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                          <Server size={15} />
                        </div>
                        <button
                          type="button"
                          className="font-bold text-blue-700 hover:underline"
                          onClick={() => setSelectedNode(node)}
                          title={`Open ${node.nodeName} details`}
                        >
                          {node.nodeName}
                        </button>
                      </div>
                    </td>
                    <td className="px-5 py-4"><StatusBadge status={node.state} /></td>
                    <td className="px-5 py-4 text-slate-600">{node.quorum ? 'Manager' : 'Client'}</td>
                    <td className="px-5 py-4 font-mono text-slate-600">{node.ipAddress || '-'}</td>
                    <td className="px-5 py-4 text-slate-600">{node.quorum || '-'}</td>
                    <td className="px-5 py-4 text-slate-600">{node.nodesUp} / {node.totalNodes}</td>
                    <td className="px-5 py-4 text-slate-600">-</td>
                    <td className="px-5 py-4 text-slate-500">{node.remarks || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {renderTableFooter(filteredNodes.length, nodes.length, 'nodes')}
        </div>
      </div>
    );
  };

  const renderNodeDetailsModal = () => {
    if (!selectedNode) return null;

    const nodeName = selectedNode.nodeName || '';
    const nodeKey = nodeName.toLowerCase();
    const topology = nodeTopologyMap[nodeKey] || {};
    const relatedNsds = nsds.filter((nsd) => String(nsd.serverList || '').toLowerCase().includes(nodeKey));
    const relatedPdisks = Object.entries(pdisksByRg).flatMap(([rgName, items]) =>
      items
        .filter((pdisk) => {
          const haystack = `${pdisk.server || ''} ${pdisk.paths || ''} ${pdisk.pdiskName || ''}`.toLowerCase();
          return haystack.includes(nodeKey);
        })
        .map((pdisk) => ({ ...pdisk, rgName: pdisk.rgName || rgName }))
    );
    const relatedHealthEvents = healthEvents.filter((event) => {
      if (!String(event.node || '').toLowerCase().includes(nodeKey)) return false;
      const severity = String(event.severity || event.event || event.message || '').toLowerCase();
      return ['failed', 'error', 'depend', 'degraded', 'warning'].some((term) => severity.includes(term));
    });
    const detailRows = [
      ['Node name', nodeName],
      ['Node number', selectedNode.nodeNumber || '-'],
      ['State', selectedNode.state || '-'],
      ['Role', selectedNode.quorum ? 'Manager' : 'Client'],
      ['Quorum', selectedNode.quorum || '-'],
      ['Nodes up', `${selectedNode.nodesUp || '-'} / ${selectedNode.totalNodes || '-'}`],
      ['IP address', selectedNode.ipAddress || '-'],
      ['Topology metric', topology.matchingMetric || '-'],
      ['Disk topology', topology.diskTopology || '-'],
      ['Remarks', selectedNode.remarks || '-'],
    ];

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-8"
        onClick={() => setSelectedNode(null)}
      >
        <div
          className="w-full max-w-4xl max-h-[86vh] overflow-hidden rounded-lg bg-white shadow-[0_28px_90px_-30px_rgba(15,23,42,0.8)] border border-slate-200"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Server size={24} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-950">{nodeName}</h3>
                <div className="mt-2 flex items-center gap-2">
                  <StatusBadge status={selectedNode.state} />
                  <span className="text-xs font-semibold text-slate-500">{selectedNode.remarks || 'GPFS cluster node'}</span>
                </div>
              </div>
            </div>
            <button
              type="button"
              className="h-9 w-9 inline-flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              onClick={() => setSelectedNode(null)}
              title="Close"
            >
              <X size={18} />
            </button>
          </div>

          <div className="overflow-y-auto max-h-[calc(86vh-86px)] p-6 space-y-5 bg-slate-50/70">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <MiniMetric icon={Server} label="Node State" value={<StatusBadge status={selectedNode.state} />} detail="mmgetstate" tone="green" />
              <MiniMetric icon={Network} label="Quorum" value={selectedNode.quorum || '-'} detail={`${selectedNode.nodesUp || '-'} / ${selectedNode.totalNodes || '-'} nodes up`} tone="blue" />
              <MiniMetric icon={HardDrive} label="Mapped Storage" value={relatedNsds.length + relatedPdisks.length} detail={`${relatedNsds.length} NSDs, ${relatedPdisks.length} pdisks`} tone="slate" />
            </div>

            <div className={`${panelClass} overflow-hidden shadow-none`}>
              <div className="px-5 py-4 border-b border-slate-100">
                <h4 className="font-black text-slate-900">Node Details</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2">
                {detailRows.map(([label, value]) => (
                  <div key={label} className="px-5 py-3 border-b border-slate-100 flex items-center justify-between gap-4">
                    <span className="text-sm font-semibold text-slate-500">{label}</span>
                    <span className="text-sm font-bold text-slate-900 text-right break-all">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <section className={`${panelClass} overflow-hidden shadow-none`}>
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h4 className="font-black text-slate-900">Related NSDs</h4>
                  <span className="text-xs font-bold text-slate-500">{relatedNsds.length}</span>
                </div>
                <div className="max-h-56 overflow-auto">
                  {relatedNsds.length === 0 ? (
                    <div className="px-5 py-8 text-sm text-slate-400 text-center">No NSDs mapped to this node</div>
                  ) : relatedNsds.map((nsd) => (
                    <div key={`${nsd.fileSystem}-${nsd.diskName}`} className="px-5 py-3 border-b border-slate-100">
                      <p className="font-bold text-slate-900">{nsd.diskName}</p>
                      <p className="text-xs text-slate-500">{nsd.fileSystem || '-'} · {nsd.localDiskName || '-'}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className={`${panelClass} overflow-hidden shadow-none`}>
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h4 className="font-black text-slate-900">Health Events</h4>
                  <span className="text-xs font-bold text-slate-500">{relatedHealthEvents.length}</span>
                </div>
                <div className="max-h-56 overflow-auto">
                  {relatedHealthEvents.length === 0 ? (
                    <div className="px-5 py-8 text-sm text-slate-400 text-center">No active health events for this node</div>
                  ) : relatedHealthEvents.slice(0, 12).map((event, idx) => (
                    <div key={`${event.component}-${idx}`} className="px-5 py-3 border-b border-slate-100">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-bold text-slate-900">{event.component || '-'}</p>
                        <StatusBadge status={event.severity || event.event} />
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{event.message || event.event || '-'}</p>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                onClick={() => {
                  setSearchQuery(nodeName);
                  setSelectedNode(null);
                }}
              >
                Filter This Node
              </button>
              <button
                type="button"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
                onClick={() => {
                  setSearchQuery(nodeName);
                  setSelectedNode(null);
                  setView('topology');
                }}
              >
                View In Topology
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderNsds = () => (
    <div className="space-y-6">
      {renderInventoryToolbar(['Filesystem: All', 'Server: All', 'Usage: All'], 'gpfs-nsds.json', nsds)}
      {Object.entries(
        nsds.reduce<Record<string, GpfsNSD[]>>((acc, nsd) => {
          const fs = nsd.fileSystem || 'unknown';
          acc[fs] = acc[fs] || [];
          acc[fs].push(nsd);
          return acc;
        }, {})
      ).map(([fsName, items]) => {
        const sortedItems = [...items]
          .filter((nsd) => matchesSearch(fsName, nsd))
          .sort((a, b) => (a.serverList || '').localeCompare(b.serverList || ''));
        const collapsed = collapsedFs[fsName] ?? false;
        return (
          <div key={fsName} className="bg-white/90 backdrop-blur-xl rounded-lg shadow-[0_22px_70px_-46px_rgba(15,23,42,0.78)] ring-1 ring-white/80 border border-slate-200/80 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
              <div>
                <h4 className="text-lg font-bold text-slate-900">Filesystem: {fsName}</h4>
                <p className="text-xs text-slate-500">Grouped by NSD server, click to toggle</p>
              </div>
              <button
                className="text-sm text-blue-600 font-medium"
                onClick={() => setCollapsedFs(prev => ({ ...prev, [fsName]: !collapsed }))}
              >
                {collapsed ? 'Expand' : 'Collapse'}
              </button>
            </div>
            {!collapsed && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50/90 text-slate-500 uppercase text-[11px] font-black tracking-[0.12em]">
                    <tr>
                      <th className="px-6 py-3">NSD Name</th>
                      <th className="px-6 py-3">Server</th>
                      <th className="px-6 py-3">Local Disk</th>
                      <th className="px-6 py-3">Size</th>
                      <th className="px-6 py-3">Usage</th>
                      <th className="px-6 py-3">Free %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sortedItems.map((nsd, idx) => {
                      const usage = nsdUsageMap[nsd.diskName] || { sizeKB: 0, freeBlocks: 0, freePct: 0, usagePct: 0 };
                      const serverKey = (nsd.serverList || '').toLowerCase();
                      const server = nodeClassMap[serverKey] || nsd.serverList;
                      const sizeGB = usage.sizeKB ? (usage.sizeKB / 1024 / 1024).toFixed(1) + ' GB' : 'N/A';
                      return (
                        <tr key={idx} className="hover:bg-blue-50/50 transition-colors">
                          <td className="px-6 py-4 font-semibold text-slate-900">{nsd.diskName}</td>
                          <td className="px-6 py-4 text-slate-600">{server}</td>
                          <td className="px-6 py-4 text-slate-500">{nsd.localDiskName}</td>
                          <td className="px-6 py-4 text-slate-600">{sizeGB}</td>
                          <td className="px-6 py-4 text-slate-600">
                            {usage.usagePct ? usage.usagePct.toFixed(1) + '%' : 'N/A'}
                          </td>
                          <td className="px-6 py-4 text-slate-600">
                            {usage.freePct ? usage.freePct.toFixed(1) + '%' : 'N/A'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {renderTableFooter(sortedItems.length, items.length, 'NSDs')}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  const renderDisks = () => (
    <div className="space-y-6">
      {renderInventoryToolbar(['Filesystem: All', 'Status: All', 'Storage Pool: All'], 'gpfs-disks.json', disksByFs)}
      {Object.entries(disksByFs).map(([fsName, items]) => {
        const filteredItems = items.filter((disk) => matchesSearch(fsName, disk));
        const collapsed = collapsedFs[`disk-${fsName}`] ?? false;
        return (
          <div key={fsName} className="bg-white/90 backdrop-blur-xl rounded-lg shadow-[0_22px_70px_-46px_rgba(15,23,42,0.78)] ring-1 ring-white/80 border border-slate-200/80 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
              <div>
                <h4 className="text-lg font-bold text-slate-900">Filesystem: {fsName}</h4>
                <p className="text-xs text-slate-500">Click to toggle</p>
              </div>
              <button
                className="text-sm text-blue-600 font-medium"
                onClick={() => setCollapsedFs(prev => ({ ...prev, [`disk-${fsName}`]: !collapsed }))}
              >
                {collapsed ? 'Expand' : 'Collapse'}
              </button>
            </div>
            {!collapsed && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50/90 text-slate-500 uppercase text-[11px] font-black tracking-[0.12em]">
                    <tr>
                      <th className="px-6 py-3">Disk</th>
                      <th className="px-6 py-3">Driver</th>
                      <th className="px-6 py-3">Sector Size</th>
                      <th className="px-6 py-3">Failure Group</th>
                      <th className="px-6 py-3">Holds Metadata</th>
                      <th className="px-6 py-3">Holds Data</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">Availability</th>
                      <th className="px-6 py-3">Storage Pool</th>
                      <th className="px-6 py-3 text-right">Size</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredItems.map((disk, idx) => (
                      <tr key={idx} className="hover:bg-blue-50/50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-slate-900">{disk.nsdName}</td>
                        <td className="px-6 py-4 text-slate-600">{disk.driverType || 'N/A'}</td>
                        <td className="px-6 py-4 text-slate-600">{disk.sectorSize || 'N/A'}</td>
                        <td className="px-6 py-4 text-slate-600">{disk.failureGroup || 'N/A'}</td>
                        <td className="px-6 py-4 text-slate-600">{disk.metadata || 'N/A'}</td>
                        <td className="px-6 py-4 text-slate-600">{disk.data || 'N/A'}</td>
                        <td className="px-6 py-4">
                          <StatusBadge status={disk.status} />
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={disk.availability} />
                        </td>
                        <td className="px-6 py-4 text-slate-600">{disk.storagePool || 'N/A'}</td>
                        <td className="px-6 py-4 text-right font-mono text-slate-700">
                          {disk.diskSizeKB ? (parseInt(disk.diskSizeKB) / 1024 / 1024).toFixed(1) + ' GB' : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {renderTableFooter(filteredItems.length, items.length, 'disks')}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  const renderQuotas = () => {
    const fsOptions = Array.from(new Set([
      ...quotaRows.map((row) => row.filesystemName).filter(Boolean),
      ...filesets.map((fileset) => fileset.filesystemName).filter(Boolean),
      primaryFsName,
    ].filter(Boolean)));
    const selectedFs = quotaFsFilter === 'all' ? 'all' : quotaFsFilter;
    const fsRows = quotaRows.filter((row) => selectedFs === 'all' || row.filesystemName === selectedFs);
    const activeRows = fsRows.filter((row) => row.source === 'active');
    const defaultRows = fsRows.filter((row) => row.source === 'default');
    const userRows = fsRows.filter((row) => row.quotaType === 'USR');
    const groupRows = fsRows.filter((row) => row.quotaType === 'GRP');
    const filesetQuotaRows = fsRows.filter((row) => row.quotaType === 'FILESET' || row.source === 'fileset');
    const selectedFilesets = filesets.filter((fileset) => selectedFs === 'all' || fileset.filesystemName === selectedFs);
    const groupNames = Array.from(new Set(groupRows.map((row) => quotaDisplayName(row)).filter((name) => name && name !== '-')));
    const selectedGroupMembers = quotaGroupFilter === 'all' ? [] : (quotaGroupMembers[quotaGroupFilter] || []);
    const selectedGroupRows = quotaGroupFilter === 'all'
      ? groupRows
      : [
        ...groupRows.filter((row) => quotaDisplayName(row) === quotaGroupFilter),
        ...userRows.filter((row) => selectedGroupMembers.includes(String(row.name || ''))),
      ];

    const visibleRows = (
      quotaView === 'users' ? userRows :
      quotaView === 'groups' ? selectedGroupRows :
      quotaView === 'filesets' ? filesetQuotaRows :
      fsRows
    ).filter((row) => matchesSearch(row));

    const overThreshold = activeRows.filter((row) => quotaPercent(row) >= 80).length;
    const blockUsageTotal = activeRows.reduce((sum, row) => sum + toNumber(row.blockUsage), 0);
    const blockQuotaTotal = activeRows.reduce((sum, row) => sum + toNumber(row.blockQuota), 0);
    const aggregatePct = blockQuotaTotal > 0 ? (blockUsageTotal / blockQuotaTotal) * 100 : 0;
    const viewButtons: Array<{ id: typeof quotaView; label: string; count: number }> = [
      { id: 'all', label: 'All Quotas', count: fsRows.length },
      { id: 'users', label: 'Users', count: userRows.length },
      { id: 'groups', label: 'Groups', count: groupRows.length },
      { id: 'filesets', label: 'Filesets', count: filesetQuotaRows.length || selectedFilesets.length },
    ];

    return (
      <div className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <MiniMetric icon={Percent} label="Active Quotas" value={activeRows.length} detail={`${defaultRows.length} default policies`} tone="blue" />
          <MiniMetric icon={Users} label="User / Group" value={`${userRows.length} / ${groupRows.length}`} detail="USR and GRP quota records" tone="slate" />
          <MiniMetric icon={FolderTree} label="Filesets" value={selectedFilesets.length} detail={`${filesetQuotaRows.length} fileset quota rows`} tone="green" />
          <MiniMetric icon={AlertTriangle} label="Above 80%" value={overThreshold} detail={blockQuotaTotal > 0 ? `${aggregatePct.toFixed(1)}% aggregate block usage` : 'No block quota limit'} tone={overThreshold > 0 ? 'amber' : 'green'} />
        </div>

        <div className={`${panelClass} px-5 py-4 flex flex-wrap items-center justify-between gap-3`}>
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-xs font-black uppercase tracking-wide text-slate-500">Filesystem</label>
            <select
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 shadow-sm"
              value={quotaFsFilter}
              onChange={(event) => setQuotaFsFilter(event.target.value)}
            >
              <option value="all">All filesystems</option>
              {fsOptions.map((fsName) => (
                <option key={fsName} value={fsName}>{fsName}</option>
              ))}
            </select>
            {quotaView === 'groups' && (
              <select
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 shadow-sm"
                value={quotaGroupFilter}
                onChange={(event) => setQuotaGroupFilter(event.target.value)}
              >
                <option value="all">All groups</option>
                {groupNames.map((group) => (
                  <option key={group} value={group}>{group}</option>
                ))}
              </select>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 shadow-sm hover:bg-slate-50"
              onClick={loadData}
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 shadow-sm hover:bg-slate-50"
              onClick={() => exportJson('gpfs-quotas.json', visibleRows)}
            >
              <Download size={14} />
              Export
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {viewButtons.map((button) => (
            <button
              key={button.id}
              className={`rounded-lg px-4 py-2 text-sm font-black border transition-colors ${
                quotaView === button.id
                  ? 'bg-blue-600 text-white border-blue-600 shadow-[0_14px_30px_-18px_rgba(37,99,235,0.9)]'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
              onClick={() => setQuotaView(button.id)}
            >
              {button.label}
              <span className={`ml-2 rounded-md px-1.5 py-0.5 text-xs ${quotaView === button.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>{button.count}</span>
            </button>
          ))}
        </div>

        {quotaView === 'groups' && quotaGroupFilter !== 'all' && (
          <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            Showing group quota for <span className="font-black">{quotaGroupFilter}</span>
            {selectedGroupMembers.length > 0
              ? ` plus member user quota rows: ${selectedGroupMembers.join(', ')}`
              : '. No OS group members were returned by getent group.'}
          </div>
        )}

        <div className={`${panelClass} overflow-hidden`}>
          <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="text-lg font-black text-slate-950">
                {quotaView === 'filesets' ? 'Fileset Quotas' : quotaView === 'groups' ? 'Group Quotas' : quotaView === 'users' ? 'User Quotas' : 'All Quota Records'}
              </h4>
              <p className="text-xs text-slate-500 mt-1">Block values are displayed from GPFS quota counters; 0 quota/limit means no limit configured.</p>
            </div>
            <StatusBadge status={overThreshold > 0 ? 'warning' : 'ok'} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/90 text-slate-500 uppercase text-[11px] font-black tracking-[0.12em]">
                <tr>
                  <th className="px-5 py-3">Filesystem</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Name / Fileset</th>
                  <th className="px-5 py-3">Block Usage</th>
                  <th className="px-5 py-3">Block Quota</th>
                  <th className="px-5 py-3">Block Limit</th>
                  <th className="px-5 py-3">Usage</th>
                  <th className="px-5 py-3">Files Usage</th>
                  <th className="px-5 py-3">Files Quota</th>
                  <th className="px-5 py-3">Grace</th>
                  <th className="px-5 py-3">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleRows.length === 0 && (
                  <tr>
                    <td colSpan={11} className="px-5 py-10 text-center text-slate-400">
                      {quotaView === 'filesets'
                        ? 'No fileset quota usage records. Per-fileset quotas may be disabled for this filesystem.'
                        : 'No quota rows returned for the selected filesystem and category.'}
                    </td>
                  </tr>
                )}
                {visibleRows.map((row, idx) => {
                  const pct = quotaPercent(row);
                  const tone = pct >= 90 ? 'red' : pct >= 80 ? 'amber' : 'green';
                  return (
                    <tr key={`${row.filesystemName}-${row.quotaType}-${quotaDisplayName(row)}-${row.source}-${idx}`} className="hover:bg-blue-50/50 transition-colors">
                      <td className="px-5 py-4 font-bold text-slate-900">{row.filesystemName || '-'}</td>
                      <td className="px-5 py-4"><StatusBadge status={row.quotaType || 'unknown'} /></td>
                      <td className="px-5 py-4">
                        <div className="font-bold text-blue-700">{quotaDisplayName(row)}</div>
                        {row.filesetname && <div className="text-xs text-slate-400">fileset: {decodeGpfsValue(row.filesetname)}</div>}
                      </td>
                      <td className="px-5 py-4 font-mono text-xs text-slate-700">{formatKib(row.blockUsage, '0')}</td>
                      <td className="px-5 py-4 font-mono text-xs text-slate-700">{formatKib(row.blockQuota, 'No limit')}</td>
                      <td className="px-5 py-4 font-mono text-xs text-slate-700">{formatKib(row.blockLimit, 'No limit')}</td>
                      <td className="px-5 py-4 min-w-[160px]">
                        <ProgressLine label="" value={pct} caption={pct > 0 ? `${pct.toFixed(1)}%` : 'No quota limit'} tone={tone} />
                      </td>
                      <td className="px-5 py-4 font-mono text-xs text-slate-700">{Number(row.filesUsage || 0).toLocaleString()}</td>
                      <td className="px-5 py-4 font-mono text-xs text-slate-700">{toNumber(row.filesQuota) ? Number(row.filesQuota).toLocaleString() : 'No limit'}</td>
                      <td className="px-5 py-4 text-slate-600">{row.blockGrace || row.filesGrace || '-'}</td>
                      <td className="px-5 py-4 text-slate-600 capitalize">{row.source || 'active'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {renderTableFooter(visibleRows.length, fsRows.length, 'quota rows')}
        </div>

        {quotaView === 'filesets' && (
          <div className={`${panelClass} overflow-hidden`}>
            <div className="px-5 py-4 border-b border-slate-100">
              <h4 className="text-lg font-black text-slate-950">Filesystem Filesets</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/90 text-slate-500 uppercase text-[11px] font-black tracking-[0.12em]">
                  <tr>
                    <th className="px-5 py-3">Filesystem</th>
                    <th className="px-5 py-3">Fileset</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Path</th>
                    <th className="px-5 py-3">Max Inodes</th>
                    <th className="px-5 py-3">Free Inodes</th>
                    <th className="px-5 py-3">Comment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedFilesets.map((fileset) => (
                    <tr key={`${fileset.filesystemName}-${fileset.filesetName}`} className="hover:bg-blue-50/50 transition-colors">
                      <td className="px-5 py-4 font-bold text-slate-900">{fileset.filesystemName}</td>
                      <td className="px-5 py-4 font-bold text-blue-700">{fileset.filesetName}</td>
                      <td className="px-5 py-4"><StatusBadge status={fileset.status || 'unknown'} /></td>
                      <td className="px-5 py-4 font-mono text-xs text-slate-600">{fileset.path || '-'}</td>
                      <td className="px-5 py-4 font-mono text-xs text-slate-600">{fileset.maxInodes || '-'}</td>
                      <td className="px-5 py-4 font-mono text-xs text-slate-600">{fileset.freeInodes || '-'}</td>
                      <td className="px-5 py-4 text-slate-600">{fileset.comment || '-'}</td>
                    </tr>
                  ))}
                  {selectedFilesets.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-5 py-8 text-center text-slate-400">No filesets returned by mmlsfileset.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderFilesets = () => {
    const fsOptions = Array.from(new Set([
      ...filesets.map((fileset) => fileset.filesystemName).filter(Boolean),
      primaryFsName,
    ].filter(Boolean)));
    const selectedFs = quotaFsFilter === 'all' ? 'all' : quotaFsFilter;
    const selectedFilesets = filesets
      .filter((fileset) => selectedFs === 'all' || fileset.filesystemName === selectedFs)
      .filter((fileset) => matchesSearch(fileset));
    const linkedCount = selectedFilesets.filter((fileset) => String(fileset.status || '').toLowerCase() === 'linked').length;
    const deletedCount = selectedFilesets.filter((fileset) => String(fileset.status || '').toLowerCase() === 'deleted').length;
    const inodeMax = selectedFilesets.reduce((sum, fileset) => sum + toNumber(fileset.maxInodes), 0);
    const inodeFree = selectedFilesets.reduce((sum, fileset) => sum + toNumber(fileset.freeInodes), 0);
    const inodeAlloc = selectedFilesets.reduce((sum, fileset) => sum + toNumber(fileset.allocInodes), 0);
    const inodeUsed = inodeMax > 0 ? Math.max(inodeMax - inodeFree, 0) : inodeAlloc;
    const inodePct = inodeMax > 0 ? (inodeUsed / inodeMax) * 100 : 0;
    const ownerCount = selectedFilesets.filter((fileset) => String(fileset.isInodeSpaceOwner || '') === '1').length;

    return (
      <div className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <MiniMetric icon={FolderTree} label="Filesets" value={selectedFilesets.length} detail={`${linkedCount} linked, ${deletedCount} deleted`} tone="blue" />
          <MiniMetric icon={CheckCircle2} label="Linked" value={linkedCount} detail="Mounted junction paths" tone="green" />
          <MiniMetric icon={Database} label="Inode Spaces" value={ownerCount} detail="Fileset inode-space owners" tone="slate" />
          <MiniMetric icon={Activity} label="Inode Usage" value={`${inodePct.toFixed(1)}%`} detail={inodeMax > 0 ? `${inodeUsed.toLocaleString()} / ${inodeMax.toLocaleString()}` : 'No inode counters'} tone={inodePct > 85 ? 'amber' : 'green'} />
        </div>

        <div className={`${panelClass} px-5 py-4 flex flex-wrap items-center justify-between gap-3`}>
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-xs font-black uppercase tracking-wide text-slate-500">Filesystem</label>
            <select
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 shadow-sm"
              value={quotaFsFilter}
              onChange={(event) => setQuotaFsFilter(event.target.value)}
            >
              <option value="all">All filesystems</option>
              {fsOptions.map((fsName) => (
                <option key={fsName} value={fsName}>{fsName}</option>
              ))}
            </select>
            <FilterButton>Status: All</FilterButton>
            <FilterButton>Inode Space: All</FilterButton>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 shadow-sm hover:bg-slate-50"
              onClick={loadData}
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 shadow-sm hover:bg-slate-50"
              onClick={() => exportJson('gpfs-filesets.json', selectedFilesets)}
            >
              <Download size={14} />
              Export
            </button>
          </div>
        </div>

        <div className={`${panelClass} overflow-hidden`}>
          <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="text-lg font-black text-slate-950">Fileset Inventory</h4>
              <p className="text-xs text-slate-500 mt-1">Default view maps to mmlsfileset status/path; detail columns map to mmlsfileset -L attributes.</p>
            </div>
            <StatusBadge status={deletedCount > 0 ? 'warning' : 'ok'} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/90 text-slate-500 uppercase text-[11px] font-black tracking-[0.12em]">
                <tr>
                  <th className="px-5 py-3">Filesystem</th>
                  <th className="px-5 py-3">Fileset</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Path</th>
                  <th className="px-5 py-3">Id</th>
                  <th className="px-5 py-3">Root Inode</th>
                  <th className="px-5 py-3">Parent Id</th>
                  <th className="px-5 py-3">Created</th>
                  <th className="px-5 py-3">Inode Space</th>
                  <th className="px-5 py-3">Max Inodes</th>
                  <th className="px-5 py-3">Alloc Inodes</th>
                  <th className="px-5 py-3">Free Inodes</th>
                  <th className="px-5 py-3">Comment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {selectedFilesets.length === 0 && (
                  <tr>
                    <td colSpan={13} className="px-5 py-10 text-center text-slate-400">No filesets returned by mmlsfileset for the selected filesystem.</td>
                  </tr>
                )}
                {selectedFilesets.map((fileset) => {
                  const max = toNumber(fileset.maxInodes);
                  const free = toNumber(fileset.freeInodes);
                  const used = max > 0 ? Math.max(max - free, 0) : toNumber(fileset.allocInodes);
                  const pct = max > 0 ? (used / max) * 100 : 0;
                  return (
                    <tr key={`${fileset.filesystemName}-${fileset.filesetName}-${fileset.id}`} className="hover:bg-blue-50/50 transition-colors">
                      <td className="px-5 py-4 font-bold text-slate-900">{fileset.filesystemName || '-'}</td>
                      <td className="px-5 py-4">
                        <div className="font-bold text-blue-700">{fileset.filesetName || '-'}</div>
                        <div className="text-xs text-slate-400">{String(fileset.isInodeSpaceOwner || '') === '1' ? 'inode-space owner' : 'dependent fileset'}</div>
                      </td>
                      <td className="px-5 py-4"><StatusBadge status={fileset.status || 'unknown'} /></td>
                      <td className="px-5 py-4 font-mono text-xs text-slate-700">{fileset.path || '-'}</td>
                      <td className="px-5 py-4 font-mono text-xs text-slate-600">{fileset.id || '-'}</td>
                      <td className="px-5 py-4 font-mono text-xs text-slate-600">{fileset.rootInode || '-'}</td>
                      <td className="px-5 py-4 font-mono text-xs text-slate-600">{fileset.parentId || '-'}</td>
                      <td className="px-5 py-4 text-slate-600 whitespace-nowrap">{decodeGpfsValue(fileset.created) || '-'}</td>
                      <td className="px-5 py-4 font-mono text-xs text-slate-600">{fileset.inodeSpace || '-'}</td>
                      <td className="px-5 py-4 font-mono text-xs text-slate-600">{fileset.maxInodes || '-'}</td>
                      <td className="px-5 py-4 min-w-[150px]">
                        <ProgressLine label="" value={pct} caption={max > 0 ? `${used.toLocaleString()} used` : `${fileset.allocInodes || '-'} allocated`} tone={pct > 85 ? 'amber' : 'green'} />
                      </td>
                      <td className="px-5 py-4 font-mono text-xs text-slate-600">{fileset.freeInodes || '-'}</td>
                      <td className="px-5 py-4 text-slate-600">{fileset.comment || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {renderTableFooter(selectedFilesets.length, filesets.length, 'filesets')}
        </div>
      </div>
    );
  };

  const renderSnapshots = () => (
    <div className="space-y-6">
      {renderInventoryToolbar(['Filesystem: All', 'Status: All', 'Type: All'], 'gpfs-snapshots.json', snapshots)}
      {Object.entries(snapshots).map(([fsName, snaps]) => {
        const filteredSnaps = snaps.filter((snap) => matchesSearch(fsName, snap));
        const collapsed = collapsedFs[`snap-${fsName}`] ?? false;
        return (
          <div key={fsName} className="bg-white/90 backdrop-blur-xl rounded-lg shadow-[0_22px_70px_-46px_rgba(15,23,42,0.78)] ring-1 ring-white/80 border border-slate-200/80 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
              <div>
                <h4 className="text-lg font-bold text-slate-900">Filesystem: {fsName}</h4>
                <p className="text-xs text-slate-500">Snapshots: {filteredSnaps.length}</p>
              </div>
              <button
                className="text-sm text-blue-600 font-medium"
                onClick={() => setCollapsedFs(prev => ({ ...prev, [`snap-${fsName}`]: !collapsed }))}
              >
                {collapsed ? 'Expand' : 'Collapse'}
              </button>
            </div>
            {!collapsed && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50/90 text-slate-500 uppercase text-[11px] font-black tracking-[0.12em]">
                    <tr>
                      <th className="px-6 py-3">Snapshot</th>
                      <th className="px-6 py-3">Directory</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">Created</th>
                      <th className="px-6 py-3">Fileset</th>
                      <th className="px-6 py-3">Type</th>
                      <th className="px-6 py-3">Expiration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredSnaps.map((snap: any, idx: number) => (
                      <tr key={idx} className="hover:bg-blue-50/50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-slate-900">{snap.directory || snap.snapID}</td>
                        <td className="px-6 py-4 text-slate-600">{snap.directory}</td>
                        <td className="px-6 py-4">
                          <StatusBadge status={snap.status} />
                        </td>
                        <td className="px-6 py-4 text-slate-600">{snap.created}</td>
                        <td className="px-6 py-4 text-slate-600">{snap.fileset || '-'}</td>
                        <td className="px-6 py-4 text-slate-600">{snap.snapType || '-'}</td>
                        <td className="px-6 py-4 text-slate-600">{snap.expirationTime || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {renderTableFooter(filteredSnaps.length, snaps.length, 'snapshots')}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  const renderRecoveryGroups = () => {
    const rgNames = Array.from(new Set([
      ...recoveryGroups.map((rg) => rg.rgName).filter(Boolean),
      ...Object.keys(recoveryGroupDetails),
      ...Object.keys(pdisksByRg),
      ...Object.keys(vdisksByRg),
    ]));
    const scopedRgNames = recoveryGroupFilter === 'all' ? rgNames : rgNames.filter((rg) => rg === recoveryGroupFilter);
    const scopedSummaries = recoveryGroups.filter((rg) => scopedRgNames.includes(rg.rgName));
    const scopedPdisks = scopedRgNames.flatMap((rg) => (pdisksByRg[rg] || []).map((pd) => ({ ...pd, rgName: rg })));
    const scopedVdisks = scopedRgNames.flatMap((rg) => (vdisksByRg[rg] || []).map((vd) => ({ ...vd, rgName: rg })));
    const scopedDetails = scopedRgNames.map((rg) => ({ rgName: rg, detail: recoveryGroupDetails[rg] || { servers: [], arrays: [], logGroups: [], pdisks: [], vdisks: [], vdiskSets: [] } }));
    const arrays = scopedDetails.flatMap(({ rgName, detail }) => detail.arrays.map((row) => ({ ...row, rgName })));
    const logGroups = scopedDetails.flatMap(({ rgName, detail }) => detail.logGroups.map((row) => ({ ...row, rgName })));
    const servers = scopedDetails.flatMap(({ rgName, detail }) => detail.servers.map((row) => ({ ...row, rgName })));
    const unhealthyRg = scopedSummaries.filter((rg) => String(rg.needsService || '').toLowerCase() === 'yes' || String(rg.active || '').toLowerCase() !== 'yes').length;
    const abnormalPdisks = scopedPdisks.filter((pd) => {
      const state = String(pd.state || '').toLowerCase();
      return state && state !== 'ok' && state !== 'active';
    }).length;
    const abnormalVdisks = scopedVdisks.filter((vd) => String(vd.activity || '').toLowerCase() !== 'normal').length;

    const vdiskByName = new Map(scopedVdisks.map((vd) => [vd.vdisk, vd]));
    const relationRows = nsds
      .map((nsd) => {
        const vd = vdiskByName.get(nsd.diskName) || vdiskByName.get(nsd.localDiskName);
        if (!vd) return null;
        const lg = logGroups.find((row) => row.rgName === vd.rgName && row.lgName === vd.logGroup);
        const daPdisks = scopedPdisks.filter((pd) => pd.rgName === vd.rgName && pd.declusteredArray === vd.declusteredArray);
        return {
          filesystem: nsd.fileSystem || '-',
          nsd: nsd.diskName,
          vdisk: vd.vdisk,
          rgName: vd.rgName || '-',
          da: vd.declusteredArray || '-',
          logGroup: vd.logGroup || '-',
          server: lg?.server || '-',
          raid: vd.raidCode || '-',
          capacity: vd.capacity || '',
          pdiskCount: daPdisks.length,
          activity: vd.activity || '-',
        };
      })
      .filter(Boolean)
      .filter((row: any) => matchesSearch(row));

    return (
      <div className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
          <MiniMetric icon={Network} label="Recovery Groups" value={scopedRgNames.length} detail={`${unhealthyRg} need attention`} tone={unhealthyRg > 0 ? 'amber' : 'green'} />
          <MiniMetric icon={Database} label="Declustered Arrays" value={arrays.length} detail={`${arrays.reduce((sum, row) => sum + toNumber(row.totalPdisks), 0)} total pdisks`} tone="blue" />
          <MiniMetric icon={HardDrive} label="Pdisks" value={scopedPdisks.length} detail={`${abnormalPdisks} abnormal`} tone={abnormalPdisks > 0 ? 'red' : 'slate'} />
          <MiniMetric icon={Activity} label="Vdisks" value={scopedVdisks.length} detail={`${abnormalVdisks} non-normal`} tone={abnormalVdisks > 0 ? 'amber' : 'slate'} />
          <MiniMetric icon={Server} label="RG Servers" value={servers.length} detail={`${new Set(servers.map((s) => s.nodeName)).size} unique nodes`} tone="slate" />
        </div>

        <div className={`${panelClass} px-5 py-4 flex flex-wrap items-center justify-between gap-3`}>
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-xs font-black uppercase tracking-wide text-slate-500">Recovery Group</label>
            <select
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 shadow-sm"
              value={recoveryGroupFilter}
              onChange={(event) => setRecoveryGroupFilter(event.target.value)}
            >
              <option value="all">All recovery groups</option>
              {rgNames.map((rg) => <option key={rg} value={rg}>{rg}</option>)}
            </select>
            <FilterButton>DA: All</FilterButton>
            <FilterButton>Status: All</FilterButton>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 shadow-sm hover:bg-slate-50"
              onClick={loadData}
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 shadow-sm hover:bg-slate-50"
              onClick={() => exportJson('gpfs-recovery-groups.json', { recoveryGroups: scopedSummaries, details: scopedDetails, relations: relationRows })}
            >
              <Download size={14} />
              Export
            </button>
          </div>
        </div>

        <div className={`${panelClass} overflow-hidden`}>
          <div className="px-5 py-4 border-b border-slate-100">
            <h4 className="text-lg font-black text-slate-950">Recovery Group Summary</h4>
            <p className="text-xs text-slate-500 mt-1">From mmvdisk rg list -Y. RG names are discovered dynamically.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/90 text-slate-500 uppercase text-[11px] font-black tracking-[0.12em]">
                <tr>
                  <th className="px-5 py-3">RG Name</th>
                  <th className="px-5 py-3">Node Class</th>
                  <th className="px-5 py-3">Active</th>
                  <th className="px-5 py-3">Master Server</th>
                  <th className="px-5 py-3">Needs Service</th>
                  <th className="px-5 py-3">User Vdisks</th>
                  <th className="px-5 py-3">RG Type</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {scopedSummaries.map((rg) => (
                  <tr key={rg.rgName} className="hover:bg-blue-50/50 transition-colors">
                    <td className="px-5 py-4 font-black text-blue-700">{rg.rgName}</td>
                    <td className="px-5 py-4 text-slate-700">{rg.className || '-'}</td>
                    <td className="px-5 py-4"><StatusBadge status={rg.active === 'yes' ? 'ok' : 'warning'} /></td>
                    <td className="px-5 py-4 font-mono text-xs text-slate-700">{rg.server || '-'}</td>
                    <td className="px-5 py-4"><StatusBadge status={rg.needsService === 'yes' ? 'warning' : 'ok'} /></td>
                    <td className="px-5 py-4 text-slate-700">{rg.userVdisks || '-'}</td>
                    <td className="px-5 py-4 text-slate-700">{rg.rgType || '-'}</td>
                    <td className="px-5 py-4 text-slate-700">{rg.status || '-'}</td>
                  </tr>
                ))}
                {scopedSummaries.length === 0 && (
                  <tr><td colSpan={8} className="px-5 py-8 text-center text-slate-400">No recovery groups returned by mmvdisk rg list.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className={`${panelClass} overflow-hidden`}>
          <div className="px-5 py-4 border-b border-slate-100">
            <h4 className="text-lg font-black text-slate-950">Filesystem / NSD / Vdisk Mapping</h4>
            <p className="text-xs text-slate-500 mt-1">Maps filesystem NSDs to vdisks, RGs, DAs, log groups, and serving nodes.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/90 text-slate-500 uppercase text-[11px] font-black tracking-[0.12em]">
                <tr>
                  <th className="px-5 py-3">Filesystem</th>
                  <th className="px-5 py-3">NSD</th>
                  <th className="px-5 py-3">Vdisk</th>
                  <th className="px-5 py-3">RG</th>
                  <th className="px-5 py-3">DA</th>
                  <th className="px-5 py-3">Log Group</th>
                  <th className="px-5 py-3">Server</th>
                  <th className="px-5 py-3">RAID</th>
                  <th className="px-5 py-3">Capacity</th>
                  <th className="px-5 py-3">DA Pdisks</th>
                  <th className="px-5 py-3">Activity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {relationRows.map((row: any) => (
                  <tr key={`${row.filesystem}-${row.nsd}-${row.vdisk}`} className="hover:bg-blue-50/50 transition-colors">
                    <td className="px-5 py-4 font-bold text-slate-900">{row.filesystem}</td>
                    <td className="px-5 py-4 font-mono text-xs text-slate-700">{row.nsd}</td>
                    <td className="px-5 py-4 font-mono text-xs text-blue-700">{row.vdisk}</td>
                    <td className="px-5 py-4 font-bold text-slate-900">{row.rgName}</td>
                    <td className="px-5 py-4 text-slate-700">{row.da}</td>
                    <td className="px-5 py-4 text-slate-700">{row.logGroup}</td>
                    <td className="px-5 py-4 text-slate-700">{row.server}</td>
                    <td className="px-5 py-4 text-slate-700">{row.raid}</td>
                    <td className="px-5 py-4 text-slate-700">{formatBytes(row.capacity)}</td>
                    <td className="px-5 py-4 text-slate-700">{row.pdiskCount}</td>
                    <td className="px-5 py-4"><StatusBadge status={row.activity === 'normal' ? 'ok' : row.activity} /></td>
                  </tr>
                ))}
                {relationRows.length === 0 && (
                  <tr><td colSpan={11} className="px-5 py-8 text-center text-slate-400">No NSD to vdisk relationship found for the selected scope.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {renderTableFooter(relationRows.length, nsds.length, 'relationships')}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {scopedDetails.map(({ rgName, detail }) => (
            <section key={rgName} className={`${panelClass} overflow-hidden`}>
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-lg font-black text-slate-950">{rgName}</h4>
                  <p className="text-xs text-slate-500 mt-1">DA, server, log group, and storage object breakdown</p>
                </div>
                <StatusBadge status={(recoveryGroups.find((rg) => rg.rgName === rgName)?.needsService === 'yes') ? 'warning' : 'ok'} />
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="rounded-lg bg-slate-50 border border-slate-100 p-3"><p className="text-xs text-slate-500">Servers</p><p className="text-xl font-black text-slate-950">{detail.servers.length}</p></div>
                  <div className="rounded-lg bg-slate-50 border border-slate-100 p-3"><p className="text-xs text-slate-500">DAs</p><p className="text-xl font-black text-slate-950">{detail.arrays.length}</p></div>
                  <div className="rounded-lg bg-slate-50 border border-slate-100 p-3"><p className="text-xs text-slate-500">Pdisks</p><p className="text-xl font-black text-slate-950">{(pdisksByRg[rgName] || []).length}</p></div>
                  <div className="rounded-lg bg-slate-50 border border-slate-100 p-3"><p className="text-xs text-slate-500">Vdisks</p><p className="text-xl font-black text-slate-950">{(vdisksByRg[rgName] || []).length}</p></div>
                </div>
                <div className="overflow-x-auto rounded-lg border border-slate-100">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase font-black">
                      <tr>
                        <th className="px-3 py-2">DA</th>
                        <th className="px-3 py-2">Pdisks</th>
                        <th className="px-3 py-2">Spare</th>
                        <th className="px-3 py-2">Total Raw</th>
                        <th className="px-3 py-2">Free Raw</th>
                        <th className="px-3 py-2">Task</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {detail.arrays.map((da: any) => (
                        <tr key={`${rgName}-${da.declusteredArray}`}>
                          <td className="px-3 py-2 font-bold text-slate-900">{da.declusteredArray}</td>
                          <td className="px-3 py-2">{da.totalPdisks || '-'}</td>
                          <td className="px-3 py-2">{da.sparePdisks || '-'}</td>
                          <td className="px-3 py-2">{formatBytes(da.totalCapacity)}</td>
                          <td className="px-3 py-2">{formatBytes(da.freeCapacity)}</td>
                          <td className="px-3 py-2">{da.backgroundTask ? `${da.backgroundTask} ${da.backgroundTaskPctComplete || 0}%` : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-wrap gap-2">
                  {detail.logGroups.map((lg: any) => (
                    <span key={`${rgName}-${lg.lgName}`} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700">
                      {lg.lgName} <span className="text-slate-400">{'->'}</span> {lg.server || '-'}
                    </span>
                  ))}
                </div>
              </div>
            </section>
          ))}
        </div>
      </div>
    );
  };

  const renderPdisks = () => (
    <div className="space-y-6">
      {renderInventoryToolbar(['Recovery Group: All', 'DA: All', 'State: All'], 'gpfs-pdisks.json', pdisksByRg)}
      {Object.entries(pdisksByRg).map(([rgName, items]) => {
        const filteredItems = items.filter((pdisk) => matchesSearch(rgName, pdisk));
        const collapsed = collapsedFs[`pdisk-${rgName}`] ?? false;
        return (
          <div key={rgName} className="bg-white/90 backdrop-blur-xl rounded-lg shadow-[0_22px_70px_-46px_rgba(15,23,42,0.78)] ring-1 ring-white/80 border border-slate-200/80 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
              <div>
                <h4 className="text-lg font-bold text-slate-900">Recovery Group: {rgName}</h4>
                <p className="text-xs text-slate-500">Physical disks (mmvdisk rgPdisk)</p>
              </div>
              <button
                className="text-sm text-blue-600 font-medium"
                onClick={() => setCollapsedFs(prev => ({ ...prev, [`pdisk-${rgName}`]: !collapsed }))}
              >
                {collapsed ? 'Expand' : 'Collapse'}
              </button>
            </div>
            {!collapsed && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50/90 text-slate-500 uppercase text-[11px] font-black tracking-[0.12em]">
                    <tr>
                      <th className="px-6 py-3">Pdisk</th>
                      <th className="px-6 py-3">DA</th>
                      <th className="px-6 py-3">Active Paths</th>
                      <th className="px-6 py-3">Total Paths</th>
                      <th className="px-6 py-3">Capacity</th>
                      <th className="px-6 py-3">Free</th>
                      <th className="px-6 py-3">State</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredItems.map((pd, idx) => {
                      const toGiB = (v?: string) => {
                        const num = parseFloat(v || '0');
                        if (Number.isFinite(num) && num > 0) {
                          return `${(num / 1024 / 1024 / 1024).toFixed(1)} GiB`;
                        }
                        return v || '-';
                      };
                      return (
                        <tr key={idx} className="hover:bg-blue-50/50 transition-colors">
                          <td className="px-6 py-4 font-semibold text-slate-900">{pd.pdiskName}</td>
                          <td className="px-6 py-4 text-slate-600">{pd.declusteredArray}</td>
                          <td className="px-6 py-4 text-slate-600">{pd.activePaths}</td>
                          <td className="px-6 py-4 text-slate-600">{pd.totalPaths}</td>
                          <td className="px-6 py-4 text-slate-600">{toGiB(pd.capacity)}</td>
                          <td className="px-6 py-4 text-slate-600">{toGiB(pd.freeSpace)}</td>
                          <td className="px-6 py-4">
                            <StatusBadge status={pd.state && pd.state.toLowerCase() === 'ok' ? 'ok' : pd.state} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {renderTableFooter(filteredItems.length, items.length, 'pdisks')}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  const renderVdisks = () => (
    <div className="space-y-6">
      {renderInventoryToolbar(['Recovery Group: All', 'DA: All', 'Activity: All'], 'gpfs-vdisks.json', vdisksByRg)}
      {Object.entries(vdisksByRg).map(([rgName, items]) => {
        const filteredItems = items.filter((vdisk) => matchesSearch(rgName, vdisk));
        const collapsed = collapsedFs[`vdisk-${rgName}`] ?? false;
        return (
          <div key={rgName} className="bg-white/90 backdrop-blur-xl rounded-lg shadow-[0_22px_70px_-46px_rgba(15,23,42,0.78)] ring-1 ring-white/80 border border-slate-200/80 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
              <div>
                <h4 className="text-lg font-bold text-slate-900">Recovery Group: {rgName}</h4>
                <p className="text-xs text-slate-500">Virtual disks (mmvdisk rgVdisk)</p>
              </div>
              <button
                className="text-sm text-blue-600 font-medium"
                onClick={() => setCollapsedFs(prev => ({ ...prev, [`vdisk-${rgName}`]: !collapsed }))}
              >
                {collapsed ? 'Expand' : 'Collapse'}
              </button>
            </div>
            {!collapsed && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50/90 text-slate-500 uppercase text-[11px] font-black tracking-[0.12em]">
                    <tr>
                      <th className="px-6 py-3">Vdisk</th>
                      <th className="px-6 py-3">DA</th>
                      <th className="px-6 py-3">Log Group</th>
                      <th className="px-6 py-3">Activity</th>
                      <th className="px-6 py-3">Capacity</th>
                      <th className="px-6 py-3">Raid Code</th>
                      <th className="px-6 py-3">Block Size</th>
                      <th className="px-6 py-3">Checksum</th>
                      <th className="px-6 py-3">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredItems.map((vd, idx) => (
                      <tr key={idx} className="hover:bg-blue-50/50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-slate-900">{vd.vdisk}</td>
                        <td className="px-6 py-4 text-slate-600">{vd.declusteredArray}</td>
                        <td className="px-6 py-4 text-slate-600">{vd.logGroup}</td>
                        <td className="px-6 py-4 text-slate-600">{vd.activity}</td>
                        <td className="px-6 py-4 text-slate-600">{vd.capacity}</td>
                        <td className="px-6 py-4 text-slate-600">{vd.raidCode}</td>
                        <td className="px-6 py-4 text-slate-600">{vd.blockSize}</td>
                        <td className="px-6 py-4 text-slate-600">{vd.checksumGranularity}</td>
                        <td className="px-6 py-4 text-slate-600">{vd.remarks}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {renderTableFooter(filteredItems.length, items.length, 'vdisks')}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );


  const renderEvents = () => (
    <div className="bg-white/90 backdrop-blur-xl rounded-lg shadow-[0_22px_70px_-46px_rgba(15,23,42,0.78)] ring-1 ring-white/80 border border-slate-200/80 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/80 flex justify-between items-center">
        <h4 className="text-lg font-bold text-slate-900">Event Logs</h4>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">Latest anomalies captured locally</span>
          <button
            className="px-3 py-1 bg-slate-100 text-slate-700 rounded text-xs"
            onClick={() => setEventLogs([])}
          >
            Clear Logs
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50/90 text-slate-500 uppercase text-[11px] font-black tracking-[0.12em]">
            <tr>
              <th className="px-6 py-3">Time</th>
              <th className="px-6 py-3">Severity</th>
              <th className="px-6 py-3">Source</th>
              <th className="px-6 py-3">Message</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {eventLogs.filter((e) => matchesSearch(e)).length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-6 text-center text-slate-400">No events recorded</td>
              </tr>
            )}
            {eventLogs.filter((e) => matchesSearch(e)).map((e) => (
              <tr key={e.id} className="hover:bg-blue-50/50 transition-colors">
                <td className="px-6 py-4 text-slate-600">{new Date(e.timestamp).toLocaleString()}</td>
                <td className="px-6 py-4"><StatusBadge status={e.severity} /></td>
                <td className="px-6 py-4 text-slate-700">{e.source}</td>
                <td className="px-6 py-4 text-slate-600">{e.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderEventsV2 = () => {
    const filteredEvents = eventLogs.filter((e) => matchesSearch(e));
    const failedComponents = clusterSummary.reduce((sum, item) => sum + Number(item.failed || 0), 0);
    const degradedComponents = clusterSummary.reduce((sum, item) => sum + Number(item.degraded || 0), 0);
    const nodeHealthAnomalies = healthEvents.filter((event) => {
      const severity = String(event.severity || event.event || event.message || '').toLowerCase();
      return ['failed', 'error', 'depend', 'degraded', 'warning'].some((term) => severity.includes(term));
    }).length;
    const diskAnomalies = disks.filter((disk) =>
      (disk.status && disk.status.toLowerCase() !== 'ready') ||
      (disk.availability && disk.availability.toLowerCase() !== 'up')
    ).length;
    const pdiskCount = Object.values(pdisksByRg).reduce((sum, items) => sum + items.length, 0);
    const pdiskAnomalies = Object.values(pdisksByRg).reduce((sum, items) => sum + items.filter((pdisk) => {
      const state = String(pdisk.state || '').toLowerCase();
      return state && state !== 'ok' && state !== 'active';
    }).length, 0);
    const currentAnomalyCount = failedComponents + degradedComponents + nodeHealthAnomalies + diskAnomalies + pdiskAnomalies;
    const coverageRows = [
      {
        source: 'mmhealth cluster show -Y',
        target: `${clusterSummary.length} components`,
        rule: 'failed > 0 or degraded > 0',
        result: failedComponents + degradedComponents,
      },
      {
        source: 'mmhealth node show -Y',
        target: `${healthEvents.length} health rows`,
        rule: 'FAILED / DEGRADED / DEPEND / WARNING',
        result: nodeHealthAnomalies,
      },
      {
        source: 'mmlsdisk <fs> -Y',
        target: `${disks.length} NSD disks`,
        rule: 'status != ready or availability != up',
        result: diskAnomalies,
      },
      {
        source: 'mmvdisk rg list --pd -Y',
        target: `${pdiskCount} physical disks`,
        rule: 'state != ok / active',
        result: pdiskAnomalies,
      },
    ];
    const healthAlertRows = healthEvents
      .filter((e) => {
        const s = String(e.severity || e.event || e.message || '').toLowerCase();
        return ['failed', 'error', 'depend', 'degraded', 'warning'].some((term) => s.includes(term));
      })
      .map((e, idx) => {
        const severityText = String(e.severity || e.event || '').toLowerCase();
        const severity = (severityText.includes('fail') || severityText.includes('error')
          ? 'error'
          : 'warning') as EventLogEntry['severity'];
        return {
          id: `health-${idx}`,
          timestamp: e.activeSince || '',
          severity,
          source: e.node || 'Cluster',
          component: e.component || '-',
          message: e.message || e.event || 'GPFS health state changed',
        };
      })
      .filter((e) => matchesSearch(e));
    const rows = filteredEvents.length > 0
      ? filteredEvents
      : healthAlertRows;

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <MiniMetric
            icon={AlertTriangle}
            label="Current Anomalies"
            value={currentAnomalyCount}
            detail={currentAnomalyCount > 0 ? 'Requires attention' : 'Latest scan passed'}
            tone={currentAnomalyCount > 0 ? 'red' : 'green'}
          />
          <MiniMetric icon={CheckCircle2} label="Cluster Components" value={clusterSummary.length} detail={`${failedComponents} failed, ${degradedComponents} degraded`} tone="blue" />
          <MiniMetric icon={HardDrive} label="Disk Checks" value={disks.length + pdiskCount} detail={`${diskAnomalies + pdiskAnomalies} abnormal`} tone="slate" />
          <MiniMetric icon={Clock} label="Event History" value={eventLogs.length} detail="Server and browser history" tone="amber" />
        </div>

        <div className={`${panelClass} overflow-hidden`}>
          <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="text-lg font-black text-slate-950">Detection Coverage</h4>
              <p className="text-xs text-slate-500 mt-1">Event Logs only records abnormal GPFS states; normal check results are summarized here.</p>
            </div>
            <StatusBadge status={currentAnomalyCount > 0 ? 'warning' : 'healthy'} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/90 text-slate-500 uppercase text-[11px] font-black tracking-[0.12em]">
                <tr>
                  <th className="px-5 py-3">Source Command</th>
                  <th className="px-5 py-3">Checked Objects</th>
                  <th className="px-5 py-3">Event Rule</th>
                  <th className="px-5 py-3">Current Matches</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {coverageRows.map((row) => (
                  <tr key={row.source} className="hover:bg-blue-50/50 transition-colors">
                    <td className="px-5 py-4 font-mono text-xs text-slate-700">{row.source}</td>
                    <td className="px-5 py-4 text-slate-600">{row.target}</td>
                    <td className="px-5 py-4 text-slate-600">{row.rule}</td>
                    <td className="px-5 py-4">
                      <StatusBadge status={row.result > 0 ? 'warning' : 'ok'} />
                      <span className="ml-2 font-bold text-slate-700">{row.result}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className={`${panelClass} px-5 py-4 flex flex-wrap items-center justify-between gap-3`}>
          <div className="flex flex-wrap items-center gap-2">
            <FilterButton>Severity: All</FilterButton>
            <FilterButton>Source: All</FilterButton>
            <FilterButton>Component: All</FilterButton>
            <FilterButton>Time: All history</FilterButton>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 shadow-sm"
              onClick={() => {
                setEventLogs([]);
                setSearchQuery('');
              }}
            >
              Reset
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 shadow-sm"
              onClick={() => exportJson('gpfs-events.json', rows)}
            >
              <Download size={14} />
              Export
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-4">
          <div className={`${panelClass} overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/90 text-slate-500 uppercase text-[11px] font-black tracking-[0.12em]">
                  <tr>
                    <th className="px-5 py-3">Time</th>
                    <th className="px-5 py-3">Severity</th>
                    <th className="px-5 py-3">Source</th>
                    <th className="px-5 py-3">Component</th>
                    <th className="px-5 py-3">Message</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-slate-400">
                        No anomaly events recorded. Latest GPFS health, disk, and pdisk checks are normal.
                      </td>
                    </tr>
                  )}
                  {rows.map((e: any) => (
                    <tr key={e.id} className="hover:bg-blue-50/50 transition-colors">
                      <td className="px-5 py-4 text-slate-600">{e.timestamp ? new Date(e.timestamp).toLocaleString() : '-'}</td>
                      <td className="px-5 py-4"><StatusBadge status={e.severity} /></td>
                      <td className="px-5 py-4 text-slate-700">{e.source}</td>
                      <td className="px-5 py-4 text-slate-600">{e.component || '-'}</td>
                      <td className="px-5 py-4 text-slate-600">{e.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {renderTableFooter(rows.length, rows.length, 'events')}
          </div>

          <aside className={`${panelClass} overflow-hidden`}>
            <div className="px-5 py-4 border-b border-slate-100">
              <h4 className="text-lg font-black text-slate-950">Alert Delivery</h4>
            </div>
            <div className="p-5 space-y-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Send size={18} />
                </div>
                <div>
                  <p className="font-black text-slate-900">Feishu Webhook</p>
                  <StatusBadge status={webhooks.length > 0 ? 'connected' : 'unknown'} />
                </div>
              </div>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-slate-500">Latest Event</p>
                  <p className="font-semibold text-slate-900">{eventLogs[0] ? new Date(eventLogs[0].timestamp).toLocaleTimeString() : '-'}</p>
                </div>
                <div>
                  <p className="text-slate-500">Webhook State</p>
                  <p className="font-semibold text-slate-900">{webhooks.length > 0 ? 'Ready' : '-'}</p>
                </div>
                <div>
                  <p className="text-slate-500">History Rows</p>
                  <p className="font-semibold text-slate-900">{eventLogs.length}</p>
                </div>
              </div>
              <button
                className="w-full rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-black text-blue-700"
                onClick={() => webhooks[0] && testWebhook(webhooks[0].url)}
              >
                Test Webhook
              </button>
            </div>
          </aside>
        </div>
      </div>
    );
  };

  const toggleSeverity = (sev: string) => {
    setNotifySeverities((prev) => {
      const next = new Set(prev);
      if (next.has(sev)) next.delete(sev); else next.add(sev);
      setSettingsDirty(true);
      return next;
    });
  };

  const addWebhook = () => {
    if (!newWebhook.name || !newWebhook.url) return;
    const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `wh-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setWebhooks((prev) => [...prev, { id, ...newWebhook }]);
    setSettingsDirty(true);
    setNewWebhook({ name: '', url: '' });
  };

  const removeWebhook = (id: string) => {
    setWebhooks((prev) => prev.filter((w) => w.id !== id));
    setSettingsDirty(true);
  };

  const postWebhook = async (url: string, text: string) => {
    const resp = await fetch(`${API_BASE_URL}/api/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, text })
    });
    if (!resp.ok) {
      throw new Error(`Webhook call failed: ${resp.status}`);
    }
  };

  const testWebhook = async (url: string) => {
    if (!url) return;
    try {
      await postWebhook(url, 'GPFS Monitor webhook test');
      alert('Webhook test sent');
    } catch {
      alert('Webhook test failed');
    }
  };

  const sendCurrentEvents = async () => {
    if (eventLogs.length === 0 || webhooks.length === 0) return;
    const msgs = eventLogs
      .filter((e) => notifySeverities.has(e.severity))
      .map((e) => `[${e.severity}] ${e.source}: ${e.message} (${e.timestamp})`);
    if (msgs.length === 0) return;
    try {
      for (const wh of webhooks) {
        await postWebhook(wh.url, msgs.join('\n'));
      }
      alert('Current events sent to webhooks.');
    } catch {
      alert('Failed to send current events.');
    }
  };

  const renderWebhooks = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <MiniMetric icon={Send} label="Webhook Targets" value={webhooks.length} detail={webhooks.length > 0 ? 'Feishu delivery enabled' : 'No delivery endpoint'} tone={webhooks.length > 0 ? 'green' : 'amber'} />
        <MiniMetric icon={Bell} label="Notify Severity" value={Array.from(notifySeverities).length} detail={Array.from(notifySeverities).join(', ') || 'No severities selected'} tone="blue" />
        <MiniMetric icon={RefreshCw} label="Poll Interval" value={backendConfig?.pollIntervalMs ? `${Math.round(Number(backendConfig.pollIntervalMs) / 1000)}s` : '-'} detail="Backend GPFS polling" tone="slate" />
        <MiniMetric icon={Clock} label="UI Refresh" value={backendConfig?.uiRefreshMs ? `${Math.round(Number(backendConfig.uiRefreshMs) / 1000)}s` : '5m'} detail={settingsDirty ? 'Unsaved changes' : 'Settings synced'} tone={settingsDirty ? 'amber' : 'green'} />
      </div>
      {renderInventoryToolbar(['Delivery: Feishu', 'Severity: Configured', 'Backend: Live'], 'gpfs-notification-settings.json', {
        webhooks,
        notifySeverities: Array.from(notifySeverities),
        backendConfig
      })}
      <div className="bg-white/90 backdrop-blur-xl rounded-lg shadow-[0_22px_70px_-46px_rgba(15,23,42,0.78)] ring-1 ring-white/80 border border-slate-200/80 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/80 flex justify-between items-center">
          <h4 className="text-lg font-bold text-slate-900">Feishu Webhooks</h4>
          <span className="text-xs text-slate-500">Add or test bot endpoints; backend interval config below</span>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              className="border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300"
              placeholder="Name"
              value={newWebhook.name}
              onChange={(e) => setNewWebhook((p) => ({ ...p, name: e.target.value }))}
            />
            <input
              className="border border-slate-200 rounded-lg px-3 py-2.5 text-sm md:col-span-2 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300"
              placeholder="Webhook URL"
              value={newWebhook.url}
              onChange={(e) => setNewWebhook((p) => ({ ...p, url: e.target.value }))}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-black shadow-[0_16px_32px_-18px_rgba(37,99,235,0.9)] hover:bg-blue-700"
              onClick={addWebhook}
            >
              <Send size={15} />
              Add Webhook
            </button>
            <button
              className={softButtonClass}
              onClick={() => testWebhook(newWebhook.url)}
            >
              Test New Webhook
            </button>
            <button
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-black border border-emerald-100 hover:bg-emerald-100 disabled:opacity-50"
              onClick={sendCurrentEvents}
              disabled={eventLogs.length === 0 || webhooks.length === 0}
            >
              Send Current Alerts
            </button>
          </div>
          <div className="space-y-2">
            <h5 className="text-sm font-semibold text-slate-700">Existing Webhooks</h5>
            {webhooks.length === 0 && <p className="text-xs text-slate-500">No webhooks added.</p>}
            {webhooks.map((w) => (
              <div key={w.id} className="flex flex-wrap items-center justify-between gap-3 bg-slate-50/80 border border-slate-100 rounded-lg px-4 py-3">
                <div>
                  <p className="text-sm font-black text-slate-900">{w.name}</p>
                  <p className="text-xs text-slate-500 break-all">{w.url}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-blue-50 hover:text-blue-700"
                    onClick={() => testWebhook(w.url)}
                  >
                    Test
                  </button>
                  <button
                    className="px-3 py-1.5 bg-red-50 border border-red-100 text-red-700 rounded-lg text-xs font-bold hover:bg-red-100"
                    onClick={() => removeWebhook(w.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white/90 backdrop-blur-xl rounded-lg shadow-[0_22px_70px_-46px_rgba(15,23,42,0.78)] ring-1 ring-white/80 border border-slate-200/80 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/80 flex justify-between items-center">
          <h4 className="text-lg font-bold text-slate-900">Notification Filters</h4>
          <span className="text-xs text-slate-500">Select severities to notify</span>
        </div>
        <div className="p-6 space-y-3">
          {['error', 'warning', 'info'].map((sev) => (
            <label key={sev} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm text-slate-700">
              <span className="font-black uppercase tracking-wide">{sev}</span>
              <input
                className="h-4 w-4 accent-blue-600"
                type="checkbox"
                checked={notifySeverities.has(sev)}
                onChange={() => toggleSeverity(sev)}
              />
            </label>
          ))}
          <p className="text-xs text-slate-500">Matched events will be sent to all configured webhooks.</p>
        </div>
      </div>

      <div className="bg-white/90 backdrop-blur-xl rounded-lg shadow-[0_22px_70px_-46px_rgba(15,23,42,0.78)] ring-1 ring-white/80 border border-slate-200/80 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/80 flex justify-between items-center">
          <h4 className="text-lg font-bold text-slate-900">Backend Settings</h4>
          <div className="flex items-center gap-3">
            {settingsDirty && <span className="text-xs font-semibold text-amber-600">Unsaved changes</span>}
            <span className="text-xs text-slate-500">Applied via /api/config</span>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-slate-500">GPFS Poll Interval (ms)</label>
              <input
                className="border border-slate-200 rounded-lg px-3 py-2.5 text-sm w-full bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300"
                type="number"
                value={backendConfig?.pollIntervalMs || ''}
                onChange={(e) => {
                  setBackendConfig((p) => ({ ...p, pollIntervalMs: Number(e.target.value) }));
                  setSettingsDirty(true);
                }}
              />
            </div>
            <div>
              <label className="text-xs text-slate-500">UI Refresh Interval (ms)</label>
              <input
                className="border border-slate-200 rounded-lg px-3 py-2.5 text-sm w-full bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300"
                type="number"
                value={backendConfig?.uiRefreshMs || ''}
                onChange={(e) => {
                  setBackendConfig((p) => ({ ...p, uiRefreshMs: Number(e.target.value) }));
                  setSettingsDirty(true);
                }}
              />
            </div>
            <div>
              <label className="text-xs text-slate-500">Log Directory</label>
              <input
                className="border border-slate-200 rounded-lg px-3 py-2.5 text-sm w-full bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300"
                value={backendConfig?.logDir || ''}
                onChange={(e) => {
                  setBackendConfig((p) => ({ ...p, logDir: e.target.value }));
                  setSettingsDirty(true);
                }}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-black shadow-[0_16px_32px_-18px_rgba(37,99,235,0.9)] hover:bg-blue-700"
              onClick={async () => {
                try {
                  const resp = await fetch(`${API_BASE_URL}/api/config`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      pollIntervalMs: backendConfig?.pollIntervalMs,
                      uiRefreshMs: backendConfig?.uiRefreshMs,
                      logDir: backendConfig?.logDir,
                      notifySeverities: Array.from(notifySeverities),
                      webhooks
                    })
                  });
                  if (!resp.ok) throw new Error(`Save failed: ${resp.status}`);
                  const saved = await resp.json();
                  if (saved.config) setBackendConfig(saved.config);
                  setSettingsDirty(false);
                  alert('Saved to backend. Polling will use new interval.');
                } catch {
                  alert('Failed to save config.');
                }
              }}
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
  const renderHealth = () => {
    const summaryData = clusterSummary.map(s => ({
      component: s.component,
      total: Number(s.total || 0),
      failed: Number(s.failed || 0),
      degraded: Number(s.degraded || 0),
      healthy: Number(s.healthy || 0),
      other: Number(s.other || 0),
    }));
    const totals = summaryData.reduce((acc, row) => ({
      total: acc.total + row.total,
      failed: acc.failed + row.failed,
      degraded: acc.degraded + row.degraded,
      healthy: acc.healthy + row.healthy,
      other: acc.other + row.other,
    }), { total: 0, failed: 0, degraded: 0, healthy: 0, other: 0 });
    const activeAnomalies = healthEvents.filter((event) => {
      const severity = String(event.severity || event.event || event.message || '').toLowerCase();
      return ['failed', 'error', 'depend', 'degraded', 'warning'].some((term) => severity.includes(term));
    }).length;

    const badge = (label: string, value: number, color: string) => (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${color}`}>
        {label}: {value}
      </span>
    );

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <MiniMetric icon={ShieldCheck} label="Health Objects" value={totals.total} detail={`${totals.healthy} healthy rows`} tone="green" />
          <MiniMetric icon={AlertTriangle} label="Failed / Degraded" value={`${totals.failed} / ${totals.degraded}`} detail="mmhealth cluster summary" tone={totals.failed > 0 ? 'red' : totals.degraded > 0 ? 'amber' : 'green'} />
          <MiniMetric icon={Activity} label="Node Anomalies" value={activeAnomalies} detail={`${healthEvents.length} node health rows`} tone={activeAnomalies > 0 ? 'amber' : 'blue'} />
          <MiniMetric icon={Clock} label="Last Check" value={lastUpdated.toLocaleTimeString()} detail="Latest API refresh" tone="slate" />
        </div>
        {renderInventoryToolbar(['Component: All', 'State: All'], 'gpfs-health-summary.json', summaryData)}
        <div className="bg-white/90 backdrop-blur-xl rounded-lg shadow-[0_22px_70px_-46px_rgba(15,23,42,0.78)] ring-1 ring-white/80 border border-slate-200/80 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/80 flex flex-wrap justify-between items-center gap-3">
          <div>
            <h4 className="text-lg font-black text-slate-950">Cluster Health Summary</h4>
            <p className="text-xs text-slate-500 mt-1">Parsed from mmhealth cluster show; abnormal node rows are reflected in Event Logs.</p>
          </div>
          <StatusBadge status={totals.failed > 0 ? 'failed' : totals.degraded > 0 ? 'warning' : 'healthy'} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/90 text-slate-500 uppercase text-[11px] font-black tracking-[0.12em]">
              <tr>
                <th className="px-6 py-3">Component</th>
                <th className="px-6 py-3">Total</th>
                <th className="px-6 py-3">Failed</th>
                <th className="px-6 py-3">Degraded</th>
                <th className="px-6 py-3">Healthy</th>
                <th className="px-6 py-3">Other</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {summaryData.filter((s) => matchesSearch(s)).map((s, idx) => (
                <tr key={idx} className="hover:bg-blue-50/50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-slate-900">{s.component}</td>
                  <td className="px-6 py-4 text-slate-700">{s.total}</td>
                  <td className="px-6 py-4">{badge('Failed', s.failed, 'bg-red-100 text-red-800')}</td>
                  <td className="px-6 py-4">{badge('Degraded', s.degraded, 'bg-yellow-100 text-yellow-800')}</td>
                  <td className="px-6 py-4">{badge('Healthy', s.healthy, 'bg-green-100 text-green-800')}</td>
                  <td className="px-6 py-4">{badge('Other', s.other, 'bg-slate-100 text-slate-800')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {renderTableFooter(summaryData.filter((s) => matchesSearch(s)).length, summaryData.length, 'components')}
        </div>
      </div>
    );
  };

  const renderConfig = () => {
    const visibleConfigs = configs.filter((cfg) => matchesSearch(cfg));
    const configValue = (name: string) => configs.find((cfg) => cfg.configParameter === name)?.value || '-';
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <MiniMetric icon={Settings} label="Parameters" value={configs.length} detail="mmlsconfig rows" tone="blue" />
          <MiniMetric icon={Database} label="Cluster Name" value={configValue('clusterName')} detail="Active GPFS cluster" tone="slate" />
          <MiniMetric icon={Network} label="Min Release" value={configValue('minReleaseLevel')} detail="Compatibility floor" tone="green" />
          <MiniMetric icon={Folder} label="CES Root" value={configValue('cesSharedRoot') === '-' ? '-' : 'Configured'} detail={configValue('cesSharedRoot')} tone="amber" />
        </div>
        {renderInventoryToolbar(['Source: mmlsconfig', 'Parameter: All'], 'gpfs-cluster-config.json', visibleConfigs)}
        <div className="bg-white/90 backdrop-blur-xl rounded-lg shadow-[0_22px_70px_-46px_rgba(15,23,42,0.78)] ring-1 ring-white/80 border border-slate-200/80 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/80 flex justify-between items-center">
            <h4 className="text-lg font-bold text-slate-900">Cluster Configuration</h4>
            <span className="text-xs font-semibold text-slate-500">{visibleConfigs.length} parameters</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/90 text-slate-500 uppercase text-[11px] font-black tracking-[0.12em]">
                <tr>
                  <th className="px-6 py-3">Parameter</th>
                  <th className="px-6 py-3">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleConfigs.map((cfg, idx) => (
                  <tr key={idx} className="hover:bg-blue-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-700">{cfg.configParameter}</td>
                    <td className="px-6 py-4 font-mono text-xs bg-slate-50">{cfg.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {renderTableFooter(visibleConfigs.length, configs.length, 'parameters')}
        </div>
      </div>
    );
  };

  const viewMeta = VIEW_TITLES[view];

  return (
    <div className="flex min-h-screen bg-[#eaf0f7] text-slate-900">
      <Sidebar currentView={view} setView={setView} />
      
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <header className="h-16 bg-white/[0.78] backdrop-blur-2xl border-b border-slate-200/80 flex items-center justify-between px-6 shrink-0 shadow-[0_18px_46px_-38px_rgba(15,23,42,0.9)]">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="hidden xl:flex items-center gap-2 text-sm">
              <span className="text-slate-500 font-semibold">Cluster:</span>
              <button className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white/90 px-3 py-2 font-black text-slate-800 shadow-sm hover:border-blue-200">
                EC1-Cluster
                <ChevronDown size={14} className="text-slate-400" />
              </button>
            </div>
            <div className="hidden lg:flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50/90 px-3 py-1.5 text-xs font-black text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_14px_rgba(16,185,129,0.75)]" />
              Live
            </div>
            <div className="relative w-full max-w-xl">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Quick lookup (e.g. node, fs01, nsd01...)" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50/90 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder:text-slate-400 shadow-inner shadow-slate-200/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-300 transition-all"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-xs font-black text-slate-400">/</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end">
               <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">Live Status</span>
               <span className="text-xs font-mono text-slate-600 flex items-center gap-1">
                 <Clock size={12} /> {lastUpdated.toLocaleTimeString()}
               </span>
            </div>
            <button 
              onClick={loadData}
              disabled={loading}
              title="Refresh GPFS data"
              className="h-9 w-9 inline-flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              title="Event logs"
              onClick={() => setView('events')}
              className="relative h-9 w-9 inline-flex items-center justify-center text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
            >
              <Bell size={19} />
              {eventLogs.length > 0 && (
                <span className="absolute -right-0.5 -top-0.5 h-4 min-w-4 rounded-full bg-red-500 px-1 text-[10px] font-black text-white">
                  {Math.min(eventLogs.length, 99)}
                </span>
              )}
            </button>
            <button
              title="Settings"
              onClick={() => setView('setup')}
              className="h-9 w-9 inline-flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <Settings size={19} />
            </button>
            <div className="h-8 w-px bg-slate-200"></div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center text-xs font-bold shadow-[0_12px_22px_-14px_rgba(15,23,42,0.9)]">GP</div>
              <UserCircle size={18} className="text-slate-400" />
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 bg-[radial-gradient(circle_at_10%_0%,rgba(59,130,246,0.16),transparent_28%),radial-gradient(circle_at_92%_18%,rgba(20,184,166,0.12),transparent_24%),linear-gradient(180deg,#f8fbff_0%,#edf3fa_100%)]">
          <div className="flex flex-wrap justify-between items-end gap-4 mb-8">
            <div>
              <h2 className="text-[34px] leading-tight font-black text-slate-950 tracking-tight">
                {viewMeta.title}
              </h2>
              <p className="text-slate-500 text-sm mt-1 max-w-3xl">{viewMeta.description}</p>
            </div>
            <div className="flex gap-3">
              <button
                className="flex items-center gap-2 bg-emerald-50/90 text-emerald-700 px-3 py-1.5 rounded-lg border border-emerald-100 text-xs font-black uppercase tracking-wider shadow-sm"
                onClick={() => setView('topology')}
              >
                Scale topology ready
              </button>
              <div className="flex items-center gap-2 bg-blue-50/90 text-blue-700 px-3 py-1.5 rounded-lg border border-blue-100 text-xs font-black uppercase tracking-wider shadow-sm">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping"></div>
                Auto-refresh: 5m
              </div>
            </div>
          </div>

          {dataError && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              GPFS API load failed: {dataError}
            </div>
          )}

          {searchQuery.trim() && (
            <div className="mb-6 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
              Filtering current view by "{searchQuery.trim()}".
              <button className="ml-3 font-semibold underline" onClick={() => setSearchQuery('')}>Clear</button>
            </div>
          )}

          {view === 'dashboard' && renderDashboardV2()}
          {view === 'topology' && (
            <Topology
          nodes={nodes.map((n) => {
                const topo = nodeTopologyMap[(n.nodeName || '').toLowerCase()] || {};
                return {
                  ...n,
                  matchingMetric: topo.matchingMetric,
                  diskTopology: topo.diskTopology
                };
              })}
              disksByFs={disksByFs}
              pdisksByRg={pdisksByRg}
              vdisksByRg={vdisksByRg}
              snapshots={snapshots}
              fsName={primaryFsName}
              mountPoint={primaryMountPoint}
              fsUsage={fsUsage || undefined}
              inodeUsage={inodeUsage || undefined}
              nsdUsageMap={nsdUsageMap}
            />
          )}
          {view === 'nodes' && renderNodesV2()}
          {view === 'storage-nsds' && renderNsds()}
          {view === 'storage-disks' && renderDisks()}
          {view === 'quotas' && renderQuotas()}
          {view === 'filesets' && renderFilesets()}
          {view === 'recovery-groups' && renderRecoveryGroups()}
          {view === 'snapshots' && renderSnapshots()}
          {view === 'pdisks' && renderPdisks()}
          {view === 'vdisks' && renderVdisks()}
          {view === 'events' && renderEventsV2()}
          {view === 'setup' && renderWebhooks()}
          {view === 'config' && renderConfig()}
          {view === 'health' && renderHealth()}
        </div>
      </main>
      {renderNodeDetailsModal()}
    </div>
  );
};

export default App;
