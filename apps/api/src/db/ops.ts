/**
 * 単一テーブルに対する汎用 CRUD/クエリ操作。
 * 各リポジトリはここを使い、エンティティ ↔ ストア項目の変換だけを担う。
 *
 * 保存項目 = { ...keys, _type, ...attributes }。_type はエンティティ判別子。
 */
import {
  PutCommand,
  GetCommand,
  DeleteCommand,
  QueryCommand,
  UpdateCommand,
  type QueryCommandInput,
} from '@aws-sdk/lib-dynamodb';
import { ddbDoc, TABLE } from './client.js';
import type { KeySet } from './keys.js';

export interface StoredMeta {
  _type: string;
}
export type StoredItem<T> = T & KeySet & StoredMeta;

/** 項目を保存（上書き） */
export async function putItem<T extends object>(
  type: string,
  keys: KeySet,
  attributes: T,
): Promise<void> {
  await ddbDoc.send(
    new PutCommand({
      TableName: TABLE,
      Item: { ...keys, _type: type, ...attributes },
    }),
  );
}

/** 主キーで 1 件取得し、属性のみを返す（キー/メタは除去） */
export async function getItem<T>(pk: string, sk: string): Promise<T | null> {
  const res = await ddbDoc.send(new GetCommand({ TableName: TABLE, Key: { pk, sk } }));
  if (!res.Item) return null;
  return stripMeta<T>(res.Item);
}

export async function deleteItem(pk: string, sk: string): Promise<void> {
  await ddbDoc.send(new DeleteCommand({ TableName: TABLE, Key: { pk, sk } }));
}

interface QueryOptions {
  index?: string;
  /** sk / gsiNsk の begins_with 絞り込み */
  skPrefix?: string;
  /** sk の属性名（既定 'sk'。GSI なら 'gsi1sk' 等） */
  skName?: string;
  limit?: number;
  /** 降順（新しい順） */
  descending?: boolean;
}

/** パーティション内をクエリし、属性配列を返す */
export async function query<T>(
  pkValue: string,
  opts: QueryOptions & { pkName?: string } = {},
): Promise<T[]> {
  const pkName = opts.pkName ?? (opts.index ? `${opts.index}pk` : 'pk');
  const skName = opts.skName ?? (opts.index ? `${opts.index}sk` : 'sk');

  const names: Record<string, string> = { '#pk': pkName };
  const values: Record<string, unknown> = { ':pk': pkValue };
  let keyCond = '#pk = :pk';

  if (opts.skPrefix) {
    names['#sk'] = skName;
    values[':skp'] = opts.skPrefix;
    keyCond += ' AND begins_with(#sk, :skp)';
  }

  const input: QueryCommandInput = {
    TableName: TABLE,
    ...(opts.index ? { IndexName: opts.index } : {}),
    KeyConditionExpression: keyCond,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
    ...(opts.limit ? { Limit: opts.limit } : {}),
    ScanIndexForward: !opts.descending,
  };

  const items: T[] = [];
  let lastKey: Record<string, unknown> | undefined;
  do {
    const res = await ddbDoc.send(
      new QueryCommand({ ...input, ExclusiveStartKey: lastKey as never }),
    );
    for (const it of res.Items ?? []) items.push(stripMeta<T>(it));
    lastKey = res.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (lastKey && !opts.limit);

  return items;
}

/** 特定属性だけ部分更新（SET）。存在しなければ作らない用途には condition を渡す */
export async function updateAttributes(
  pk: string,
  sk: string,
  attributes: Record<string, unknown>,
): Promise<void> {
  const entries = Object.entries(attributes);
  if (entries.length === 0) return;
  const names: Record<string, string> = {};
  const values: Record<string, unknown> = {};
  const sets = entries.map(([k, v], i) => {
    names[`#k${i}`] = k;
    values[`:v${i}`] = v;
    return `#k${i} = :v${i}`;
  });
  await ddbDoc.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { pk, sk },
      UpdateExpression: `SET ${sets.join(', ')}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
    }),
  );
}

/** キー/メタ属性を取り除いてドメイン属性のみを返す */
function stripMeta<T>(item: Record<string, unknown>): T {
  const {
    pk: _pk,
    sk: _sk,
    gsi1pk: _g1p,
    gsi1sk: _g1s,
    gsi2pk: _g2p,
    gsi2sk: _g2s,
    gsi3pk: _g3p,
    gsi3sk: _g3s,
    _type,
    ...rest
  } = item;
  void _pk;
  void _sk;
  void _g1p;
  void _g1s;
  void _g2p;
  void _g2s;
  void _g3p;
  void _g3s;
  void _type;
  return rest as T;
}
