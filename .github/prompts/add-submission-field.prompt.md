---
mode: agent
description: 提出(Submission)に新しい入力項目を端から端まで追加する
---

提出（Submission）に新しい項目「{{フィールド名・型・説明}}」を追加してください。
本リポジトリの規約（.github/copilot-instructions.md）に従い、以下を一貫して変更します。

1. `packages/shared/src/schemas/submission.ts`
   - `contentFields` に Zod 定義を追加（必要に応じ enum を `enums.ts` に追加しラベルも定義）。
   - `SubmissionSchema`（永続エンティティ）にも項目を追加。
2. `apps/api/src/handlers/submissions.ts`
   - create/update のマッピングに項目を追加（既定値も）。
3. `apps/web/src/routes/SubmissionFormPage.tsx`
   - 入力UIを追加（簡易/詳細・運用モード連動の表示方針に合わせる）。
   - `FormValues` と `toPayload`、編集時の `reset` も更新。
4. `apps/web/src/components/SubmissionSummary.tsx` に表示行を追加。
5. 必要なら `packages/shared/src/export-format.ts`（JSON §16.2）にも反映。
6. UI 文言は `apps/web/src/i18n/messages.ts` に集約（監査色の強い表現は使わない）。

最後に `pnpm verify`（型→ユニット→統合E2E）が**緑**になるまで修正してください。
