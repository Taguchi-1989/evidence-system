/** DynamoDB ドライバ（aws モード）。LocalStack / 実AWS で共通。 */
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
import { stripMeta, resolvePkName, resolveSkName, type QueryOptions } from './store-util.js';

export async function putItem<T extends object>(
  type: string,
  keys: KeySet,
  attributes: T,
): Promise<void> {
  await ddbDoc.send(
    new PutCommand({ TableName: TABLE, Item: { ...keys, _type: type, ...attributes } }),
  );
}

export async function getItem<T>(pk: string, sk: string): Promise<T | null> {
  const res = await ddbDoc.send(new GetCommand({ TableName: TABLE, Key: { pk, sk } }));
  if (!res.Item) return null;
  return stripMeta<T>(res.Item);
}

export async function deleteItem(pk: string, sk: string): Promise<void> {
  await ddbDoc.send(new DeleteCommand({ TableName: TABLE, Key: { pk, sk } }));
}

export async function query<T>(pkValue: string, opts: QueryOptions = {}): Promise<T[]> {
  const pkName = resolvePkName(opts);
  const skName = resolveSkName(opts);

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
    const res = await ddbDoc.send(new QueryCommand({ ...input, ExclusiveStartKey: lastKey as never }));
    for (const it of res.Items ?? []) items.push(stripMeta<T>(it));
    lastKey = res.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (lastKey && !opts.limit);

  return items;
}

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
