
export const MOCK_MMGETSTATE = `
mmgetstate::HEADER:version:reserved:reserved:nodeName:nodeNumber:state:quorum:nodesUp:totalNodes:remarks:cnfsState:daemonShortName:daemonNodeName:
mmgetstate::0:1:::ec01:1:active:3:4:4:quorum node:(undefined):ec01:ec01:
mmgetstate::0:1:::ec02:2:active:3:4:4:quorum node:(undefined):ec02:ec02:
mmgetstate::0:1:::ec03:3:active:3:4:4:quorum node:(undefined):ec03:ec03:
mmgetstate::0:1:::ec04:4:active:3:4:4:quorum node:(undefined):ec04:ec04:
`;

export const MOCK_MMLSCONFIG = `
mmlsconfig::HEADER:version:reserved:reserved:configParameter:value:nodeList:
mmlsconfig::0:1:::clusterName:oglab.cn::
mmlsconfig::0:1:::clusterId:2924343654772276122::
mmlsconfig::0:1:::autoload:yes::
mmlsconfig::0:1:::profile:gpfsProtocolDefaults::
mmlsconfig::0:1:::dmapiFileHandleSize:32::
mmlsconfig::0:1:::minReleaseLevel:5.2.1.0::
mmlsconfig::0:1:::tscCmdAllowRemoteConnections:no::
mmlsconfig::0:1:::ccrEnabled:yes::
mmlsconfig::0:1:::cipherList:AUTHONLY::
mmlsconfig::0:1:::sdrNotifyAuthEnabled:yes::
mmlsconfig::0:1:::maxblocksize:16M::
mmlsconfig::0:1:::maxMBpS:5000:cesNodes:
mmlsconfig::0:1:::numaMemoryInterleave:yes:cesNodes:
mmlsconfig::0:1:::enforceFilesetQuotaOnRoot:yes:cesNodes:
mmlsconfig::0:1:::workerThreads:512:cesNodes:
mmlsconfig::0:1:::ignoreReplicationOnStatfs:yes::
mmlsconfig::0:1:::ignoreReplicationForQuota:yes::
mmlsconfig::0:1:::ignoreReplicaSpaceOnStat:yes::
mmlsconfig::0:1:::adminMode:central::
`;

export const MOCK_MMLSNSD = `
mmlsnsd:nsd:HEADER:version:reserved:reserved:fileSystem:diskName:volumeId:serverList:deviceType:localDiskName:remarks:sizeMB:
mmlsnsd:nsd:0:1:::fs1:mdt01:0A0A26E76826FFD5:ec01:generic:/dev/sdf:server node::
mmlsnsd:nsd:0:1:::fs1:mdt02:0A0A26E86826FFD5:ec02:generic:/dev/sdf:server node::
mmlsnsd:nsd:0:1:::fs1:mdt03:0A0A26E96826FFD7:ec03:generic:/dev/sdf:server node::
mmlsnsd:nsd:0:1:::fs1:mdt04:0A0A26EA6826FFD7:ec04:generic:/dev/sdf:server node::
mmlsnsd:nsd:0:1:::fs1:nsd1:0A0A26E767DE8191:ec01:generic:/dev/sdb:server node::
mmlsnsd:nsd:0:1:::fs1:nsd10:0A0A26E967DE8186:ec03:generic:/dev/sdc:server node::
mmlsnsd:nsd:0:1:::fs1:nsd11:0A0A26E967DE8187:ec03:generic:/dev/sdd:server node::
mmlsnsd:nsd:0:1:::fs1:nsd12:0A0A26E967DE8189:ec03:generic:/dev/sde:server node::
mmlsnsd:nsd:0:1:::fs1:nsd13:0A0A26EA67DE818B:ec04:generic:/dev/sdb:server node::
mmlsnsd:nsd:0:1:::fs1:nsd14:0A0A26EA67DE818D:ec04:generic:/dev/sdc:server node::
mmlsnsd:nsd:0:1:::fs1:nsd15:0A0A26EA67DE818F:ec04:generic:/dev/sdd:server node::
mmlsnsd:nsd:0:1:::fs1:nsd16:0A0A26EA67DE8190:ec04:generic:/dev/sde:server node::
mmlsnsd:nsd:0:1:::fs1:nsd2:0A0A26E767DE8192:ec01:generic:/dev/sdc:server node::
mmlsnsd:nsd:0:1:::fs1:nsd3:0A0A26E767DE8193:ec01:generic:/dev/sdd:server node::
mmlsnsd:nsd:0:1:::fs1:nsd4:0A0A26E767DE8194:ec01:generic:/dev/sde:server node::
`;

