/**
 * BI バブルチャートのマッピング設定（★ここを編集してカスタマイズ）。
 *
 *   横軸(X) … 必要経費  ¥（対数スケール, 100万〜10億）  estimateCost()
 *   縦軸(Y) … 展開性    到達数（対数スケール, 1〜1000）   expandability()
 *   サイズ … 事業価値   businessValue()
 *   色     … 領域(部署) domainOf()
 *
 * 専用データ項目が無い分は既存項目（影響度=展開の広さ / 貢献度=労力≒経費）から推定して自走させています。
 * 実データ項目を追加したら、この関数群を差し替えてください（GitHub Copilot で編集可能）。
 */
import type { Submission } from '@evidence/shared';
import { IMPACT_LEVEL_LABELS, CONTRIBUTION_LEVEL_LABELS } from '@evidence/shared';

// ── 軸の範囲（対数）──────────────────────────────────────────
export const COST_MIN = 1_000_000; // 100万円
export const COST_MAX = 1_000_000_000; // 10億円
export const REACH_MIN = 1; // 到達 1
export const REACH_MAX = 1000; // 到達 1000

export interface AxisScale {
  label: string;
  min: number;
  max: number;
  ticks: number[];
  format: (v: number) => string;
}

function trim(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}
/** 金額を ¥100万 / ¥1億 形式に */
export function formatYen(v: number): string {
  if (v >= 1e8) return `¥${trim(v / 1e8)}億`;
  if (v >= 1e4) return `¥${trim(v / 1e4)}万`;
  return `¥${Math.round(v)}`;
}
export const formatCount = (v: number): string => String(Math.round(v));

export const AXIS = {
  sizeLabel: 'バブル＝事業価値',
  colorLabel: '色＝領域（部署）',
  xAxis: {
    label: '必要経費 ¥（対数）→ 高い',
    min: COST_MIN,
    max: COST_MAX,
    ticks: [1e6, 1e7, 1e8, 1e9],
    format: formatYen,
  } satisfies AxisScale,
  yAxis: {
    label: '展開性（到達数・対数）→ 広い',
    min: REACH_MIN,
    max: REACH_MAX,
    ticks: [1, 10, 100, 1000],
    format: formatCount,
  } satisfies AxisScale,
} as const;

export interface BubblePoint {
  id: string;
  label: string;
  /** 必要経費（¥, COST_MIN..COST_MAX） */
  xValue: number;
  /** 展開性（到達数, REACH_MIN..REACH_MAX） */
  yValue: number;
  /** 事業価値（相対値・バブル面積に反映） */
  value: number;
  domainKey: string;
  domainLabel: string;
  /** 証跡あり（証跡→JSON→BI の流れを可視化） */
  hasEvidence: boolean;
  detail: string;
}

/** 領域(部署)ごとの色。未定義キーは palette から自動割当。 */
export const DOMAIN_PALETTE = [
  '#2563eb',
  '#16a34a',
  '#d97706',
  '#db2777',
  '#7c3aed',
  '#0891b2',
  '#dc2626',
  '#65a30d',
];

/** 必要経費（推定・¥）：貢献度(労力)を 100万〜10億 に対数割当（1→100万, 5→10億）。 */
export function estimateCost(s: Submission): number {
  const contrib = s.contributionLevelSelf ?? 1; // 1..5
  return Math.round(COST_MIN * Math.pow(COST_MAX / COST_MIN, (contrib - 1) / 4));
}

/** 展開性（推定・到達数）：影響度を 1〜1000 に対数割当（自分=1 … 全社=1000）。 */
export function expandability(s: Submission): number {
  const impact = s.impactLevelSelf ?? 1; // 1..5
  return Math.round(REACH_MIN * Math.pow(REACH_MAX / REACH_MIN, (impact - 1) / 4));
}

/** 事業価値：影響度 × 貢献度（1..25）。 */
export function businessValue(s: Submission): number {
  return (s.impactLevelSelf ?? 1) * (s.contributionLevelSelf ?? 1);
}

/** 領域（色分け）：部署。 */
export function domainOf(s: Submission): string {
  return s.departmentId;
}

export function toBubble(s: Submission, deptName: (id: string) => string): BubblePoint {
  return {
    id: s.submissionId,
    label: s.title || '(無題)',
    xValue: estimateCost(s),
    yValue: expandability(s),
    value: businessValue(s),
    domainKey: domainOf(s),
    domainLabel: deptName(domainOf(s)),
    hasEvidence: s.hasEvidence,
    detail: `${s.userName} ・ 事業価値=${businessValue(s)} ・ 証跡${s.hasEvidence ? 'あり' : 'なし'}`,
  };
}

// ── 詳細パネル用の派生属性 ───────────────────────────────────
export function effectTier(s: Submission): string {
  const v = businessValue(s);
  return v >= 16 ? '大' : v >= 8 ? '中' : '小';
}
export function recurrence(s: Submission): string {
  return (s.impactLevelSelf ?? 1) >= 3 ? '継続的に効果' : '単発・局所的';
}
export function leadTimeMonths(s: Submission): number {
  return s.contributionLevelSelf ?? 1;
}
export function timeToValueMonths(s: Submission): number {
  return s.impactLevelSelf ?? 1;
}

export interface BiAttribute {
  label: string;
  value: string;
  estimated?: boolean;
}

export function deriveAttributes(s: Submission, deptName: (id: string) => string): BiAttribute[] {
  return [
    { label: '領域（部署）', value: deptName(s.departmentId) },
    { label: '展開性（影響度）', value: s.impactLevelSelf ? IMPACT_LEVEL_LABELS[s.impactLevelSelf] : '未設定' },
    { label: '展開性（到達数）', value: `${expandability(s)} 規模`, estimated: true },
    { label: '貢献度', value: s.contributionLevelSelf ? CONTRIBUTION_LEVEL_LABELS[s.contributionLevelSelf] : '未設定' },
    { label: '必要経費', value: formatYen(estimateCost(s)), estimated: true },
    { label: '事業価値', value: String(businessValue(s)) },
    { label: '効果規模', value: effectTier(s), estimated: true },
    { label: '一回性', value: recurrence(s), estimated: true },
    { label: 'リードタイム（いつ頃できる）', value: `約 ${leadTimeMonths(s)} ヶ月`, estimated: true },
    { label: '成果発現（いつ頃成果が出る）', value: `約 ${timeToValueMonths(s)} ヶ月`, estimated: true },
  ];
}

/** 4象限の意味づけ（「どんな領域に利用できるか」の読み取り補助）。 */
export const QUADRANTS = {
  topLeft: '低コスト×広展開 ＝ 横展開の最有力',
  topRight: '高コスト×広展開 ＝ 重点投資',
  bottomLeft: '低コスト×狭展開 ＝ 小さな改善（積み上げ）',
  bottomRight: '高コスト×狭展開 ＝ 費用対効果に注意',
} as const;
