
export interface PDisk {
  name: string;
  da: string;
  server: string;
  capacity: string;
  freeSpace: string;
  state: string;
  osDevice: string;
}

export interface VDisk {
  name: string;
  da: string;
  logGroup: string;
  capacity: string;
  raidCode: string;
  activity: string;
  type: 'log' | 'data';
}

export interface NSD {
  diskName: string;
  volumeId: string;
  filesystem: string;
  failureGroup: number;
}

export interface ServerNode {
  id: number;
  name: string;
  topology: string;
  status: 'ok' | 'needs attention';
}

export interface RecoveryGroup {
  name: string;
  nodeClass: string;
  active: boolean;
  masterServer: string;
  vdisksCount: number;
}

export interface FileSystem {
  name: string;
  disks: string[];
}
