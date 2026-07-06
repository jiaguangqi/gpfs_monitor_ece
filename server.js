
import express from 'express';
import cors from 'cors';
import { exec } from 'node:child_process';
import fetch from 'node-fetch';
import fs from 'node:fs';
import path from 'node:path';

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

const CONFIG_PATH = path.join(process.cwd(), 'app-config.json');
const DEFAULT_CONFIG = {
  pollIntervalMs: 300000,
  uiRefreshMs: 300000,
  logDir: path.join(process.cwd(), 'logs'),
  notifySeverities: ['error', 'warning'],
  webhooks: []
};

app.use(cors());
app.use(express.json());

const loadConfig = () => {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
      return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.error('Failed to load config:', e);
  }
  return { ...DEFAULT_CONFIG };
};

const saveConfig = (cfg) => {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2));
};

let config = loadConfig();
fs.mkdirSync(config.logDir, { recursive: true });
let eventLogFile = path.join(config.logDir, 'event-log.json');

// 从 mm*-Y 输出中解析指定字段
const extractFieldFromYOutput = (output, fieldName) => {
  if (!output) return '';
  const lines = output.trim().split('\n');
  const headerLine = lines.find((line) => line.includes('HEADER'));
  if (!headerLine) return '';
  const headerParts = headerLine.split(':');
  const fieldIndex = headerParts.indexOf(fieldName);
  if (fieldIndex === -1) return '';
  const dataLine = lines.find((line) => !line.includes('HEADER'));
  if (!dataLine) return '';
  const dataParts = dataLine.split(':');
  return dataParts[fieldIndex] || '';
};

const GPFS_CMD_TIMEOUT = Number(process.env.GPFS_CMD_TIMEOUT_MS) || 20000; // 默认 20 秒
const GPFS_CMD_RETRIES = Number(process.env.GPFS_CMD_RETRIES) || 1;

