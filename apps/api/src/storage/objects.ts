/**
 * オブジェクトストレージの統一インターフェース。STORAGE_DRIVER で S3/ローカルFS を切替。
 * 利用側（evidence/export/audit/seed）はこのモジュールにのみ依存する。
 */
import { config } from '../config.js';
import * as s3d from './s3-driver.js';
import * as locald from './local-driver.js';

const impl = config.storage.driver === 'local' ? locald : s3d;

/** EvidenceFile.s3Bucket に記録する論理バケット名（local でも値を持たせる） */
export const BUCKET_LABEL = config.s3.bucket;

export const putObject = impl.putObject;
export const getObjectText = impl.getObjectText;
export const getObjectBytes = impl.getObjectBytes;
export const objectExists = impl.objectExists;
export const presignUpload = impl.presignUpload;
export const presignDownload = impl.presignDownload;
export const ensureBucket = impl.ensureBucket;
