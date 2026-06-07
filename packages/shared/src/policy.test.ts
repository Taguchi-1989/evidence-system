import { describe, it, expect } from 'vitest';
import { DEFAULT_POLICY, MODE_POLICY_PRESETS, resolvePolicy, defaultPolicyConfig } from './policy.js';

describe('policy defaults (§7 初期値)', () => {
  it('MVP 既定値が要件どおり', () => {
    expect(DEFAULT_POLICY).toMatchObject({
      evidenceRequired: false,
      claimLinkRequired: false,
      allowNoEvidenceReason: true,
      auditAgentEnabled: true,
      auditResultVisibleToUser: false,
      auditResultVisibleToManager: true,
      strictSubmissionValidation: false,
      exportJsonEnabled: true,
      exportCsvEnabled: true,
    });
  });
});

describe('mode presets (§6)', () => {
  it('STRICT は証跡必須・提出ブロックを有効化', () => {
    expect(MODE_POLICY_PRESETS.STRICT.evidenceRequired).toBe(true);
    expect(MODE_POLICY_PRESETS.STRICT.claimLinkRequired).toBe(true);
    expect(MODE_POLICY_PRESETS.STRICT.strictSubmissionValidation).toBe(true);
  });
  it('TRIAL は管理者にも監査結果を見せない', () => {
    expect(MODE_POLICY_PRESETS.TRIAL.auditResultVisibleToManager).toBe(false);
  });
});

describe('resolvePolicy', () => {
  it('overrides がプリセットを上書きする', () => {
    const p = resolvePolicy('MVP', { strictSubmissionValidation: true });
    expect(p.strictSubmissionValidation).toBe(true);
    expect(p.evidenceRequired).toBe(false);
  });
  it('defaultPolicyConfig は MVP モード', () => {
    expect(defaultPolicyConfig('2026').mode).toBe('MVP');
  });
});
