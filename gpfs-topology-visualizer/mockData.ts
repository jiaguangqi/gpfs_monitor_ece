
import { ServerNode, RecoveryGroup, PDisk, VDisk, NSD, FileSystem } from './types';

export const CLUSTER_NODES: ServerNode[] = [
  { id: 1, name: 'ec1', topology: 'ECE 5 HDD', status: 'ok' },
  { id: 2, name: 'ec2', topology: 'ECE 5 HDD', status: 'ok' },
  { id: 3, name: 'ec3', topology: 'ECE 5 HDD', status: 'ok' },
  { id: 4, name: 'ec4', topology: 'ECE 5 HDD', status: 'ok' },
];

export const RECOVERY_GROUPS: RecoveryGroup[] = [
  { name: 'rg01', nodeClass: 'EC01', active: true, masterServer: 'ec2', vdisksCount: 8 }
];

export const PDISKS: PDisk[] = [
  // ec1
  { name: 'n001p001', da: 'DA1', server: 'ec1', capacity: '99 GiB', freeSpace: '10 GiB', state: 'ok', osDevice: '/dev/sdb' },
  { name: 'n001p002', da: 'DA1', server: 'ec1', capacity: '99 GiB', freeSpace: '10 GiB', state: 'ok', osDevice: '/dev/sdc' },
  { name: 'n001p003', da: 'DA1', server: 'ec1', capacity: '99 GiB', freeSpace: '10 GiB', state: 'ok', osDevice: '/dev/sdd' },
  { name: 'n001p004', da: 'DA1', server: 'ec1', capacity: '99 GiB', freeSpace: '10 GiB', state: 'ok', osDevice: '/dev/sde' },
  { name: 'n001p005', da: 'DA1', server: 'ec1', capacity: '99 GiB', freeSpace: '10 GiB', state: 'ok', osDevice: '/dev/sdf' },
  // ec2
  { name: 'n002p001', da: 'DA1', server: 'ec2', capacity: '99 GiB', freeSpace: '10 GiB', state: 'ok', osDevice: '/dev/sdb' },
  { name: 'n002p002', da: 'DA1', server: 'ec2', capacity: '99 GiB', freeSpace: '10 GiB', state: 'ok', osDevice: '/dev/sdd' },
  { name: 'n002p003', da: 'DA1', server: 'ec2', capacity: '99 GiB', freeSpace: '10 GiB', state: 'ok', osDevice: '/dev/sdc' },
  { name: 'n002p004', da: 'DA1', server: 'ec2', capacity: '99 GiB', freeSpace: '10 GiB', state: 'ok', osDevice: '/dev/sde' },
  { name: 'n002p005', da: 'DA1', server: 'ec2', capacity: '99 GiB', freeSpace: '10 GiB', state: 'ok', osDevice: '/dev/sdf' },
  // ec3
  { name: 'n003p001', da: 'DA1', server: 'ec3', capacity: '99 GiB', freeSpace: '11 GiB', state: 'ok', osDevice: '/dev/sdb' },
  { name: 'n003p002', da: 'DA1', server: 'ec3', capacity: '99 GiB', freeSpace: '10 GiB', state: 'ok', osDevice: '/dev/sdc' },
  { name: 'n003p003', da: 'DA1', server: 'ec3', capacity: '99 GiB', freeSpace: '10 GiB', state: 'ok', osDevice: '/dev/sdd' },
  { name: 'n003p004', da: 'DA1', server: 'ec3', capacity: '99 GiB', freeSpace: '10 GiB', state: 'ok', osDevice: '/dev/sde' },
  { name: 'n003p005', da: 'DA1', server: 'ec3', capacity: '99 GiB', freeSpace: '10 GiB', state: 'ok', osDevice: '/dev/sdf' },
  // ec4
  { name: 'n004p001', da: 'DA1', server: 'ec4', capacity: '99 GiB', freeSpace: '10 GiB', state: 'ok', osDevice: '/dev/sda' },
  { name: 'n004p002', da: 'DA1', server: 'ec4', capacity: '99 GiB', freeSpace: '10 GiB', state: 'ok', osDevice: '/dev/sdc' },
  { name: 'n004p003', da: 'DA1', server: 'ec4', capacity: '99 GiB', freeSpace: '9.3 GiB', state: 'ok', osDevice: '/dev/sdd' },
  { name: 'n004p004', da: 'DA1', server: 'ec4', capacity: '99 GiB', freeSpace: '10 GiB', state: 'ok', osDevice: '/dev/sde' },
  { name: 'n004p005', da: 'DA1', server: 'ec4', capacity: '99 GiB', freeSpace: '10 GiB', state: 'ok', osDevice: '/dev/sdf' },
];

export const VDISKS: VDisk[] = [
  { name: 'RG001LG001VS001', da: 'DA1', logGroup: 'LG001', capacity: '49 GiB', raidCode: '4+3p', activity: 'normal', type: 'data' },
  { name: 'RG001LG002VS001', da: 'DA1', logGroup: 'LG002', capacity: '49 GiB', raidCode: '4+3p', activity: 'normal', type: 'data' },
  { name: 'RG001LG003VS001', da: 'DA1', logGroup: 'LG003', capacity: '49 GiB', raidCode: '4+3p', activity: 'normal', type: 'data' },
  { name: 'RG001LG004VS001', da: 'DA1', logGroup: 'LG004', capacity: '49 GiB', raidCode: '4+3p', activity: 'normal', type: 'data' },
  { name: 'RG001LG005VS001', da: 'DA1', logGroup: 'LG005', capacity: '49 GiB', raidCode: '4+3p', activity: 'normal', type: 'data' },
  { name: 'RG001LG006VS001', da: 'DA1', logGroup: 'LG006', capacity: '49 GiB', raidCode: '4+3p', activity: 'normal', type: 'data' },
  { name: 'RG001LG007VS001', da: 'DA1', logGroup: 'LG007', capacity: '49 GiB', raidCode: '4+3p', activity: 'normal', type: 'data' },
  { name: 'RG001LG008VS001', da: 'DA1', logGroup: 'LG008', capacity: '49 GiB', raidCode: '4+3p', activity: 'normal', type: 'data' },
  { name: 'RG001LG001LOGHOME', da: 'DA1', logGroup: 'LG001', capacity: '32 GiB', raidCode: '4WayRep', activity: 'normal', type: 'log' },
];

export const NSDS: NSD[] = VDISKS.filter(v => v.type === 'data').map((v, i) => ({
  diskName: v.name,
  volumeId: `47140A0A6951CD4${i}`,
  filesystem: 'fs01',
  failureGroup: (i % 2) + 1
}));

export const FILESYSTEMS: FileSystem[] = [
  { name: 'fs01', disks: NSDS.map(n => n.diskName) }
];
