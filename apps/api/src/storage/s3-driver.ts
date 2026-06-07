/** オブジェクトストレージの S3 ドライバ（aws モード）。 */
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { s3, BUCKET, presignUpload, presignDownload, objectExists } from '../s3/client.js';
import { createBucketIfNotExists } from '../s3/admin.js';

export { presignUpload, presignDownload, objectExists };

export async function ensureBucket(): Promise<boolean> {
  return createBucketIfNotExists();
}

export async function putObject(
  key: string,
  body: string | Uint8Array,
  contentType: string,
): Promise<void> {
  await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body, ContentType: contentType }));
}

export async function getObjectText(key: string): Promise<string | null> {
  try {
    const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
    return res.Body ? await res.Body.transformToString('utf-8') : null;
  } catch {
    return null;
  }
}
