/**
 * ドメイン語彙（enum）の単一の真実源。
 * 要件定義書 §6, §8, §9, §12, §13 の選択肢をコード化する。
 * 値（キー）は安定した英大文字スネーク、表示ラベル(日本語)は *_LABELS で対応付ける。
 * 移行可能性のため、JSONエクスポート等ではキーを保持し、ラベルは描画時に解決する。
 */
import { z } from 'zod';

/** const配列からユニオン型と Zod enum を同時に作るヘルパー */
function asEnum<const T extends readonly [string, ...string[]]>(values: T) {
  return z.enum(values);
}

// ───────────────────────────────────────────────────────────────
// 運用モード（§6）
// ───────────────────────────────────────────────────────────────
export const OPERATION_MODES = ['TRIAL', 'MVP', 'TRANSITION', 'STRICT'] as const;
export const OperationModeEnum = asEnum(OPERATION_MODES);
export type OperationMode = z.infer<typeof OperationModeEnum>;
export const OPERATION_MODE_LABELS: Record<OperationMode, string> = {
  TRIAL: 'Trial Mode（初期試行）',
  MVP: 'MVP Mode（軽量運用）',
  TRANSITION: 'Transition Mode（移行期）',
  STRICT: 'Strict Mode（本格運用）',
};

// ───────────────────────────────────────────────────────────────
// アプリ内ロール（§13.2）
// ───────────────────────────────────────────────────────────────
export const ROLES = ['contributor', 'manager', 'office', 'auditor', 'admin', 'agent'] as const;
export const RoleEnum = asEnum(ROLES);
export type Role = z.infer<typeof RoleEnum>;
export const ROLE_LABELS: Record<Role, string> = {
  contributor: '一般入力者',
  manager: '上長・部門管理者',
  office: '事務局',
  auditor: '監査者',
  admin: 'システム管理者',
  agent: '監査Agent',
};
/** 人間が画面ログインで選べるロール（監査Agentはバッチ専用なので除外） */
export const HUMAN_ROLES = ['contributor', 'manager', 'office', 'auditor', 'admin'] as const;

// ───────────────────────────────────────────────────────────────
// 提出ステータス（§12.2 status）
// draft（下書き） → submitted（提出済） → approved（承認） / returned（差戻し）
// ───────────────────────────────────────────────────────────────
export const SUBMISSION_STATUSES = ['draft', 'submitted', 'returned', 'approved'] as const;
export const SubmissionStatusEnum = asEnum(SUBMISSION_STATUSES);
export type SubmissionStatus = z.infer<typeof SubmissionStatusEnum>;
export const SUBMISSION_STATUS_LABELS: Record<SubmissionStatus, string> = {
  draft: '下書き',
  submitted: '提出済み',
  returned: '差戻し',
  approved: '承認済み',
};

// ───────────────────────────────────────────────────────────────
// 影響度（§8.1） レベル 1〜5
// ───────────────────────────────────────────────────────────────
export const IMPACT_LEVELS = [1, 2, 3, 4, 5] as const;
export const ImpactLevelEnum = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
]);
export type ImpactLevel = z.infer<typeof ImpactLevelEnum>;
export const IMPACT_LEVEL_LABELS: Record<ImpactLevel, string> = {
  1: '自分の作業改善',
  2: 'チーム内改善',
  3: '部署内改善',
  4: '複数部署への影響',
  5: '全社・事業への影響',
};

// ───────────────────────────────────────────────────────────────
// 貢献度（§8.2） レベル 1〜5
// ───────────────────────────────────────────────────────────────
export const CONTRIBUTION_LEVELS = [1, 2, 3, 4, 5] as const;
export const ContributionLevelEnum = ImpactLevelEnum; // 同じ 1..5 の数値
export type ContributionLevel = z.infer<typeof ContributionLevelEnum>;
export const CONTRIBUTION_LEVEL_LABELS: Record<ContributionLevel, string> = {
  1: '一部参加',
  2: '一部担当',
  3: '主要担当',
  4: '主導',
  5: '全体責任者',
};

// ───────────────────────────────────────────────────────────────
// 証跡有無の選択肢（§9.2）
// ───────────────────────────────────────────────────────────────
export const EVIDENCE_PRESENCES = [
  'AVAILABLE',
  'NONE',
  'PREPARING',
  'IN_OTHER_SYSTEM',
  'CONFIDENTIAL',
  'ORAL_NOT_DOCUMENTED',
  'OTHER',
] as const;
export const EvidencePresenceEnum = asEnum(EVIDENCE_PRESENCES);
export type EvidencePresence = z.infer<typeof EvidencePresenceEnum>;
export const EVIDENCE_PRESENCE_LABELS: Record<EvidencePresence, string> = {
  AVAILABLE: '資料あり',
  NONE: '資料なし',
  PREPARING: '資料準備中',
  IN_OTHER_SYSTEM: '資料は別システムに存在',
  CONFIDENTIAL: '機密資料のため添付不可',
  ORAL_NOT_DOCUMENTED: '口頭・現場対応中心で資料化されていない',
  OTHER: 'その他',
};
/** 「資料あり」以外＝ファイル添付を強制しない（§9.2, §10.1） */
export const EVIDENCE_PRESENCE_WITHOUT_FILE: EvidencePresence[] = [
  'NONE',
  'PREPARING',
  'IN_OTHER_SYSTEM',
  'CONFIDENTIAL',
  'ORAL_NOT_DOCUMENTED',
  'OTHER',
];

