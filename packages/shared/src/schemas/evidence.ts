/** 証跡ファイル（EvidenceFile）スキーマ — 要件 §12.3 / §14 presigned URL フロー */
import { z } from 'zod';
import {
  EvidenceTypeEnum,
  RelatedAxisEnum,
  StorageStatusEnum,
  ALLOWED_UPLOAD_EXTENSIONS,
} from '../enums.js';

/** ファイル名から拡張子を取り出し、許可リストにあるか判定 */
export function extractExtension(fileName: string): string {
  const idx = fileName.lastIndexOf('.');
  return idx >= 0 ? fileName.slice(idx + 1).toLowerCase() : '';
}
export function isAllowedExtension(fileName: string): boolean {
  return (ALLOWED_UPLOAD_EXTENSIONS as readonly string[]).includes(extractExtension(fileName));
}

/** presigned アップロードURL の発行要求（§14.1 step1） */
export const PresignUploadSchema = z.object({
  originalFileName: z
    .string()
    .min(1)
    .max(255)
    .refine(isAllowedExtension, { message: '許可されていないファイル形式です' }),
  contentType: z.string().min(1).max(200),
  fileSize: z
    .number()
    .int()
    .positive()
    .max(50 * 1024 * 1024, { message: 'ファイルサイズが大きすぎます（上限50MB）' }),
  evidenceType: EvidenceTypeEnum,
  relatedAxis: RelatedAxisEnum.default('UNCLASSIFIED'),
  description: z.string().max(1000).optional().default(''),
});
export type PresignUploadInput = z.infer<typeof PresignUploadSchema>;

/** presign 応答（ブラウザはこの uploadUrl へ直接 PUT する） */
export const PresignUploadResponseSchema = z.object({
  evidenceId: z.string(),
  uploadUrl: z.string().url(),
  s3Key: z.string(),
  expiresIn: z.number(),
});
export type PresignUploadResponse = z.infer<typeof PresignUploadResponseSchema>;

/** アップロード完了の確定（§14.1 メタデータ保存） */
export const ConfirmEvidenceSchema = z.object({
  evidenceId: z.string().min(1),
  checksum: z.string().optional(),
});
export type ConfirmEvidenceInput = z.infer<typeof ConfirmEvidenceSchema>;

/**
 * 機密のため添付不可（§9.2）など、ファイルを伴わない証跡メタの登録。
 * ファイル本体なしで理由のみ記録する。
 */
export const RegisterNonFileEvidenceSchema = z.object({
  evidenceType: EvidenceTypeEnum,
  relatedAxis: RelatedAxisEnum.default('UNCLASSIFIED'),
  description: z.string().max(1000).optional().default(''),
  isConfidential: z.boolean().default(true),
});
export type RegisterNonFileEvidenceInput = z.infer<typeof RegisterNonFileEvidenceSchema>;

/** 永続化される証跡エンティティ（§12.3） */
export const EvidenceFileSchema = z.object({
  evidenceId: z.string(),
  submissionId: z.string(),
  fiscalYear: z.string(),
  s3Bucket: z.string(),
  s3Key: z.string(),
  originalFileName: z.string(),
  contentType: z.string(),
  fileSize: z.number(),
  checksum: z.string().nullable(),
  evidenceType: EvidenceTypeEnum,
  relatedAxis: RelatedAxisEnum,
  description: z.string(),
  uploadedBy: z.string(),
  uploadedAt: z.string().nullable(),
  isConfidential: z.boolean(),
  storageStatus: StorageStatusEnum,
  deletedAt: z.string().nullable().default(null),
});
export type EvidenceFile = z.infer<typeof EvidenceFileSchema>;
