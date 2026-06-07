/** 表示ラベル/バッジ補助。enum→ラベルは shared に集約済み。 */
import {
  SUBMISSION_STATUS_LABELS,
  AUDIT_RESULT_LABELS,
  type SubmissionStatus,
  type AuditResultCode,
} from '@evidence/shared';

export function statusLabel(s: SubmissionStatus): string {
  return SUBMISSION_STATUS_LABELS[s];
}

export function statusVariant(
  s: SubmissionStatus,
): 'default' | 'secondary' | 'success' | 'warning' | 'muted' {
  switch (s) {
    case 'approved':
      return 'success';
    case 'submitted':
      return 'default';
    case 'returned':
      return 'warning';
    case 'draft':
    default:
      return 'muted';
  }
}

export function auditLabel(r: AuditResultCode): string {
  return AUDIT_RESULT_LABELS[r];
}

export function auditVariant(
  r: AuditResultCode,
): 'default' | 'secondary' | 'success' | 'warning' | 'muted' | 'destructive' {
  switch (r) {
    case 'OK':
    case 'REFERENCE_AVAILABLE':
      return 'success';
    case 'NEED_REVIEW':
    case 'WEAK_EVIDENCE':
      return 'warning';
    case 'NO_EVIDENCE':
    case 'UNREADABLE':
      return 'destructive';
    default:
      return 'muted';
  }
}
