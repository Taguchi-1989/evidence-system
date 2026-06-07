/**
 * アプリ内アクセス制御（要件 §13）。
 * 提出データの閲覧・編集・確認(承認/差戻し)の可否をロールとスコープで判定する。
 */
import type { AuthUser, Submission } from '@evidence/shared';
import { forbidden } from '../lib/http.js';

/** 全社閲覧できるロール（事務局・監査者・システム管理者） */
const ORG_WIDE_VIEW: AuthUser['role'][] = ['office', 'auditor', 'admin'];

export function isOrgWideViewer(user: AuthUser): boolean {
  return ORG_WIDE_VIEW.includes(user.role);
}

/** 上長が見られる部署か（自部署＋配下） */
export function managesDepartment(user: AuthUser, departmentId: string): boolean {
  return (
    user.role === 'manager' &&
    (user.departmentId === departmentId || user.managedDepartmentIds.includes(departmentId))
  );
}

export function canViewSubmission(user: AuthUser, s: Submission): boolean {
  if (isOrgWideViewer(user)) return true;
  if (s.userId === user.userId) return true;
  if (managesDepartment(user, s.departmentId)) return true;
  return false;
}

/** 編集できるのは本人の下書き/差戻しのみ（§13.4 一般入力者） */
export function canEditSubmission(user: AuthUser, s: Submission): boolean {
  return s.userId === user.userId && (s.status === 'draft' || s.status === 'returned');
}

/** 承認・差戻しできるのは担当部署の上長、または事務局/管理者（§10.3, §13.4） */
export function canReviewSubmission(user: AuthUser, s: Submission): boolean {
  if (user.role === 'office' || user.role === 'admin') return true;
  return managesDepartment(user, s.departmentId);
}

export function assertCanView(user: AuthUser, s: Submission): void {
  if (!canViewSubmission(user, s)) throw forbidden('この提出を閲覧する権限がありません');
}
export function assertCanEdit(user: AuthUser, s: Submission): void {
  if (!canEditSubmission(user, s)) throw forbidden('この提出を編集できません');
}
export function assertCanReview(user: AuthUser, s: Submission): void {
  if (!canReviewSubmission(user, s)) throw forbidden('この提出を確認する権限がありません');
}

export type ListScope = 'me' | 'department' | 'all';

/** 要求スコープをロールで許可される範囲に丸める */
export function resolveListScope(user: AuthUser, requested: ListScope | undefined): ListScope {
  if (requested === 'all') {
    if (isOrgWideViewer(user)) return 'all';
    if (user.role === 'manager') return 'department';
    return 'me';
  }
  if (requested === 'department') {
    if (isOrgWideViewer(user) || user.role === 'manager') return 'department';
    return 'me';
  }
  return 'me';
}
