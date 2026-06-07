// 状態を判定しながら進めるセットアップ（`pnpm setup`）。
// 「起動している所/いない所」を各ステップで確認し、足りない所だけ実行する（冪等）。
import { copyFileSync } from 'node:fs';
import { dockerRunning, localstackHealthy, fileExists, run, hasCommand } from './_checks.mjs';

const step = (n, msg) => console.log(`\n==> [${n}] ${msg}`);
const skip = (msg) => console.log(`   ✓ ${msg}（スキップ）`);

async function waitLocalstack(timeoutMs = 90000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await localstackHealthy()) return true;
    await new Promise((r) => setTimeout(r, 2000));
  }
  return false;
}

// 1) .env
step(1, '.env を確認');
if (fileExists('.env')) skip('.env は既にあります');
else {
  copyFileSync('.env.example', '.env');
  console.log('   .env を .env.example から作成しました');
}

// 2) 依存
step(2, '依存(node_modules)を確認');
if (fileExists('node_modules')) skip('依存は導入済み（再導入は pnpm install）');
else {
  if (!hasCommand('pnpm')) {
    console.error('   ✗ pnpm がありません。`corepack enable` 後に再実行してください。');
    process.exit(1);
  }
  run('pnpm install');
}

// 3) Docker デーモン
step(3, 'Docker デーモンの稼働を確認');
if (dockerRunning()) skip('Docker は稼働中');
else {
  console.error('   ✗ Docker デーモンに到達できません。');
  console.error('     - Docker Desktop なしの場合: docs/docker-without-desktop.md（WSL2+Engine）');
  console.error('     - WSL内: sudo service docker start');
  console.error('     - Docker を入れたくない: GitHub Codespaces を利用');
  process.exit(1);
}

// 4) LocalStack
step(4, 'LocalStack の起動を確認');
if (await localstackHealthy()) skip('LocalStack は起動済み');
else {
  console.log('   LocalStack を起動します（docker compose up -d）');
  run('docker compose up -d');
  process.stdout.write('   ヘルス待機中');
  const ok = await waitLocalstack();
  console.log('');
  if (!ok) {
    console.error('   ✗ LocalStack が健康になりません。`pnpm stack:logs` で確認してください。');
    process.exit(1);
  }
  console.log('   ✓ LocalStack 起動完了');
}

// 5) seed（冪等：テーブル/バケットは存在チェック付き）
step(5, '初期化(seed) を実行（冪等）');
run('pnpm seed');

console.log('\n✅ セットアップ完了。`pnpm dev` で起動 → http://localhost:5173\n');
