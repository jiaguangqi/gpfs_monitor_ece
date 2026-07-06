
export interface GpfsNode {
  nodeName: string;
  nodeNumber: string;
  state: string;
  quorum: string;
  nodesUp: string;
  totalNodes: string;
  healthStatus: string;
  ipAddress?: string;
  isManager?: boolean;
  // Added remarks property to fix Error in App.tsx on line 259
  remarks?: string;
}

export interface GpfsDisk {
  nsdName: string;
  driverType?: string;
  sectorSize?: string;
  status: string;
  availability: string;
  metadata: string;
  data: string;
  // Renamed sizeKB to diskSizeKB to match mmgetstate output and fix Error in App.tsx on line 336
  diskSizeKB: string;
  failureGroup: string;
  storagePool: string;
  filesystem?: string;
}

export interface GpfsNSD {
  diskName: string;
  fileSystem: string;
  serverList: string;
  deviceType: string;
  localDiskName: string;
  remarks: string;
  deviceType: string;
  localDiskName: string;
  sizeMB: string;
}

export interface GpfsConfig {
  // Renamed parameter to configParameter to match mmgetstate output and fix Error in App.tsx on line 365
  configParameter: string;
  value: string;
  nodeList: string;
}

export interface FsUsage {
  totalGB: number;
  usedGB: number;
  usedPct: number;
}

export interface InodeUsage {
  used: number;
  total: number;
  usedPct: number;
}

export interface ClusterSummary {
  component: string;
  total: number;
  failed: number;
  degraded: number;
  healthy: number;
  other: number;
}

export interface HealthEvent {
  node: string;
  component: string;
  event: string;
  severity: string;
  message: string;
  activeSince: string;
}

export interface SnapshotInfo {
  filesystemName: string;
  directory: string;
  snapID: string;
  status: string;
  created: string;
  fileset?: string;
  snapType?: string;
  expirationTime?: string;
}

export interface PdDisk {
  rgName?: string;
  pdiskName: string;
  declusteredArray: string;
  activePaths: string;
  totalPaths: string;
  capacity: string;
  freeSpace: string;
  state: string;
  server?: string;
  paths?: string;
}

export interface Vdisk {
  rgName?: string;
  vdisk: string;
  declusteredArray: string;
  logGroup: string;
  activity: string;
  capacity: string;
  raidCode: string;
  blockSize: string;
  checksumGranularity: string;
  remarks: string;
}

export interface EventLogEntry {
  id: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'error';
  source: string;
  message: string;
}

export interface WebhookConfig {
  id: string;
  name: string;
  url: string;
}

export interface GpfsQuota {
  filesystemName: string;
  quotaType: string;
  id?: string;
  name?: string;
  blockUsage?: string;
  blockQuota?: string;
  blockLimit?: string;
  blockInDoubt?: string;
  blockGrace?: string;
  filesUsage?: string;
  filesQuota?: string;
  filesLimit?: string;
  filesInDoubt?: string;
  filesGrace?: string;
  remarks?: string;
  fid?: string;
  filesetname?: string;
  filesetName?: string;
  source?: 'active' | 'default' | 'fileset';
}

export interface GpfsFileset {
  filesystemName: string;
  filesetName: string;
  id?: string;
  rootInode?: string;
  parentId?: string;
  status?: string;
  path?: string;
  created?: string;
  inodeSpace?: string;
  inodes?: string;
  dataInKB?: string;
  comment?: string;
  filesetMode?: string;
  isInodeSpaceOwner?: string;
  maxInodes?: string;
  allocInodes?: string;
  freeInodes?: string;
}

export type ViewType =
  | 'dashboard'
  | 'topology'
  | 'nodes'
  | 'storage-nsds'
  | 'storage-disks'
  | 'quotas'
  | 'filesets'
  | 'recovery-groups'
  | 'snapshots'
  | 'pdisks'
  | 'vdisks'
  | 'events'
  | 'setup'
  | 'config'
  | 'health';
