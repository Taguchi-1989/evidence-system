---
mode: agent
description: Excel から成果データを一括取り込みする機能を追加する
---

管理者が Excel（XLSX）から成果（Submission）を一括取り込みできる機能を追加してください。

1. バックエンド
   - `apps/api/src/storage/objects.ts` の `getObjectBytes` と `exceljs`（`audit/extract.ts` 参照）で
     XLSX を読み取るユーティリティを `apps/api/src/services/import.ts` に実装。
   - 1行=1提出としてマッピング（ヘッダ→`CreateSubmissionInput`）。検証は `@evidence/shared` の Zod。
   - エンドポイント `POST /admin/import`（office/admin）：presign で XLSX をアップロード後、
     その s3Key を受け取り取り込み。結果（成功件数/エラー行）を返す。RBAC・操作ログを付与。
2. フロント
   - `apps/web` にインポート画面（XLSX選択→presign→PUT→/admin/import 実行→結果表示）を追加し、
     ナビ（office/admin）に導線を足す。テンプレートのダウンロードも用意。
3. ドキュメント `docs/api.md` に `/admin/import` を追記。

列の対応（テーマ名/達成内容/影響度/貢献度/証跡有無/部署/氏名 等）は既存スキーマに合わせ、
不正な行はスキップせず行番号付きでエラー報告すること。最後に `pnpm verify` が緑になるまで修正。