export const MOCK_MMLSDISK = `
mmlsdisk::HEADER:version:reserved:reserved:nsdName:driverType:sectorSize:failureGroup:metadata:data:status:availability:diskID:storagePool:remarks:numQuorumDisks:readQuorumValue:writeQuorumValue:diskSizeKB:diskUID:thinDiskType:
mmlsdisk::0:1:::nsd5:nsd:512:1:no:yes:ready:up:1:system:desc:3:2:2:104857600:E8260A0A67DE8269::
mmlsdisk::0:1:::nsd6:nsd:512:1:no:yes:ready:up:2:system::3:2:2:104857600:E8260A0A67DE8267::
mmlsdisk::0:1:::nsd7:nsd:512:1:no:yes:ready:up:3:system::3:2:2:104857600:E8260A0A67DE826B::
mmlsdisk::0:1:::nsd8:nsd:512:1:no:yes:ready:up:4:system::3:2:2:104857600:E8260A0A67DE8265::
mmlsdisk::0:1:::nsd9:nsd:512:2:no:yes:ready:up:5:system::3:2:2:104857600:E8260A0A67DE8271::
mmlsdisk::0:1:::nsd10:nsd:512:2:no:yes:ready:up:6:system::3:2:2:104857600:E8260A0A67DE8275::
mmlsdisk::0:1:::mdt01:nsd:512:10001:yes:no:ready:up:17:system:desc:3:2:2:41943040:E8260A0A68270093::
mmlsdisk::0:1:::mdt02:nsd:512:10001:yes:no:ready:up:18:system::3:2:2:41943040:E8260A0A68270090::
`;

export const MOCK_MMHEALTH_CLUSTER = `
mmhealth:Summary:HEADER:version:reserved:reserved:component:entityname:total:failed:degraded:healthy:other:
mmhealth:Summary:0:1:::NODE:NODE:4:0:0:0:4:
mmhealth:Summary:0:1:::GPFS:GPFS:4:0:0:0:4:
mmhealth:Summary:0:1:::NETWORK:NETWORK:4:0:0:4:0:
mmhealth:Summary:0:1:::FILESYSTEM:FILESYSTEM:1:0:0:0:1:
mmhealth:Summary:0:1:::DISK:DISK:20:0:0:20:0:
mmhealth:Summary:0:1:::FILESYSMGR:FILESYSMGR:1:0:0:1:0:
mmhealth:Summary:0:1:::GUI:GUI:3:0:0:3:0:
mmhealth:Summary:0:1:::PERFMON:PERFMON:4:0:0:4:0:
mmhealth:Summary:0:1:::THRESHOLD:THRESHOLD:4:0:0:4:0:
`;

export const MOCK_MMHEALTH_NODE = `
mmhealth:Event:HEADER:version:reserved:reserved:node:component:entityname:entitytype:event:arguments:activesince:identifier:ishidden:message:eventtype:severity:fullidentifier:
mmhealth:State:HEADER:version:reserved:reserved:node:component:entityname:entitytype:status:laststatuschange:lastcheck:
mmhealth:State:0:1:::ec01:NODE:ec01:NODE:TIPS:2025-12-31 12:13:53:-:
mmhealth:State:0:1:::ec01:GPFS:ec01:NODE:TIPS:2025-12-31 12:13:53:2026-01-04 13:12:27:
mmhealth:Event:0:1:::ec01:GPFS:ec01:NODE:quorum_even_nodes_no_tiebreaker::2025-07-21 08:58:15::no:No tiebreaker disk is defined with an even number of quorum nodes.:STATE_CHANGE:TIP:2924343654772276122/1/gpfs/tiebreaker/:
mmhealth:State:0:1:::ec01:NETWORK:ec01:NODE:HEALTHY:2025-07-21 08:57:40:2026-01-04 13:12:27:
mmhealth:State:0:1:::ec01:DISK:ec01:NODE:HEALTHY:2026-01-04 10:05:25:2026-01-04 13:12:48:
`;
