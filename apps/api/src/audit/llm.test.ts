import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Submission } from '@evidence/shared';

// config は import 時に env を読むため、env を設定してから動的 import する
const ENV_KEYS = [
  'AUDIT_LLM_PROVIDER',
  'ANTHROPIC_API_KEY',
  'AZURE_OPENAI_ENDPOINT',
  'AZURE_OPENAI_API_KEY',
  'AZURE_OPENAI_DEPLOYMENT',
  'AZURE_OPENAI_API_VERSION',
];
let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = {};
  for (const k of ENV_KEYS) saved[k] = process.env[k];
});
afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function loadLlm(env: Record<string, string>) {
  vi.resetModules();
  for (const k of ENV_KEYS) delete process.env[k];
  for (const [k, v] of Object.entries(env)) process.env[k] = v;
  return import('./llm.js');
}

const submission = {
  title: 'テーマ',
  achievementText: '達成内容',
  impactLevelSelf: 3,
  impactReason: '理由A',
  contributionLevelSelf: 4,
  contributionReason: '理由B',
} as unknown as Submission;

const SCORE = {
  relatedScore: 82,
  impactSupportScore: 70,
  contributionSupportScore: 40,
  confidence: 75,
  reason: 'ok',
  extractedSummary: 'sum',
};

describe('LLM プロバイダ分岐', () => {
  it('none: 無効・null・heuristic', async () => {
    const llm = await loadLlm({ AUDIT_LLM_PROVIDER: 'none' });
    expect(llm.llmEnabled()).toBe(false);
    expect(llm.llmModelName()).toBe('heuristic-v2');
    expect(await llm.scoreWithLLM(submission, ['x'])).toBeNull();
  });

  it('anthropic: 有効・レスポンスをパースする', async () => {
    const llm = await loadLlm({ AUDIT_LLM_PROVIDER: 'anthropic', ANTHROPIC_API_KEY: 'key-xyz' });
    expect(llm.llmEnabled()).toBe(true);
    expect(llm.llmModelName()).toContain('claude');

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ content: [{ text: JSON.stringify(SCORE) }] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const res = await llm.scoreWithLLM(submission, ['抜粋']);
    expect(res).toMatchObject({ relatedScore: 82, contributionSupportScore: 40 });
    const url = fetchMock.mock.calls[0]![0] as string;
    expect(url).toContain('api.anthropic.com');
  });

  it('azure-openai: 有効・URL/ヘッダ・パース', async () => {
    const llm = await loadLlm({
      AUDIT_LLM_PROVIDER: 'azure-openai',
      AZURE_OPENAI_ENDPOINT: 'https://example.openai.azure.com',
      AZURE_OPENAI_API_KEY: 'azkey',
      AZURE_OPENAI_DEPLOYMENT: 'gpt-x',
      AZURE_OPENAI_API_VERSION: '2024-08-01-preview',
    });
    expect(llm.llmEnabled()).toBe(true);
    expect(llm.llmModelName()).toBe('azure-openai:gpt-x');

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: JSON.stringify(SCORE) } }] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const res = await llm.scoreWithLLM(submission, ['抜粋']);
    expect(res).toMatchObject({ relatedScore: 82, impactSupportScore: 70 });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/openai/deployments/gpt-x/chat/completions');
    expect(url).toContain('api-version=2024-08-01-preview');
    expect((init.headers as Record<string, string>)['api-key']).toBe('azkey');
  });

  it('LLM 失敗時は null（構造チェックにフォールバック）', async () => {
    const llm = await loadLlm({ AUDIT_LLM_PROVIDER: 'anthropic', ANTHROPIC_API_KEY: 'key' });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }));
    expect(await llm.scoreWithLLM(submission, ['x'])).toBeNull();
  });
});
