/** ストア共通の型とヘルパー（dynamo/memory 両ドライバで共有）。 */
import type { KeySet } from './keys.js';

export interface StoredMeta {
  _type: string;
}
export type StoredItem<T> = T & KeySet & StoredMeta;

export interface QueryOptions {
  index?: string;
  /** sk / gsiNsk の begins_with 絞り込み */
  skPrefix?: string;
  /** sk の属性名（既定 'sk'。GSI なら 'gsi1sk' 等） */
  skName?: string;
  /** pk の属性名（既定 'pk'。GSI なら 'gsi1pk' 等） */
  pkName?: string;
  limit?: number;
  /** 降順（新しい順） */
  descending?: boolean;
}

const KEY_ATTRS = [
  'pk',
  'sk',
  'gsi1pk',
  'gsi1sk',
  'gsi2pk',
  'gsi2sk',
  'gsi3pk',
  'gsi3sk',
  '_type',
] as const;

/** キー/メタ属性を取り除いてドメイン属性のみを返す */
export function stripMeta<T>(item: Record<string, unknown>): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(item)) {
    if (!(KEY_ATTRS as readonly string[]).includes(k)) out[k] = v;
  }
  return out as T;
}

export function resolvePkName(opts: QueryOptions): string {
  return opts.pkName ?? (opts.index ? `${opts.index}pk` : 'pk');
}
export function resolveSkName(opts: QueryOptions): string {
  return opts.skName ?? (opts.index ? `${opts.index}sk` : 'sk');
}
