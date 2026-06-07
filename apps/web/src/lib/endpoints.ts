/** バックエンド API への型付き呼び出し（Hono ルートと 1:1）。 */
import type {
  Submission,
  EvidenceFile,
  AuditResult,
  AuditRunSummary,
  MastersResponse,
  StatsResponse,
  ExportJob,
  PresignUploadResponse,
  PresignUploadInput,
  ConfirmEvidenceInput,
  CreateSubmissionInput,
  UpdateSubmissionInput,
  ActivityLog,
  Policy,
  OperationMode,
} from '@evidence/shared';
import { apiFetch } from './api';

export interface EffectivePolicy {
  fiscalYear: string;
  mode: OperationMode;
  policy: Policy;
}

export interface PendingResponse {
  notSubmitted: { userId: string; name: string; departmentId: string }[];
  pendingReview: Submission[];
}

const qs = (params: Record<string, string | undefined>) => {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
  const s = sp.toString();
  return s ? `?${s}` : '';
};

export const endpoints = {
  // 設定・マスタ
  masters: (fiscalYear: string) =>
    apiFetch<MastersResponse>(`/masters${qs({ fiscalYear })}`),
  policy: (fiscalYear: string) =>
    apiFetch<EffectivePolicy>(`/config/policy${qs({ fiscalYear })}`),
  updatePolicy: (body: { fiscalYear: string; mode: OperationMode; overrides?: Partial<Policy> }) =>
    apiFetch<EffectivePolicy>('/admin/config/policy', { method: 'PUT', body }),
  upsertDepartment: (body: {
    fiscalYear: string;
    departmentId: string;
    name: string;
    parentDepartmentId?: string | null;
  }) => apiFetch<unknown>('/admin/masters/department', { method: 'PUT', body }),

  // 提出
  listSubmissions: (p: { scope?: string; fiscalYear: string; status?: string; departmentId?: string }) =>
    apiFetch<{ scope: string; items: Submission[] }>(`/submissions${qs(p)}`),
  getSubmission: (id: string) => apiFetch<Submission>(`/submissions/${id}`),
  createSubmission: (body: CreateSubmissionInput) =>
    apiFetch<Submission>('/submissions', { method: 'POST', body }),
  updateSubmission: (id: string, body: UpdateSubmissionInput) =>
    apiFetch<Submission>(`/submissions/${id}`, { method: 'PUT', body }),
  submitSubmission: (id: string) =>
    apiFetch<Submission>(`/submissions/${id}/submit`, { method: 'POST' }),
  approveSubmission: (id: string, comment: string) =>
    apiFetch<Submission>(`/submissions/${id}/approve`, { method: 'POST', body: { comment } }),
  rejectSubmission: (id: string, comment: string) =>
    apiFetch<Submission>(`/submissions/${id}/reject`, { method: 'POST', body: { comment } }),
  commentSubmission: (id: string, comment: string) =>
    apiFetch<Submission>(`/submissions/${id}/comment`, { method: 'POST', body: { comment } }),

  // 証跡
  listEvidence: (id: string) =>
    apiFetch<{ items: EvidenceFile[] }>(`/submissions/${id}/evidence`),
  presign: (id: string, body: PresignUploadInput) =>
    apiFetch<PresignUploadResponse>(`/submissions/${id}/evidence/presign`, { method: 'POST', body }),
  confirmEvidence: (id: string, body: ConfirmEvidenceInput) =>
    apiFetch<EvidenceFile>(`/submissions/${id}/evidence/confirm`, { method: 'POST', body }),
  deleteEvidence: (id: string, evidenceId: string) =>
    apiFetch<{ ok: boolean }>(`/submissions/${id}/evidence/${evidenceId}`, { method: 'DELETE' }),
  evidenceDownloadUrl: (id: string, evidenceId: string) =>
    apiFetch<{ url: string }>(`/submissions/${id}/evidence/${evidenceId}/download`),

  // 監査
  submissionAudit: (id: string) =>
    apiFetch<{ items: AuditResult[]; hidden: boolean }>(`/submissions/${id}/audit`),
  yearAudit: (fiscalYear: string) =>
    apiFetch<{ items: AuditResult[]; hidden: boolean }>(`/admin/audit${qs({ fiscalYear })}`),
  runAudit: (body: { fiscalYear: string; submissionId?: string }) =>
    apiFetch<AuditRunSummary>('/admin/audit/run', { method: 'POST', body }),

  // 管理
  stats: (fiscalYear: string) => apiFetch<StatsResponse>(`/admin/stats${qs({ fiscalYear })}`),
  pending: (fiscalYear: string) => apiFetch<PendingResponse>(`/admin/pending${qs({ fiscalYear })}`),
  logs: (fiscalYear: string) =>
    apiFetch<{ items: ActivityLog[] }>(`/admin/logs${qs({ fiscalYear })}`),

  // エクスポート
  createExport: (body: { fiscalYear: string; format: 'csv' | 'json'; exportType?: string }) =>
    apiFetch<ExportJob>('/admin/export', { method: 'POST', body }),
  getExport: (id: string) => apiFetch<ExportJob>(`/admin/export/${id}`),
  listExports: (fiscalYear: string) =>
    apiFetch<{ items: ExportJob[] }>(`/admin/exports${qs({ fiscalYear })}`),
  exportDownloadUrl: (id: string) => apiFetch<{ url: string }>(`/admin/export/${id}/download`),

  // 一括取込
  importPresign: (body: { fileName: string; contentType: string; fileSize: number }) =>
    apiFetch<{ uploadUrl: string; s3Key: string; expiresIn: number }>('/admin/import/presign', {
      method: 'POST',
      body,
    }),
  runImport: (body: { fiscalYear: string; s3Key: string; dryRun: boolean }) =>
    apiFetch<ImportResult>('/admin/import', { method: 'POST', body }),
};

export interface ImportRowResult {
  row: number;
  ok: boolean;
  message?: string;
  submissionId?: string;
  title?: string;
  action?: 'created' | 'updated';
}
export interface ImportResult {
  total: number;
  created: number;
  updated: number;
  failed: number;
  dryRun: boolean;
  results: ImportRowResult[];
}
