// 環境と起動状態を点検して一覧表示する（`pnpm doctor`）。
// 何が用意できていて、何が足りないかを判定し、次にやることを案内する。
import {
  hasCommand,
  dockerRunning,
  localstackHealthy,
  apiHealthy,
  fileExists,
  storageDriver,
  mark,
} from './_checks.mjs';

const driver = storageDriver();
const isLocal = driver === 'local';

const nodeOk = Number(process.versions.node.split('.')[0]) >= 20;
const pnpmOk = hasCommand('pnpm');
const dockerCli = hasCommand('docker');
const dockerUp = dockerCli && dockerRunning();
const lsUp = await localstackHealthy();
const apiUp = await apiHealthy();
const envOk = fileExists('.env');
const depsOk = fileExists('node_modules');

const na = '—（localモードで不要）';
const rows = [
  [`Node.js >= 20`, nodeOk, `現在 ${process.version}`],
  [`pnpm`, pnpmOk, pnpmOk ? '' : 'corepack enable で有効化'],
  [`ストレージ方式`, true, `STORAGE_DRIVER=${driver}`],
  [`Docker CLI`, isLocal ? true : dockerCli, isLocal ? na : dockerCli ? '' : 'docs/docker-without-desktop.md 参照'],
  [`Docker デーモン稼働`, isLocal ? true : dockerUp, isLocal ? na : dockerUp ? '' : '起動してください（WSL: sudo service docker start）'],
  [`LocalStack 起動`, isLocal ? true : lsUp, isLocal ? na : lsUp ? '' : 'pnpm stack:up'],
  [`API 起動 (8787)`, apiUp, apiUp ? '' : 'pnpm dev'],
  [`.env`, envOk, envOk ? '' : 'pnpm env:init で自動生成'],
  [`依存(node_modules)`, depsOk, depsOk ? '' : 'pnpm install'],
];

console.log('\n  状態点検 (doctor)\n  ─────────────────────────────────────────────');
for (const [label, ok, hint] of rows) {
  console.log(`  ${mark(ok)}  ${String(label).padEnd(22)} ${hint}`);
}
console.log('  ─────────────────────────────────────────────');

const blocking = !nodeOk || !pnpmOk || (!isLocal && !dockerCli);
if (blocking) {
  console.log('\n  ⚠ 前提ツールが不足しています。Docker を避けるなら `pnpm setup:local`。\n');
} else if (!isLocal && !dockerUp) {
  console.log('\n  → Docker 起動後に `pnpm setup`、または Docker 不要の `pnpm setup:local`。\n');
} else if ((!isLocal && !lsUp) || !depsOk || !envOk) {
  console.log('\n  → `pnpm setup`（aws）/ `pnpm setup:local`（Docker不要）で足りない所を整えます。\n');
} else if (!apiUp) {
  console.log('\n  → 準備OK。`pnpm dev` で起動できます。\n');
} else {
  console.log('\n  ✅ すべて起動済みです。http://localhost:5173 を開いてください。\n');
}
