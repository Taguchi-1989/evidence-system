# GitHub Copilot 指示書（このリポジトリ用）

GitHub Copilot / Copilot Chat はこのファイルを自動で読み、プロジェクトの文脈に沿った
補完・提案を行います。新しいコードを書くときは以下の方針に従ってください。

## このプロジェクトは何か

「成果・証跡管理システム」。期末評価で **達成内容・影響度・貢献度・証跡資料** を
後から振り返れる形で収集・整理する社内 Web システム。要件定義は [`youkenteigi.md`](../youkenteigi.md)。

設計思想（最重要・必ず守る）:
- **UIはMVP**（利用者には軽く見せる。証跡を強制しない）
- **内部は本番相当**（モード切替・ポリシー・監査Agent・将来Claim分解に備える）
- **段階的に要求水準を上げる**（Trial → MVP → Transition → Strict）
- **データは最初から移行可能**（JSONは versioned, schemaVersion 1.0）

## 構成（pnpm モノレポ）

| パッケージ | 役割 | 主な技術 |
| --- | --- | --- |
| `packages/shared` | 型・Zodスキーマ・enum・ポリシー（フロント/バック共有の単一の真実源） | Zod |
| `apps/api` | バックエンド（Lambda互換） | Hono / AWS SDK v3 / DynamoDB / S3 |
| `apps/web` | フロント SPA | React + Vite / Tailwind / TanStack Query/Table / RHF |
| `packages/infra` | AWS CDK 雛形 | aws-cdk-lib |

## 開発の始め方（pull 直後）

```bash
pnpm install
pnpm stack:up   # LocalStack(S3+DynamoDB) を Docker で起動
pnpm seed       # テーブル/バケット作成 + マスタ/デモデータ
pnpm dev        # API:8787 + Web:5173
```
`.env` は `pnpm dev`/`pnpm setup` 時に自動生成される（`scripts/ensure-env.mjs`）。
ログインはモック認証（画面で利用者・ロールを選択）。

## コーディング規約・重要パターン

- **型/スキーマは必ず `@evidence/shared` に置く**。フロントとバックで二重定義しない。
  enum はキー（英大文字）＋ラベル（日本語 `*_LABELS`）の形（[enums.ts](../packages/shared/src/enums.ts)）。
- **DynamoDB は単一テーブル設計**。キー構築は必ず [`apps/api/src/db/keys.ts`](../apps/api/src/db/keys.ts) に集約。
  生のキー文字列をハンドラに直書きしない。データ操作は `db/ops.ts` 経由。
- **RBAC** は [`apps/api/src/services/rbac.ts`](../apps/api/src/services/rbac.ts)。新ルートは必ず権限を確認。
- **ポリシー（運用モード）駆動**: 振る舞いは [`policy.ts`](../packages/shared/src/policy.ts) のフラグで切替。
  ハードコードで分岐せず、`resolvePolicy` / `getEffectivePolicy` を使う。
- **証跡ファイルは presigned URL 経由**（Lambda にファイル本体を通さない）。S3キーは `s3/keys.ts`。
- **ストレージは抽象経由で使う**: DB は `db/ops.ts`、オブジェクトは `storage/objects.ts`。
  生の AWS SDK 呼び出しをハンドラに直書きしない。`STORAGE_DRIVER=aws|local` で
  DynamoDB+S3 / ローカルファイル を切替（local は Docker 不要）。新しい操作が要るときは
  両ドライバ（dynamo/memory, s3/local）に実装を足す。
- **AWS 移植性を壊さない**: ストレージは AWS SDK v3 をそのまま使い、ローカル/本番の差は env のみ。
  認証だけ `AuthProvider` 抽象（Mock/Cognito）で差し替える。
- **UI 文言は [`apps/web/src/i18n/messages.ts`](../apps/web/src/i18n/messages.ts) に集約**。
  「不備」「証跡不足」など監査色の強い表現は使わない（要件§11.2）。柔らかい表現を使う。
- フロントのデータ取得は TanStack Query + [`endpoints.ts`](../apps/web/src/lib/endpoints.ts)。
  フォームは React Hook Form。UI は `components/ui/*`（shadcn 流儀）。

## 変更時のチェック

- **まず `pnpm verify`**（型チェック→ユニット→ローカル統合E2E、Docker不要・GitHub Actions不要）。
  実体は [`apps/api/scripts/verify-local.ts`](../apps/api/scripts/verify-local.ts)（local モードで in-process 検証）。
- 個別: 型 `pnpm -r typecheck` / 単体 `pnpm -r test` / ブラウザ e2e `pnpm e2e`（dev 起動中）。
- 機密情報をコミットしない（`.env` は gitignore 済み。鍵やトークンを直書きしない）。

## やってはいけないこと

- `youkenteigi.md` の方針に反する実装（証跡の強制、AI評価の確定、Claim必須化など §21）。
- shared と重複する型をフロント/バックに個別定義する。
- DynamoDB のキーをハンドラ内で直接組み立てる。
- 監査Agentの結果を「最終評価」として扱う（あくまで参考判定 §15.2）。

## 外部連携・拡張ポイント

- **API（外部Agent/他システム）**: REST。`AGENT_API_KEYS` の APIキーを Bearer で M2M 認証
  （[`middleware/auth.ts`](../apps/api/src/middleware/auth.ts)）。一覧/形は [docs/api.md](../docs/api.md)。
- **証跡抽出**: CSV/テキスト/**XLSX**（exceljs）。追加は [`audit/extract.ts`](../apps/api/src/audit/extract.ts) と
  `storage/objects.ts` の `getObjectBytes`。
- **監査LLM**: `AUDIT_LLM_PROVIDER=none|anthropic|azure-openai`（[`audit/llm.ts`](../apps/api/src/audit/llm.ts)）。
- **拡張プロンプト**: [.github/prompts](./prompts) に再利用プロンプト（項目追加/抽出器/LLM/エンドポイント/Excel取込）。

## もっと知るには

- API リファレンス → [docs/api.md](../docs/api.md)
- デプロイ/配信/夜間バッチの図解 → [docs/deployment.md](../docs/deployment.md)
- AWS 構成のコスト比較 → [docs/aws-architecture-comparison.md](../docs/aws-architecture-comparison.md)
