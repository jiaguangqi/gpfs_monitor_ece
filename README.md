# GPFS Monitor ECE

IBM Storage Scale / GPFS ECE cluster monitoring dashboard.

The app contains:

- React + Vite frontend on port `4173`
- Express API backend on port `3001`
- GPFS command collectors for nodes, health, NSDs, disks, quotas, filesets, recovery groups, pdisks, vdisks, and snapshots
- Feishu webhook delivery for abnormal health events
- Production helper scripts for build, start, stop, restart, status, and logs

## Requirements

- Node.js 18+
- npm
- GPFS / IBM Storage Scale CLI tools available on the backend host

## Install

```bash
npm install
```

## Development

```bash
npm run dev
npm run start:api
```

## Production Build

```bash
chmod +x scripts/*.sh
./scripts/deploy.sh
./scripts/manage.sh start
```

Default service ports:

- Frontend: `http://0.0.0.0:4173`
- API: `http://0.0.0.0:3001`

## Operations

```bash
./scripts/manage.sh status
./scripts/manage.sh restart
./scripts/manage.sh logs
./scripts/manage.sh stop
```

Runtime files such as `logs/`, `.pids/`, `dist/`, `node_modules/`, `.env.local`, and `app-config.json` are intentionally excluded from Git.
