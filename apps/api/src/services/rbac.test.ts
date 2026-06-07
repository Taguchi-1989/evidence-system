import { describe, it, expect } from 'vitest';
import type { AuthUser, Submission } from '@evidence/shared';
import {
  canViewSubmission,
  canEditSubmission,
  canReviewSubmission,
  resolveListScope,
  managesDepartment,
} from './rbac.js';

const user = (over: Partial<AuthUser>): AuthUser => ({
  userId: 'u1',
  name: 'n',
  role: 'contributor',
  departmentId: 'd1',
  managedDepartmentIds: [],
  ...over,
});

const sub = (over: Partial<Submission>): Submission => ({
  submissionId: 's1',
  fiscalYear: '2026',
  userId: 'u1',
  departmentId: 'd1',
  userName: 'n',
  title: 't',
  achievementText: '',
  impactLevelSelf: null,
  impactReason: '',
  contributionLevelSelf: null,
  contributionReason: '',
  evidencePresence: 'NONE',
  hasEvidence: false,
  noEvidenceReason: '',
  supplementaryComment: '',
  status: 'submitted',
  reviewComment: '',
  createdAt: '',
  updatedAt: '',
  submittedAt: null,
  approvedAt: null,
  approverId: null,
  deletedAt: null,
  ...over,
});

describe('canViewSubmission (§13)', () => {
  it('一般入力者は自分のみ閲覧可', () => {
    const u = user({ userId: 'u1', role: 'contributor' });
    expect(canViewSubmission(u, sub({ userId: 'u1' }))).toBe(true);
    expect(canViewSubmission(u, sub({ userId: 'u2', departmentId: 'd1' }))).toBe(false);
  });
  it('上長は配下部署を閲覧可', () => {
    const u = user({ userId: 'm', role: 'manager', departmentId: 'd1', managedDepartmentIds: ['d1', 'd2'] });
    expect(canViewSubmission(u, sub({ userId: 'x', departmentId: 'd2' }))).toBe(true);
    expect(canViewSubmission(u, sub({ userId: 'x', departmentId: 'd9' }))).toBe(false);
  });
  it('事務局・監査者・管理者は全社閲覧可', () => {
    for (const role of ['office', 'auditor', 'admin'] as const) {
      expect(canViewSubmission(user({ role, userId: 'o' }), sub({ userId: 'x', departmentId: 'dz' }))).toBe(true);
    }
  });
});

describe('canEditSubmission', () => {
  it('本人の下書き/差戻しのみ編集可', () => {
    const u = user({ userId: 'u1' });
    expect(canEditSubmission(u, sub({ userId: 'u1', status: 'draft' }))).toBe(true);
    expect(canEditSubmission(u, sub({ userId: 'u1', status: 'returned' }))).toBe(true);
    expect(canEditSubmission(u, sub({ userId: 'u1', status: 'submitted' }))).toBe(false);
    expect(canEditSubmission(u, sub({ userId: 'u2', status: 'draft' }))).toBe(false);
  });
});

describe('canReviewSubmission (§10.3)', () => {
  it('担当部署の上長・事務局・管理者が確認可', () => {
    expect(canReviewSubmission(user({ role: 'office' }), sub({}))).toBe(true);
    expect(canReviewSubmission(user({ role: 'admin' }), sub({}))).toBe(true);
    expect(
      canReviewSubmission(user({ role: 'manager', managedDepartmentIds: ['d1'] }), sub({ departmentId: 'd1' })),
    ).toBe(true);
    expect(canReviewSubmission(user({ role: 'contributor' }), sub({}))).toBe(false);
  });
});

describe('resolveListScope', () => {
  it('要求スコープをロールで丸める', () => {
    expect(resolveListScope(user({ role: 'contributor' }), 'all')).toBe('me');
    expect(resolveListScope(user({ role: 'manager' }), 'all')).toBe('department');
    expect(resolveListScope(user({ role: 'office' }), 'all')).toBe('all');
    expect(resolveListScope(user({ role: 'auditor' }), 'all')).toBe('all');
  });
});

describe('managesDepartment', () => {
  it('自部署または配下を管理', () => {
    const m = user({ role: 'manager', departmentId: 'd1', managedDepartmentIds: ['d2'] });
    expect(managesDepartment(m, 'd1')).toBe(true);
    expect(managesDepartment(m, 'd2')).toBe(true);
    expect(managesDepartment(m, 'd3')).toBe(false);
  });
});
