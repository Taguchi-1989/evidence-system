import { describe, it, expect } from 'vitest';
import { ExportDocumentSchema, SCHEMA_VERSION } from './export-format.js';

describe('JSON export schema (§16.2 / §16.3)', () => {
  it('要件の例に沿った構造を検証できる', () => {
    const doc = {
      schemaVersion: SCHEMA_VERSION,
      exportedAt: '2026-06-07T00:00:00+09:00',
      fiscalYear: '2026',
      submissions: [
        {
          submissionId: 'sub-001',
          userId: 'user-001',
          departmentId: 'dept-001',
          title: '集計作業の自動化',
          achievementText: '月次集計作業を自動化し、作業時間を削減した。',
          impact: { selfLevel: 3, label: '部署内改善', reason: '部署内の月次作業に適用されたため' },
          contribution: { selfLevel: 4, label: '主導', reason: '要件整理から運用説明まで担当' },
          evidenceStatus: { hasEvidence: true, presence: 'AVAILABLE', presenceLabel: '資料あり', noEvidenceReason: null },
          evidenceFiles: [
            {
              evidenceId: 'ev-001',
              evidenceType: 'EXCEL_SUMMARY',
              evidenceTypeLabel: 'Excel集計',
              relatedAxis: 'IMPACT',
              fileName: 'before_after.xlsx',
              s3Key: 'fiscalYear=2026/.../before_after.xlsx',
              description: '改善前後の作業時間を比較した資料',
              isConfidential: false,
            },
          ],
          auditResults: [
            {
              auditId: 'audit-001',
              result: 'REFERENCE_AVAILABLE',
              relatedScore: 82,
              impactSupportScore: 76,
              contributionSupportScore: 45,
              reason: '影響度に関する資料は確認できる。',
            },
          ],
          status: 'submitted',
        },
      ],
    };
    const parsed = ExportDocumentSchema.parse(doc);
    expect(parsed.schemaVersion).toBe('1.0');
    expect(parsed.submissions[0]?.impact.selfLevel).toBe(3);
  });

  it('schemaVersion が異なると失敗する', () => {
    const bad = { schemaVersion: '2.0', exportedAt: 'x', fiscalYear: '2026', submissions: [] };
    expect(ExportDocumentSchema.safeParse(bad).success).toBe(false);
  });
});
