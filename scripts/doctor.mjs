// 環境と起動状態を点検して一覧表示する（`pnpm doctor`）。
// 何が用意できていて、何が足りないかを判定し、次にやることを案内する。
import {
  hasCommand,
  dockerRunning,
  localstackHealthy,
  apiHealthy,
  fileExists,
  mark,
} from './_checks.mjs';

const nodeOk = Number(process.versions.node.split('.')[0]) >= 20;
const pnpmOk = hasCommand('pnpm');
const dockerCli = hasCommand('docker');
const dockerUp = dockerCli && dockerRunning();
const lsUp = await localstackHealthy();
const apiUp = await apiHealthy();
const envOk = fileExists('.env');
const depsOk = fileExists('node_modules');

const rows = [
  [`Node.js >= 20`, nodeOk, `現在 ${process.version}`],
  [`pnpm`, pnpmOk, pnpmOk ? '' : 'corepack enable で有効化'],
  [`Docker CLI`, dockerCli, dockerCli ? '' : 'docs/docker-without-desktop.md 参照'],
  [`Docker デーモン稼働`, dockerUp, dockerUp ? '' : '起動してください（WSL: sudo service docker start）'],
  [`LocalStack 起動`, lsUp, lsUp ? '' : 'pnpm stack:up'],
  [`API 起動 (8787)`, apiUp, apiUp ? '' : 'pnpm dev'],
  [`.env`, envOk, envOk ? '' : 'pnpm env:init で自動生成'],
  [`依存(node_modules)`, depsOk, depsOk ? '' : 'pnpm install'],
];

console.log('\n  状態点検 (doctor)\n  ─────────────────────────────────────────────');
for (const [label, ok, hint] of rows) {
  console.log(`  ${mark(ok)}  ${label.padEnd(22)} ${hint}`);
}
console.log('  ─────────────────────────────────────────────');

const blocking = !nodeOk || !pnpmOk || !dockerCli;
if (blocking) {
  console.log('\n  ⚠ 前提ツールが不足しています。上記の不足を解消してください。\n');
} else if (!dockerUp) {
  console.log('\n  → Docker デーモンを起動してから `pnpm setup` を実行してください。\n');
} else if (!lsUp || !depsOk || !envOk) {
  console.log('\n  → `pnpm setup` を実行すると、足りない所だけ整えます。\n');
} else if (!apiUp) {
  console.log('\n  → 準備OK。`pnpm dev` で起動できます。\n');
} else {
  console.log('\n  ✅ すべて起動済みです。http://localhost:5173 を開いてください。\n');
}
