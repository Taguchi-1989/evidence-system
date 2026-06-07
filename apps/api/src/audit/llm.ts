/**
 * 任意の LLM 判定（要件 §15.3）。AUDIT_LLM_PROVIDER=anthropic かつ API キーがある場合のみ動作。
 * 未設定なら null を返し、Agent は構造チェックのみで判定する。
 * 出力は参考スコアであり、評価確定ではない（§15.2, §21）。
 */
import type { Submission } from '@evidence/shared';
import { IMPACT_LEVEL_LABELS, CONTRIBUTION_LEVEL_LABELS } from '@evidence/shared';
import { config } from '../config.js';

const MODEL = 'claude-haiku-4-5-20251001';

export interface LlmScore {
  relatedScore: number;
  impactSupportScore: number;
  contributionSupportScore: number;
  confidence: number;
  reason: string;
  extractedSummary: string;
}

export function llmEnabled(): boolean {
  return config.audit.llmProvider === 'anthropic' && Boolean(config.audit.anthropicApiKey);
}

export async function scoreWithLLM(
  submission: Submission,
  evidenceTexts: string[],
): Promise<LlmScore | null> {
  if (!llmEnabled()) return null;

  const impactLabel = submission.impactLevelSelf
    ? IMPACT_LEVEL_LABELS[submission.impactLevelSelf]
    : '未選択';
  const contribLabel = submission.contributionLevelSelf
    ? CONTRIBUTION_LEVEL_LABELS[submission.contributionLevelSelf]
    : '未選択';

  const prompt = `あなたは成果評価の一次チェック補助です。最終評価はしません。
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

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': config.audit.anthropicApiKey!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 512,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { content?: { text?: string }[] };
    const text = data.content?.[0]?.text ?? '';
    const json = text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1);
    const parsed = JSON.parse(json) as LlmScore;
    return parsed;
  } catch {
    return null;
  }
}