const shellQuote = (value) => `'${String(value).replace(/'/g, `'\\''`)}'`;

const runCommand = (cmd, attempt = 1) =>
  new Promise((resolve) => {
    exec(
      cmd,
      {
        timeout: GPFS_CMD_TIMEOUT,
        killSignal: 'SIGKILL',
      },
      (error, stdout, stderr) => {
        if (error) {
          console.error(`Error executing ${cmd} (attempt ${attempt}):`, stderr || error.message);
          if (attempt < GPFS_CMD_RETRIES) {
            // 重试
            resolve(runCommand(cmd, attempt + 1));
          } else {
            resolve(''); // 重试后仍失败，返回空字符串防止崩溃
          }
        } else {
          resolve(stdout);
        }
      }
    );
  });

// 从 mmlsmount -Y 中提取文件系统列表
const extractFsListFromMmlsmount = (output) => {
  if (!output) return [];
  const lines = output.trim().split('\n');
  const headerLine = lines.find((line) => line.includes('HEADER'));
  if (!headerLine) return [];
  const headers = headerLine.split(':').slice(6);
  const fsIdx = headers.indexOf('realDevName');
  if (fsIdx === -1) return [];
  const fsNames = lines
    .filter((line) => !line.includes('HEADER'))
    .map((line) => {
      const parts = line.split(':').slice(6);
      return parts[fsIdx];
    })
    .filter(Boolean);
  return Array.from(new Set(fsNames));
};

// 从 mmlsconfig 文本输出中提取文件系统列表
const extractFsListFromMmlsconfig = (output) => {
  if (!output) return [];
  const lines = output.split('\n');
  const idx = lines.findIndex((l) => l.includes('File systems in cluster'));
  if (idx === -1) return [];
  const fsNames = [];
  for (let i = idx + 1; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line || /^-+$/.test(line)) break; // 跳过分隔线或空行
    // mmlsconfig 输出包含 /dev/fs1 形式，去除 /dev/ 前缀
    const cleaned = line.replace('/dev/', '').trim();
    if (cleaned) fsNames.push(cleaned);
  }
  return Array.from(new Set(fsNames));
};

// 通用：从 -Y 输出中按字段名提取所有值
const parseGpfsNamesFromY = (output, fieldName) => {
  if (!output) return [];
  const lines = output.trim().split('\n');
  const headerLine = lines.find((line) => line.includes('HEADER'));
  if (!headerLine) return [];
  const headers = headerLine.split(':').slice(6);
  const idx = headers.indexOf(fieldName);
  if (idx === -1) return [];
  return lines
    .filter((line) => !line.includes('HEADER'))
    .map((line) => {
      const parts = line.split(':').slice(6);
      return parts[idx];
    })
    .filter(Boolean);
};

// 简易解析 -Y 输出为对象数组
const parseGpfsOutput = (rawOutput) => {
  if (!rawOutput) return [];
  const lines = rawOutput.trim().split('\n');
  if (lines.length < 2) return [];
  const results = [];
  const headersMap = new Map();
  lines.forEach((line) => {
    const parts = line.split(':');
    if (parts.length < 6) return;
    const command = parts[0];
    const tagValue = parts[1] || 'default';
    const isHeader = parts[1] === 'HEADER' || parts[2] === 'HEADER';
    const headerKey = `${command}:${tagValue}`;
    if (isHeader) {
      headersMap.set(headerKey, parts.slice(6));
    } else {
      const fallbackKey = Array.from(headersMap.keys()).find((key) => key.startsWith(`${command}:`));
      const headers = headersMap.get(headerKey) || (fallbackKey ? headersMap.get(fallbackKey) : undefined);
      if (headers) {
        const dataValues = parts.slice(6);
        const obj = {};
        headers.forEach((header, idx) => {
          if (header) obj[header] = dataValues[idx] || '';
        });
        results.push(obj);
      }
    }
  });
  return results;
};

const deriveEvents = (data) => {
  const events = [];
  const nowIso = new Date().toISOString();

  // cluster summary
  const summary = parseGpfsOutput(data.mmhealth_cluster);
  summary.forEach((c) => {
    const failed = Number(c.failed || 0);
    const degraded = Number(c.degraded || 0);
    if (failed > 0) {
      events.push({
        id: `${nowIso}-${c.component}-failed`,
        timestamp: nowIso,
        severity: 'error',
        source: 'mmhealth cluster',
        message: `${c.component} failed: ${c.failed}`
      });
    } else if (degraded > 0) {
      events.push({
        id: `${nowIso}-${c.component}-degraded`,
        timestamp: nowIso,
        severity: 'warning',
        source: 'mmhealth cluster',
        message: `${c.component} degraded: ${c.degraded}`
      });
    }
  });

  // node health
  const nodeHealth = parseGpfsOutput(data.mmhealth_node);
  nodeHealth.forEach((h) => {
    const sev = (h.severity || '').toLowerCase();
    if (sev === 'failed' || sev === 'degraded' || sev === 'depend') {
      events.push({
        id: `${nowIso}-${h.node}-${h.component}-${sev}`,
        timestamp: nowIso,
        severity: sev === 'failed' ? 'error' : 'warning',
        source: `mmhealth node ${h.node}`,
        message: `${h.component} status=${h.severity} (${h.message || h.event || ''})`
      });
    }
  });

  // disks
  Object.values(data.mmlsdisk || {}).forEach((raw) => {
    const disks = parseGpfsOutput(raw);
    disks.forEach((d) => {
      if (d.status && d.status.toLowerCase() !== 'ready') {
        events.push({
          id: `${nowIso}-${d.nsdName}-status`,
          timestamp: nowIso,
          severity: 'warning',
          source: 'mmlsdisk',
          message: `${d.nsdName} status=${d.status}`
        });
      }
      if (d.availability && d.availability.toLowerCase() !== 'up') {
        events.push({
          id: `${nowIso}-${d.nsdName}-avail`,
          timestamp: nowIso,
          severity: 'warning',
          source: 'mmlsdisk',
          message: `${d.nsdName} availability=${d.availability}`
        });
      }
    });
  });

  // pdisks
  Object.entries(data.mmvdisk || {}).forEach(([rg, obj]) => {
    if (!obj || !obj.pd) return;
    const pds = parseGpfsOutput(obj.pd);
    pds.forEach((pd) => {
      const st = (pd.state || '').toLowerCase();
      if (st && st !== 'ok' && st !== 'active') {
        events.push({
          id: `${nowIso}-${rg}-${pd.pdiskName}-state`,
          timestamp: nowIso,
          severity: 'error',
          source: `mmvdisk pdisk ${rg}`,
          message: `${pd.pdiskName} state=${pd.state}`
        });
      }
    });
  });

  return events;
};
const appendEventsToFile = (events) => {
  if (!events || events.length === 0) return;
  const lines = events.map((e) => JSON.stringify(e)).join('\n') + '\n';
  fs.appendFile(eventLogFile, lines, () => {});
};

const readEventsFromFile = (limit = 200) => {
  if (!fs.existsSync(eventLogFile)) return [];
  const raw = fs.readFileSync(eventLogFile, 'utf-8');
  return raw
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .slice(-limit)
    .reverse();
};

const sendWebhooks = async (messages) => {
  if (!messages || messages.length === 0) return;
  if (!config.webhooks || config.webhooks.length === 0) return;
  const payload = messages.join('\n');
  await Promise.all(
    config.webhooks.map((wh) =>
      fetch(wh.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          msg_type: 'text',
          content: { text: payload }
        })
      })
    )
  );
};

const collectStatus = async () => {
  // 先获取挂载信息以推断文件系统名
  const mmlsmount = await runCommand('/usr/lpp/mmfs/bin/mmlsmount all -L -Y');
  const inferredFs =
    process.env.GPFS_FS_NAME ||
    extractFieldFromYOutput(mmlsmount, 'realDevName') ||
    extractFieldFromYOutput(mmlsmount, 'localDevName') ||
    'fs1';
  const fsListMount = extractFsListFromMmlsmount(mmlsmount);
  const fsListConfig = extractFsListFromMmlsconfig(await runCommand('/usr/lpp/mmfs/bin/mmlsconfig'));
  const fsTargets = Array.from(new Set([...fsListConfig, ...fsListMount, inferredFs])).filter(Boolean);

  // 并行执行其余 GPFS 状态查询命令
  const [
    mmgetstate,
    mmlsconfig,
    mmlsnsd,
    mmlsnsd_fsOnly,
    mmlsnodeclass,
    mmhealth_cluster,
    mmhealth_node,
    mmlslicense,
    mmlsmgr,
    mmdf,
    mmlspdisk,
    df_gpfs
  ] = await Promise.all([
    runCommand('/usr/lpp/mmfs/bin/mmgetstate -a -Y'),
    runCommand('/usr/lpp/mmfs/bin/mmlsconfig -Y'),
    runCommand('/usr/lpp/mmfs/bin/mmlsnsd -m -Y'),
    runCommand('/usr/lpp/mmfs/bin/mmlsnsd -Y'),
    runCommand('/usr/lpp/mmfs/bin/mmlsnodeclass -Y'),
    runCommand('/usr/lpp/mmfs/bin/mmhealth cluster show -Y'),
    runCommand('/usr/lpp/mmfs/bin/mmhealth node show -Y'),
    runCommand('/usr/lpp/mmfs/bin/mmlslicense -L -Y'),
    runCommand('/usr/lpp/mmfs/bin/mmlsmgr -Y'),
    runCommand(`/usr/lpp/mmfs/bin/mmdf ${inferredFs} -Y`),
    runCommand('/usr/lpp/mmfs/bin/mmlspdisk all -Y || true'),
    runCommand('df -Th | grep gpfs || true')
  ]);

  const mmlsquotaResults = Object.fromEntries(
    await Promise.all(
      fsTargets.map(async (fs) => {
        const out = await runCommand(`/usr/lpp/mmfs/bin/mmlsquota -Y ${shellQuote(fs)} || true`);
        return [fs, out];
      })
    )
  );

  const mmlsquotaDefaults = Object.fromEntries(
    await Promise.all(
      fsTargets.map(async (fs) => {
        const [userDefault, groupDefault, filesetDefault] = await Promise.all([
          runCommand(`/usr/lpp/mmfs/bin/mmlsquota -d -u -Y ${shellQuote(fs)} || true`),
          runCommand(`/usr/lpp/mmfs/bin/mmlsquota -d -g -Y ${shellQuote(fs)} || true`),
          runCommand(`/usr/lpp/mmfs/bin/mmlsquota -d -j -Y ${shellQuote(fs)} || true`)
        ]);
        return [fs, { userDefault, groupDefault, filesetDefault }];
      })
    )
  );

  const mmlsfilesetResults = Object.fromEntries(
    await Promise.all(
      fsTargets.map(async (fs) => {
        const out = await runCommand(`/usr/lpp/mmfs/bin/mmlsfileset ${shellQuote(fs)} -Y || true`);
        return [fs, out];
      })
    )
  );

  const filesetNamesByFs = Object.fromEntries(
    Object.entries(mmlsfilesetResults).map(([fs, raw]) => {
      const names = parseGpfsOutput(raw)
        .map((row) => row.filesetName)
        .filter(Boolean);
      return [fs, names];
    })
  );

  const mmlsquotaFilesets = Object.fromEntries(
    await Promise.all(
      Object.entries(filesetNamesByFs).map(async ([fs, filesets]) => {
        const entries = await Promise.all(
          filesets.map(async (fileset) => {
            const out = await runCommand(`/usr/lpp/mmfs/bin/mmlsquota -j ${shellQuote(fileset)} -Y ${shellQuote(fs)} || true`);
            return [fileset, out];
          })
        );
        return [fs, Object.fromEntries(entries)];
      })
    )
  );

  const quotaGroupNames = Array.from(new Set(
    Object.values(mmlsquotaResults)
      .flatMap((raw) => parseGpfsOutput(raw))
      .filter((row) => row.quotaType === 'GRP' && row.name && row.name !== '-')
      .map((row) => row.name)
  ));
  const quotaGroupMembers = Object.fromEntries(
    await Promise.all(
      quotaGroupNames.map(async (group) => {
        const raw = await runCommand(`getent group ${shellQuote(group)} || true`);
        const parts = raw.trim().split(':');
        const members = parts[3] ? parts[3].split(',').filter(Boolean) : [];
        return [group, members];
      })
    )
  );

  const mmlsdiskResults = Object.fromEntries(
    await Promise.all(
      fsTargets.map(async (fs) => {
        const out = await runCommand(`/usr/lpp/mmfs/bin/mmlsdisk ${fs} -Y`);
        return [fs, out];
      })
    )
  );

  const snapshotResults = Object.fromEntries(
    await Promise.all(
      fsTargets.map(async (fs) => {
        const out = await runCommand(`/usr/lpp/mmfs/bin/mmlssnapshot ${fs} -Y`);
        return [fs, out];
      })
    )
  );

  // 逐组件健康状态（一次采集，供前端共享）
  const healthComponents = ['NODE', 'GPFS', 'NETWORK', 'FILESYSTEM', 'DISK', 'FILESYSMGR', 'NATIVE_RAID', 'PERFMON', 'THRESHOLD'];
  const mmhealthComponents = Object.fromEntries(
    await Promise.all(
      healthComponents.map(async (comp) => {
        const out = await runCommand(`/usr/lpp/mmfs/bin/mmhealth cluster show ${comp} -Y`);
        return [comp, out];
      })
    )
  );

  // ECE mmvdisk: list RGs dynamically, then collect each RG with --all.
  // Do not hard-code rg names; production clusters may have many recovery groups.
  const rgListRaw = await runCommand('/usr/lpp/mmfs/bin/mmvdisk rg list -Y');
  const rgNames = parseGpfsNamesFromY(rgListRaw, 'rgName') || [];
  const mmvdiskDetails = Object.fromEntries(
    await Promise.all(
      rgNames.map(async (rg) => {
        const outAll = await runCommand(`/usr/lpp/mmfs/bin/mmvdisk rg list --recovery-group ${shellQuote(rg)} --all -Y || true`);
        return [rg, { all: outAll, vd: outAll, pd: outAll }];
      })
    )
  );

  // nodeclass 与 server disk topology
  const mmvdiskNc = await runCommand('/usr/lpp/mmfs/bin/mmvdisk nc list -Y');
  const nodeClasses = parseGpfsNamesFromY(mmvdiskNc, 'className') || [];
  const mmvdiskServer = Object.fromEntries(
    await Promise.all(
      nodeClasses.map(async (nc) => {
        const out = await runCommand(`/usr/lpp/mmfs/bin/mmvdisk server list -N ${nc} --disk-topology -Y || true`);
        return [nc, out];
      })
    )
  );

  return {
    mmgetstate,
    mmlsconfig,
    mmlsnsd,
    mmlsnsd_fsOnly,
    mmlsdisk: mmlsdiskResults,
    mmhealth_cluster,
    mmhealth_node,
    mmlslicense,
    mmlsmgr,
    mmlsmount,
    mmlsquota: mmlsquotaResults[inferredFs] || '',
    mmlsquota_by_fs: mmlsquotaResults,
    mmlsquota_defaults: mmlsquotaDefaults,
    mmlsquota_filesets: mmlsquotaFilesets,
    mmlsfileset: mmlsfilesetResults,
    quota_group_members: quotaGroupMembers,
    mmdf,
    mmlspdisk,
    mmhealth_components: mmhealthComponents,
    df_gpfs,
    snapshots: snapshotResults,
    mmlsnodeclass,
    mmvdisk_rg_list: rgListRaw,
    mmvdisk: mmvdiskDetails,
    mmvdisk_nc: mmvdiskNc,
    mmvdisk_server: mmvdiskServer
  };
};

let pollTimer = null;
let lastStatus = null;
let lastStatusTs = 0;

const schedulePolling = () => {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(async () => {
    try {
      const data = await collectStatus();
      lastStatus = data;
      lastStatusTs = Date.now();
      const events = deriveEvents(data);
      if (events.length > 0) {
        appendEventsToFile(events);
        const msgs = events
          .filter((e) => config.notifySeverities.includes(e.severity))
          .map((e) => `[${e.severity}] ${e.source}: ${e.message} (${e.timestamp})`);
        if (msgs.length > 0) {
          await sendWebhooks(msgs);
        }
      }
    } catch (e) {
      console.error('Error during scheduled collect:', e);
    }
  }, config.pollIntervalMs);
};

schedulePolling();
app.get('/api/status', async (_req, res) => {
  try {
    // 若最近一次轮询数据足够新，则直接复用，避免重复执行命令
    const now = Date.now();
    if (lastStatus && now - lastStatusTs < config.pollIntervalMs / 2 && lastStatus.mmhealth_components) {
      return res.json(lastStatus);
    }
    const data = await collectStatus();
    lastStatus = data;
    lastStatusTs = now;
    // 兼容：同步返回时也记录事件并发送
    const events = deriveEvents(data);
    if (events.length > 0) {
      appendEventsToFile(events);
      const msgs = events
        .filter((e) => config.notifySeverities.includes(e.severity))
        .map((e) => `[${e.severity}] ${e.source}: ${e.message} (${e.timestamp})`);
      if (msgs.length > 0) {
        await sendWebhooks(msgs);
      }
    }
    res.json(data);
  } catch (err) {
    console.error('Error in /api/status:', err);
    res.status(500).json({ error: "Failed to fetch GPFS status" });
  }
});

// Webhook proxy（解决浏览器直连飞书跨域问题）
app.post('/api/webhook', async (req, res) => {
  try {
    const { url, text } = req.body || {};
    if (!url || !text) {
      return res.status(400).json({ error: 'url and text are required' });
    }
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        msg_type: 'text',
        content: { text }
      })
    });
    const bodyText = await resp.text();
    res.status(resp.ok ? 200 : resp.status).json({ ok: resp.ok, status: resp.status, body: bodyText });
  } catch (e) {
    console.error('Error proxying webhook:', e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/events', (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 200, 1000);
    res.json({
      events: readEventsFromFile(limit),
      logFile: eventLogFile
    });
  } catch (e) {
    console.error('Error reading event log:', e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/config', (_req, res) => {
  res.json(config);
});

app.post('/api/config', (req, res) => {
  try {
    const next = {
      ...config,
      pollIntervalMs: req.body.pollIntervalMs || config.pollIntervalMs,
      uiRefreshMs: req.body.uiRefreshMs || config.uiRefreshMs,
      logDir: req.body.logDir || config.logDir,
      notifySeverities: req.body.notifySeverities || config.notifySeverities,
      webhooks: req.body.webhooks || config.webhooks
    };
    config = next;
    fs.mkdirSync(config.logDir, { recursive: true });
    eventLogFile = path.join(config.logDir, 'event-log.json');
    saveConfig(config);
    schedulePolling();
    res.json({ ok: true, config });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/', (_req, res) => {
  res.json({ status: 'ok', message: 'GPFS Monitor API', endpoint: '/api/status' });
});

app.listen(PORT, HOST, () => {
  console.log(`GPFS Monitor Backend listening at http://${HOST}:${PORT}`);
});
