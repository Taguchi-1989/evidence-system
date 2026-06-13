/**
 * 任意の LLM 判定（要件 §15.3）。AUDIT_LLM_PROVIDER で切替：
 *   none         … 使わない（構造チェックのみ）
 *   anthropic    … Anthropic Messages API
 *   azure-openai … Azure OpenAI Chat Completions
 * 未設定/失敗時は null を返し、Agent は構造チェックのみで判定する。
 * 出力は参考スコアであり、評価確定ではない（§15.2, §21）。
 */
import type { Submission } from '@evidence/shared';
import { IMPACT_LEVEL_LABELS, CONTRIBUTION_LEVEL_LABELS } from '@evidence/shared';
import { config } from '../config.js';

const ANTHROPIC_MODEL = 'claude-haiku-4-5-20251001';

export interface LlmScore {
  relatedScore: number;
  impactSupportScore: number;
  contributionSupportScore: number;
  confidence: number;
  reason: string;
  extractedSummary: string;
}

export function llmEnabled(): boolean {
  const a = config.audit;
  if (a.llmProvider === 'anthropic') return Boolean(a.anthropicApiKey);
  if (a.llmProvider === 'azure-openai')
    return Boolean(a.azure.endpoint && a.azure.apiKey && a.azure.deployment);
  return false;
}

/** AuditResult.modelName に記録する値 */
export function llmModelName(): string {
  if (!llmEnabled()) return 'heuristic-v2';
  if (config.audit.llmProvider === 'anthropic') return ANTHROPIC_MODEL;
  if (config.audit.llmProvider === 'azure-openai')
    return `azure-openai:${config.audit.azure.deployment}`;
  return 'heuristic-v2';
}

function buildPrompt(submission: Submission, evidenceTexts: string[]): string {
  const impactLabel = submission.impactLevelSelf
    ? IMPACT_LEVEL_LABELS[submission.impactLevelSelf]
    : '未選択';
  const contribLabel = submission.contributionLevelSelf
    ? CONTRIBUTION_LEVEL_LABELS[submission.contributionLevelSelf]
    : '未選択';
  return `あなたは成果評価の一次チェック補助です。最終評価はしません。
以下の成果申告と証跡資料の抜粋を読み、参考スコア(0-100)を JSON のみで返してください。

# 成果
テーマ: ${submission.title}
達成内容: ${submission.achievementText}
影響度(自己申告): ${impactLabel} / 説明: ${submission.impactReason}
貢献度(自己申告): ${contribLabel} / 説明: ${submission.contributionReason}

# 証跡資料の抜粋
${evidenceTexts.length ? evidenceTexts.join('\n---\n').slice(0, 8000) : '(抽出テキストなし)'}

# 出力(JSON のみ)
{"relatedScore":0-100,"impactSupportScore":0-100,"contributionSupportScore":0-100,"confidence":0-100,"reason":"日本語の短い理由","extractedSummary":"根拠となる抜粋の要約"}`;
}

function clamp0to100(v: unknown): number | null {
  const n = typeof v === 'string' ? Number(v) : v;
  if (typeof n !== 'number' || !Number.isFinite(n)) return null;
  return Math.min(100, Math.max(0, Math.round(n)));
}

export function parseScore(text: string): LlmScore | null {
  try {
    const json = text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1);
    const raw = JSON.parse(json) as Record<string, unknown>;
    const relatedScore = clamp0to100(raw.relatedScore);
    const impactSupportScore = clamp0to100(raw.impactSupportScore);
    const contributionSupportScore = clamp0to100(raw.contributionSupportScore);
    const confidence = clamp0to100(raw.confidence);
    if (
      relatedScore === null ||
      impactSupportScore === null ||
      contributionSupportScore === null ||
      confidence === null
    )
      return null;
    return {
      relatedScore,
      impactSupportScore,
      contributionSupportScore,
      confidence,
      reason: typeof raw.reason === 'string' ? raw.reason : '',
      extractedSummary: typeof raw.extractedSummary === 'string' ? raw.extractedSummary : '',
    };
  } catch {
    return null;
  }
}

/** LLM API 呼び出しの上限時間。超過時は null を返し構造チェックのみで続行する。 */
const LLM_TIMEOUT_MS = 30_000;

async function callAnthropic(prompt: string): Promise<string | null> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': config.audit.anthropicApiKey!,
      'anthropic-version': '2023-06-01',
    },
    signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { content?: { text?: string }[] };
  return data.content?.[0]?.text ?? null;
}

async function callAzureOpenAI(prompt: string): Promise<string | null> {
  const { endpoint, apiKey, deployment, apiVersion } = config.audit.azure;
  const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'api-key': apiKey! },
    signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
    body: JSON.stringify({
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 512,
      temperature: 0,
      response_format: { type: 'json_object' },
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content ?? null;
}

export async function scoreWithLLM(
  submission: Submission,
  evidenceTexts: string[],
): Promise<LlmScore | null> {
  if (!llmEnabled()) return null;
  const prompt = buildPrompt(submission, evidenceTexts);
  // 一時的な失敗（タイムアウト・5xx 等）に備えて 1 回だけ再試行する
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const text =
        config.audit.llmProvider === 'azure-openai'
          ? await callAzureOpenAI(prompt)
          : await callAnthropic(prompt);
      if (text) {
        const score = parseScore(text);
        if (score) return score;
      }
    } catch {
      // fall through to retry
    }
  }
  return null;
}
