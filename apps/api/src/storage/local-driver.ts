/**
 * オブジェクトストレージのローカルFSドライバ（local モード / Docker 不要）。
 * presigned URL の代わりに、API 自身の /_local-objects エンドポイントを指す URL を発行する。
 * ブラウザは通常どおり PUT/GET するだけ（フロント無改変）。
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { config } from '../config.js';

const ROOT = resolve(join(config.storage.localDir, 'objects'));
const PUBLIC_BASE = `http://localhost:${config.api.port}`;
const EXPIRES_MS = config.s3.presignExpires * 1000;

/** key を安全なローカルパスへ（ディレクトリトラバーサル防止）。 */
function safePath(key: string): string {
  const p = resolve(join(ROOT, key));
  if (p !== ROOT && !p.startsWith(ROOT + (process.platform === 'win32' ? '\\' : '/'))) {
    throw new Error('invalid object key');
  }
  return p;
}

export async function ensureBucket(): Promise<boolean> {
  mkdirSync(ROOT, { recursive: true });
  return true;
}

export async function putObject(
  key: string,
  body: string | Uint8Array,
  _contentType: string,
): Promise<void> {
  const p = safePath(key);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, body);
}

export async function getObjectText(key: string): Promise<string | null> {
  try {
    return readFileSync(safePath(key), 'utf8');
  } catch {
    return null;
  }
}

export function getObjectBuffer(key: string): Buffer | null {
  try {
    return readFileSync(safePath(key));
  } catch {
    return null;
  }
}

export async function objectExists(key: string): Promise<boolean> {
  try {
    return existsSync(safePath(key));
  } catch {
    return false;
  }
}

// ── 簡易トークン（ローカル開発用。presigned URL 相当の有効期限つき）──
interface TokenClaims {
  key: string;
  op: 'put' | 'get';
  exp: number;
}
function makeToken(key: string, op: 'put' | 'get'): string {
  const claims: TokenClaims = { key, op, exp: Date.now() + EXPIRES_MS };
  return Buffer.from(JSON.stringify(claims), 'utf8').toString('base64url');
}
export function verifyToken(token: string, key: string, op: 'put' | 'get'): boolean {
  try {
    const c = JSON.parse(Buffer.from(token, 'base64url').toString('utf8')) as TokenClaims;
    return c.key === key && c.op === op && c.exp > Date.now();
  } catch {
    return false;
  }
}

export async function presignUpload(key: string, _contentType: string): Promise<string> {
  return `${PUBLIC_BASE}/_local-objects/${encodeURIComponent(key)}?token=${makeToken(key, 'put')}`;
}

export async function presignDownload(key: string, fileName?: string): Promise<string> {
  const fn = fileName ? `&filename=${encodeURIComponent(fileName)}` : '';
  return `${PUBLIC_BASE}/_local-objects/${encodeURIComponent(key)}?token=${makeToken(key, 'get')}${fn}`;
}