// ───────────────────────────────────────────────────────────────
// 証跡タイプ（§9.3）
// ───────────────────────────────────────────────────────────────
export const EVIDENCE_TYPES = [
  'REPORT',
  'MEETING_MATERIAL',
  'DESIGN_DOC',
  'PROCEDURE',
  'MINUTES',
  'EXCEL_SUMMARY',
  'KPI',
  'SYSTEM_LOG',
  'MAIL_CHAT',
  'IMAGE_PHOTO',
  'CUSTOMER_FEEDBACK',
  'OTHER',
] as const;
export const EvidenceTypeEnum = asEnum(EVIDENCE_TYPES);
export type EvidenceType = z.infer<typeof EvidenceTypeEnum>;
export const EVIDENCE_TYPE_LABELS: Record<EvidenceType, string> = {
  REPORT: '報告書',
  MEETING_MATERIAL: '会議資料',
  DESIGN_DOC: '設計書',
  PROCEDURE: '手順書',
  MINUTES: '議事録',
  EXCEL_SUMMARY: 'Excel集計',
  KPI: 'KPI資料',
  SYSTEM_LOG: 'システムログ',
  MAIL_CHAT: 'メール・チャット記録',
  IMAGE_PHOTO: '画像・写真',
  CUSTOMER_FEEDBACK: '顧客・現場フィードバック',
  OTHER: 'その他',
};

// ───────────────────────────────────────────────────────────────
// 証跡と評価軸の関係（§9.4）
// ───────────────────────────────────────────────────────────────
export const RELATED_AXES = ['IMPACT', 'CONTRIBUTION', 'BOTH', 'REFERENCE', 'UNCLASSIFIED'] as const;
export const RelatedAxisEnum = asEnum(RELATED_AXES);
export type RelatedAxis = z.infer<typeof RelatedAxisEnum>;
export const RELATED_AXIS_LABELS: Record<RelatedAxis, string> = {
  IMPACT: '影響度に関係',
  CONTRIBUTION: '貢献度に関係',
  BOTH: '両方に関係',
  REFERENCE: '参考資料',
  UNCLASSIFIED: '未分類',
};

// ───────────────────────────────────────────────────────────────
// 監査結果 result（§12.4）— 評価確定ではなく参考判定
// ───────────────────────────────────────────────────────────────
export const AUDIT_RESULTS = [
  'OK',
  'REFERENCE_AVAILABLE',
  'NEED_REVIEW',
  'WEAK_EVIDENCE',
  'NO_EVIDENCE',
  'PREPARING',
  'CONFIDENTIAL_NOT_ATTACHED',
  'UNREADABLE',
] as const;
export const AuditResultCodeEnum = asEnum(AUDIT_RESULTS);
export type AuditResultCode = z.infer<typeof AuditResultCodeEnum>;
export const AUDIT_RESULT_LABELS: Record<AuditResultCode, string> = {
  OK: '確認OK',
  REFERENCE_AVAILABLE: '参考資料あり',
  NEED_REVIEW: '要確認',
  WEAK_EVIDENCE: '根拠が弱い可能性',
  NO_EVIDENCE: '証跡なし',
  PREPARING: '準備中',
  CONFIDENTIAL_NOT_ATTACHED: '機密のため未添付',
  UNREADABLE: 'ファイル読取不可',
};

// ───────────────────────────────────────────────────────────────
// 許可するアップロード拡張子（§10.1, §14.3）
// ───────────────────────────────────────────────────────────────
export const ALLOWED_UPLOAD_EXTENSIONS = [
  'pdf',
  'pptx',
  'xlsx',
  'xls',
  'csv',
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
] as const;
export type AllowedUploadExtension = (typeof ALLOWED_UPLOAD_EXTENSIONS)[number];

// ───────────────────────────────────────────────────────────────
// エクスポート種別（§10.4, §16）
// ───────────────────────────────────────────────────────────────
export const EXPORT_FORMATS = ['csv', 'json'] as const;
export const ExportFormatEnum = asEnum(EXPORT_FORMATS);
export type ExportFormat = z.infer<typeof ExportFormatEnum>;

export const EXPORT_JOB_STATUSES = ['pending', 'running', 'completed', 'failed'] as const;
export const ExportJobStatusEnum = asEnum(EXPORT_JOB_STATUSES);
export type ExportJobStatus = z.infer<typeof ExportJobStatusEnum>;

// ───────────────────────────────────────────────────────────────
// ストレージ状態（§12.3 storageStatus）
// ───────────────────────────────────────────────────────────────
export const STORAGE_STATUSES = ['pending', 'uploaded', 'failed', 'deleted'] as const;
export const StorageStatusEnum = asEnum(STORAGE_STATUSES);
export type StorageStatus = z.infer<typeof StorageStatusEnum>;
