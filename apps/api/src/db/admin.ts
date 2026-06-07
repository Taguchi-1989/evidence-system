/**
 * テーブル作成（ローカル/CI 用）。本番では CDK が同等の定義で作成する。
 * pk/sk + GSI1/2/3（すべて projection ALL）。課金は従量(PAY_PER_REQUEST)。
 */
import { mkdirSync } from 'node:fs';
import {
  CreateTableCommand,
  DescribeTableCommand,
  type GlobalSecondaryIndex,
  type AttributeDefinition,
  ResourceNotFoundException,
} from '@aws-sdk/client-dynamodb';
import { config } from '../config.js';
import { ddbRaw, TABLE } from './client.js';

const isLocal = config.storage.driver === 'local';

function gsi(name: string): GlobalSecondaryIndex {
  return {
    IndexName: name,
    KeySchema: [
      { AttributeName: `${name}pk`, KeyType: 'HASH' },
      { AttributeName: `${name}sk`, KeyType: 'RANGE' },
    ],
    Projection: { ProjectionType: 'ALL' },
  };
}

export async function tableExists(): Promise<boolean> {
  if (isLocal) return true; // local はファイル保存のためテーブル概念なし
  try {
    await ddbRaw.send(new DescribeTableCommand({ TableName: TABLE }));
    return true;
  } catch (e) {
    if (e instanceof ResourceNotFoundException) return false;
    throw e;
  }
}

export async function createTableIfNotExists(): Promise<boolean> {
  if (isLocal) {
    mkdirSync(config.storage.localDir, { recursive: true });
    return false;
  }
  if (await tableExists()) return false;

  const attrs: AttributeDefinition[] = [
    { AttributeName: 'pk', AttributeType: 'S' },
    { AttributeName: 'sk', AttributeType: 'S' },
    { AttributeName: 'gsi1pk', AttributeType: 'S' },
    { AttributeName: 'gsi1sk', AttributeType: 'S' },
    { AttributeName: 'gsi2pk', AttributeType: 'S' },
    { AttributeName: 'gsi2sk', AttributeType: 'S' },
    { AttributeName: 'gsi3pk', AttributeType: 'S' },
    { AttributeName: 'gsi3sk', AttributeType: 'S' },
  ];

  await ddbRaw.send(
    new CreateTableCommand({
      TableName: TABLE,
      BillingMode: 'PAY_PER_REQUEST',
      AttributeDefinitions: attrs,
      KeySchema: [
        { AttributeName: 'pk', KeyType: 'HASH' },
        { AttributeName: 'sk', KeyType: 'RANGE' },
      ],
      GlobalSecondaryIndexes: [gsi('gsi1'), gsi('gsi2'), gsi('gsi3')],
    }),
  );
  return true;
}
