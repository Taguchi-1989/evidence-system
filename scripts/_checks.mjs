// バッチ共通の状態判定ヘルパー（OS非依存）。
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';

/** 失敗を握りつぶして真偽だけ返す（コマンドの成否判定用） */
export function silentExec(cmd) {
  try {
    execSync(cmd, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/** コマンドが使えるか（`<cmd> --version` で判定） */
export function hasCommand(cmd) {
  return silentExec(`${cmd} --version`);
}

/** Docker デーモンに到達できるか（CLI があっても起動していなければ false） */
export function dockerRunning() {
  return silentExec('docker info');
}

/** LocalStack が起動して健康か */
export async function localstackHealthy(url = 'http://localhost:4566/_localstack/health') {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(2500) });
    return res.ok;
  } catch {
    return false;
  }
}

/** API サーバが起動しているか */
export async function apiHealthy(url = 'http://localhost:8787/health') {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(2500) });
    return res.ok;
  } catch {
    return false;
  }
}

export function fileExists(p) {
  return existsSync(p);
}

/** 表示しながら実行（失敗時は例外） */
export function run(cmd) {
  execSync(cmd, { stdio: 'inherit' });
}

export const mark = (b) => (b ? '✓' : '✗');
