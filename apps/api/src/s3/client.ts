/**
 * S3 クライアントと presigned URL ヘルパー（要件 §14）。
 * ファイル本体は Lambda を経由せず、ブラウザ⇄S3 で直接やり取りする。
 */
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../config.js';

/**
 * 署名生成用クライアント。
 * ブラウザから到達できるホスト（publicEndpoint）で署名する必要があるため、
 * ローカルでは LocalStack の公開エンドポイントを endpoint に使う。
 */
const signingEndpoint = config.s3.publicEndpoint ?? config.aws.endpoint;

export const s3 = new S3Client({
  region: config.aws.region,
  forcePathStyle: config.s3.forcePathStyle,
  // AWS SDK v3 は既定で CRC32 チェックサムを presigned URL に付与するため、
  // ブラウザ/単純PUT が 400 になる。PUT/GET 直アップロードでは不要なので無効化する。
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED',
  ...(signingEndpoint ? { endpoint: signingEndpoint } : {}),
  ...(config.aws.accessKeyId && config.aws.secretAccessKey
    ? {
        credentials: {
          accessKeyId: config.aws.accessKeyId,
          secretAccessKey: config.aws.secretAccessKey,
        },
      }
    : {}),
});

export const BUCKET = config.s3.bucket;

/** アップロード用 presigned URL（ブラウザが PUT する） */
export function presignUpload(key: string, contentType: string): Promise<string> {
  const cmd = new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType });
  return getSignedUrl(s3, cmd, { expiresIn: config.s3.presignExpires });
}

/** ダウンロード用 presigned URL（ブラウザが GET する） */
export function presignDownload(key: string, fileName?: string): Promise<string> {
  const cmd = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ...(fileName
      ? { ResponseContentDisposition: `attachment; filename="${encodeURIComponent(fileName)}"` }
      : {}),
  });
  return getSignedUrl(s3, cmd, { expiresIn: config.s3.presignExpires });
}

/** オブジェクト存在確認（監査Agentで使用） */
export async function objectExists(key: string): Promise<boolean> {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}
