/** 小さな汎用ユーティリティ（ID・時刻）。 */
import { randomUUID } from 'node:crypto';

/** 接頭辞付きの短い一意 ID（例: sub-3f2a..., ev-...） */
export function id(prefix: string): string {
  return `${prefix}-${randomUUID()}`;
}

/** ISO8601（UTC）現在時刻 */
export function nowIso(): string {
  return new Date().toISOString();
}

/** 会計年度の既定（4月始まりは要件に明記なし。当面は暦年で扱い、seed/マスタで上書き可能） */
export function currentFiscalYear(): string {
  return String(new Date().getFullYear());
}
