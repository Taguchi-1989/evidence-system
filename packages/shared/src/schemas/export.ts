/** エクスポートジョブ（ExportJob）スキーマ — 要件 §12.6 / §16 */
import { z } from 'zod';
import { ExportFormatEnum, ExportJobStatusEnum } from '../enums.js';

/** エクスポート要求（§10.4） */
export const CreateExportSchema = z.object({
  fiscalYear: z.string().min(4),
  format: ExportFormatEnum,
  /** 出力対象種別（MVP は submissions のみ） */
  exportType: z.string().default('submissions'),
});
export type CreateExportInput = z.infer<typeof CreateExportSchema>;

export const ExportJobSchema = z.object({
  exportJobId: z.string(),
  fiscalYear: z.string(),
  exportType: z.string(),
  format: ExportFormatEnum,
  requestedBy: z.string(),
  status: ExportJobStatusEnum,
  s3Key: z.string().nullable(),
  recordCount: z.number().nullable(),
  error: z.string().nullable(),
  createdAt: z.string(),
  completedAt: z.string().nullable(),
});
export type ExportJob = z.infer<typeof ExportJobSchema>;
