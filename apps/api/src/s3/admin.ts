/**
 * バケット作成 + CORS 設定（ローカル/CI 用）。本番では CDK が同等設定で作成。
 * ブラウザから presigned URL で直接 PUT/GET するため CORS が必須（プラン リスク欄）。
 */
import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketCorsCommand,
} from '@aws-sdk/client-s3';
import { s3, BUCKET } from './client.js';
import { config } from '../config.js';

async function bucketExists(): Promise<boolean> {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: BUCKET }));
    return true;
  } catch {
    return false;
  }
}

export async function createBucketIfNotExists(): Promise<boolean> {
  const existed = await bucketExists();
  if (!existed) {
    await s3.send(
      new CreateBucketCommand({
        Bucket: BUCKET,
        ...(config.aws.region !== 'us-east-1'
          ? { CreateBucketConfiguration: { LocationConstraint: config.aws.region as never } }
          : {}),
      }),
    );
  }

  // CORS は毎回適用（冪等）。
  await s3.send(
    new PutBucketCorsCommand({
      Bucket: BUCKET,
      CORSConfiguration: {
        CORSRules: [
          {
            // ローカルは緩め。本番は許可オリジンを CDK で絞る。
            AllowedOrigins: ['*'],
            AllowedMethods: ['PUT', 'GET', 'HEAD'],
            AllowedHeaders: ['*'],
            ExposeHeaders: ['ETag'],
            MaxAgeSeconds: 3000,
          },
        ],
      },
    }),
  );
  return !existed;
}
