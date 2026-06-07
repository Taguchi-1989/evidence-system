/**
 * BI バブルチャートのマッピング設定（★ここを編集してカスタマイズ）。
 *
 *   横軸(X) … 必要経費   estimateCost()
 *   縦軸(Y) … 展開性     expandability()
 *   サイズ … 事業価値    businessValue()
 *   色     … 領域(部署)  domainOf()
 *
 * 現状の成果データには「必要経費」等の専用項目が無いため、既存項目から推定して自走させています
 * （満たない所は既定値で補完）。実データ項目を追加したら、この関数群を差し替えてください。
 * GitHub Copilot に「bi-config の estimateCost を実コスト項目から計算するよう変更して」等と頼めます。
 */
import type { Submission } from '@evidence/shared';
import { IMPACT_LEVEL_LABELS, CONTRIBUTION_LEVEL_LABELS } from '@evidence/shared';

export interface BubblePoint {
  id: string;
  label: string;
  /** 必要経費 0–100（大きいほど高コスト） */
  xValue: number;
  /** 展開性 0–100（大きいほど広く展開できる） */
  yValue: number;
  /** 事業価値（相対値・バブル面積に反映） */
  value: number;
  /** 色分けキー（領域） */
  domainKey: string;
  domainLabel: string;
  /** 補助情報（ツールチップ用） */
  detail: string;
}

export const AXIS = {
  xLabel: '必要経費 →（高い）',
  yLabel: '展開性 →（広い）',
  sizeLabel: 'バブル＝事業価値',
  colorLabel: '色＝領域（部署）',
} as const;

/** 領域(部署)ごとの色。未定義キーは palette から自動割当。 */
export const DOMAIN_PALETTE = [
  '#2563eb', // blue
  '#16a34a', // green
  '#d97706', // amber
  '#db2777', // pink
  '#7c3aed', // violet
  '#0891b2', // cyan
  '#dc2626', // red
  '#65a30d', // lime
];

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

/** 必要経費（推定）：貢献度を労力の代理指標として使用（1..5 → 20..100）。後で実コストに差替可。 */
export function estimateCost(s: Submission): number {
  const contrib = s.contributionLevelSelf ?? 1;
  return clamp(contrib * 20);
}

/** 展開性：影響度（自分の作業改善→全社）をそのまま展開の広さとみなす（1..5 → 20..100）。 */
export function expandability(s: Submission): number {
  const impact = s.impactLevelSelf ?? 1;
  return clamp(impact * 20);
}

/** 事業価値：影響度 × 貢献度（1..25）。 */
export function businessValue(s: Submission): number {
  return (s.impactLevelSelf ?? 1) * (s.contributionLevelSelf ?? 1);
}

/** 領域（色分け）：部署。impact ラベル等に変えたい場合はここを変更。 */
export function domainOf(s: Submission): string {
  return s.departmentId;
}

/** Submission を 1 バブルに変換。 */
export function toBubble(s: Submission, deptName: (id: string) => string): BubblePoint {
  const impact = s.impactLevelSelf;
  return {
    id: s.submissionId,
    label: s.title || '(無題)',
    xValue: estimateCost(s),
    yValue: expandability(s),
    value: businessValue(s),
    domainKey: domainOf(s),
    domainLabel: deptName(domainOf(s)),
    detail: `${s.userName} ・ 展開性=${impact ? IMPACT_LEVEL_LABELS[impact] : '未設定'} ・ 事業価値=${businessValue(s)}`,
  };
}

// ── 詳細パネル用の派生属性（経費・一回性・効果・時期）──────────────
// 専用データ項目が無い分は推定で自走（estimated:true）。実項目を追加したらここを差し替え。

/** 効果規模（事業価値から区分） */
export function effectTier(s: Submission): string {
  const v = businessValue(s);
  return v >= 16 ? '大' : v >= 8 ? '中' : '小';
}
/** 一回性：影響度が広いほど継続効果とみなす（推定） */
export function recurrence(s: Submission): string {
  return (s.impactLevelSelf ?? 1) >= 3 ? '継続的に効果' : '単発・局所的';
}
/** リードタイム目安（着手→完了, ヶ月。貢献度=労力の代理, 推定） */
export function leadTimeMonths(s: Submission): number {
  return s.contributionLevelSelf ?? 1;
}
/** 成果発現目安（完了→効果が出るまで, ヶ月。展開が広いほど時間がかかる想定, 推定） */
export function timeToValueMonths(s: Submission): number {
  return s.impactLevelSelf ?? 1;
}

export interface BiAttribute {
  label: string;
  value: string;
  /** 推定値（実データ項目が未整備）か */
  estimated?: boolean;
}

/** 詳細パネルに並べる属性一覧（順序もここで調整可）。 */
export function deriveAttributes(s: Submission, deptName: (id: string) => string): BiAttribute[] {
  return [
    { label: '領域（部署）', value: deptName(s.departmentId) },
    { label: '展開性（影響度）', value: s.impactLevelSelf ? IMPACT_LEVEL_LABELS[s.impactLevelSelf] : '未設定' },
    { label: '貢献度', value: s.contributionLevelSelf ? CONTRIBUTION_LEVEL_LABELS[s.contributionLevelSelf] : '未設定' },
    { label: '必要経費', value: `${estimateCost(s)} / 100`, estimated: true },
    { label: '事業価値', value: String(businessValue(s)) },
    { label: '効果規模', value: effectTier(s), estimated: true },
    { label: '一回性', value: recurrence(s), estimated: true },
    { label: 'リードタイム（いつ頃できる）', value: `約 ${leadTimeMonths(s)} ヶ月`, estimated: true },
    { label: '成果発現（いつ頃成果が出る）', value: `約 ${timeToValueMonths(s)} ヶ月`, estimated: true },
  ];
}

/** 4象限の意味づけ（「どんな領域に利用できるか」の読み取り補助）。 */
export const QUADRANTS = {
  topLeft: '低コスト×高展開 ＝ 横展開の最有力',
  topRight: '高コスト×高展開 ＝ 重点投資',
  bottomLeft: '低コスト×低展開 ＝ 小さな改善（積み上げ）',
  bottomRight: '高コスト×低展開 ＝ 費用対効果に注意',
} as const;
