/** 提出（Submission）スキーマ — 要件 §10.1 入力項目 / §12.2 帳簿 */
import { z } from 'zod';
import {
  EvidencePresenceEnum,
  ImpactLevelEnum,
  ContributionLevelEnum,
  SubmissionStatusEnum,
} from '../enums.js';

/**
 * 利用者が編集できる内容（§10.1）。
 * 下書き段階では多くが未入力でも保存できるよう、create/update は緩く受ける。
 * 提出時の必須チェックはポリシー（モード）依存でサーバ側 validation が行う。
 */
const contentFields = {
  departmentId: z.string().min(1),
  /** 氏名（表示用。userId は認証から付与） */
  userName: z.string().min(1).max(100),
  /** テーマ名 */
  title: z.string().min(1).max(200),
  /** 達成内容 */
  achievementText: z.string().min(1).max(5000),
  /** 影響度自己評価（1〜5） */
  impactLevelSelf: ImpactLevelEnum,
  /** 影響度の説明 */
  impactReason: z.string().max(2000),
  /** 貢献度自己評価（1〜5） */
  contributionLevelSelf: ContributionLevelEnum,
  /** 貢献度の説明 */
  contributionReason: z.string().max(2000),
  /** 証跡資料の有無（§9.2） */
  evidencePresence: EvidencePresenceEnum,
  /** 証跡なし理由（§9.2「機密」等のとき記録） */
  noEvidenceReason: z.string().max(2000).optional(),
  /** 補足コメント */
  supplementaryComment: z.string().max(2000).optional(),
};

/** 完全な内容（提出時に満たすことが望ましい基準形） */
export const SubmissionContentSchema = z.object(contentFields);
export type SubmissionContent = z.infer<typeof SubmissionContentSchema>;

/** 新規作成（下書き）: 年度のみ必須、他は任意 */
export const CreateSubmissionSchema = z
  .object({ fiscalYear: z.string().min(4) })
  .merge(SubmissionContentSchema.partial());
export type CreateSubmissionInput = z.infer<typeof CreateSubmissionSchema>;

/** 更新（下書き）: すべて任意（部分更新） */
export const UpdateSubmissionSchema = SubmissionContentSchema.partial();
export type UpdateSubmissionInput = z.infer<typeof UpdateSubmissionSchema>;

/** 承認・差戻し・コメント */
export const ReviewActionSchema = z.object({
  comment: z.string().max(2000).optional().default(''),
});
export type ReviewActionInput = z.infer<typeof ReviewActionSchema>;

/** 確認操作の種別（承認/差戻し/コメント） */
export const ReviewActionKindEnum = z.enum(['approve', 'reject', 'comment']);
export type ReviewActionKind = z.infer<typeof ReviewActionKindEnum>;

/** 確認履歴の1件（誰が・いつ・何を・コメント）。上書きせず追記する。 */
export const ReviewEntrySchema = z.object({
  actorId: z.string(),
  actorName: z.string(),
  actorRole: z.string(),
  action: ReviewActionKindEnum,
  comment: z.string(),
  at: z.string(),
});
export type ReviewEntry = z.infer<typeof ReviewEntrySchema>;

/** 永続化される提出エンティティ（§12.2） */
export const SubmissionSchema = z.object({
  submissionId: z.string(),
  fiscalYear: z.string(),
  userId: z.string(),
  departmentId: z.string(),
  userName: z.string(),
  title: z.string(),
  achievementText: z.string(),
  impactLevelSelf: ImpactLevelEnum.nullable(),
  impactReason: z.string(),
  contributionLevelSelf: ContributionLevelEnum.nullable(),
  contributionReason: z.string(),
  /** 証跡有無（リッチな選択肢）。hasEvidence は派生（AVAILABLE のみ true） */
  evidencePresence: EvidencePresenceEnum,
  hasEvidence: z.boolean(),
  noEvidenceReason: z.string(),
  supplementaryComment: z.string(),
  status: SubmissionStatusEnum,
  /** 最新の確認コメント（一覧/サマリ表示用。詳細は reviewHistory を参照） */
  reviewComment: z.string().default(''),
  /** 確認操作の履歴（承認/差戻し/コメントを追記。未設定の旧データは空扱い） */
  reviewHistory: z.array(ReviewEntrySchema).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  submittedAt: z.string().nullable(),
  approvedAt: z.string().nullable(),
  approverId: z.string().nullable(),
  deletedAt: z.string().nullable().default(null),
});
export type Submission = z.infer<typeof SubmissionSchema>;
