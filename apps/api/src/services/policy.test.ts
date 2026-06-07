import { describe, it, expect } from 'vitest';
import type { Submission } from '@evidence/shared';
import { resolvePolicy } from '@evidence/shared';
import { validateForSubmit, validateMinimal } from './policy.js';

const sub = (over: Partial<Submission>): Submission => ({
  submissionId: 's1',
  fiscalYear: '2026',
  userId: 'u1',
  departmentId: 'd1',
  userName: 'n',
  title: 'テーマ',
  achievementText: '',
  impactLevelSelf: null,
  impactReason: '',
  contributionLevelSelf: null,
  contributionReason: '',
  evidencePresence: 'NONE',
  hasEvidence: false,
  noEvidenceReason: '',
  supplementaryComment: '',
  status: 'draft',
  reviewComment: '',
  createdAt: '',
  updatedAt: '',
  submittedAt: null,
  approvedAt: null,
  approverId: null,
  deletedAt: null,
  ...over,
});

const MVP = resolvePolicy('MVP', {});
const STRICT = resolvePolicy('STRICT', {});

describe('validateMinimal', () => {
  it('タイトル必須', () => {
    expect(validateMinimal(sub({ title: '' }))).toHaveLength(1);
    expect(validateMinimal(sub({ title: 'あり' }))).toHaveLength(0);
  });
});

describe('validateForSubmit — MVP（strict=false）', () => {
  it('入力/証跡が不足してもブロックしない（タイトルさえあれば）', () => {
    const r = validateForSubmit(sub({ achievementText: '', evidencePresence: 'NONE' }), MVP);
    expect(r.blocked).toBe(false);
  });
  it('タイトル空はブロック', () => {
    const r = validateForSubmit(sub({ title: '' }), MVP);
    expect(r.blocked).toBe(true);
  });
});

describe('validateForSubmit — STRICT（strict=true）', () => {
  it('達成内容/影響度/貢献度が無いとブロック', () => {
    const r = validateForSubmit(sub({}), STRICT);
    expect(r.blocked).toBe(true);
    const paths = r.problems.map((p) => p.path);
    expect(paths).toContain('achievementText');
    expect(paths).toContain('impactLevelSelf');
    expect(paths).toContain('contributionLevelSelf');
    expect(paths).toContain('evidence');
  });
  it('証跡があり全項目埋まればブロックしない', () => {
    const r = validateForSubmit(
      sub({
        achievementText: '内容',
        impactLevelSelf: 3,
        contributionLevelSelf: 4,
        evidencePresence: 'AVAILABLE',
        hasEvidence: true,
      }),
      STRICT,
    );
    expect(r.blocked).toBe(false);
  });
  it('機密で未添付でも理由があれば証跡要件を満たす', () => {
    const r = validateForSubmit(
      sub({
        achievementText: '内容',
        impactLevelSelf: 3,
        contributionLevelSelf: 4,
        evidencePresence: 'CONFIDENTIAL',
        hasEvidence: false,
        noEvidenceReason: '契約金額を含むため社外秘',
      }),
      STRICT,
    );
    expect(r.problems.map((p) => p.path)).not.toContain('evidence');
  });
});
