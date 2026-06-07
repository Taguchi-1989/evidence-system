# 成果・証跡管理システム (Evidence System)

期末・年度末の評価で、達成内容・影響度・貢献度・証跡資料を後から振り返れる形で
収集・整理する社内向け Web システム。要件定義は [`youkenteigi.md`](./youkenteigi.md)。

> **設計思想**: UIはMVP（利用者には軽く） / 内部は本番相当 / 段階的に要求水準を上げる /
> データは最初から移行可能。詳細はプランファイル参照。

## 構成（モノレポ / pnpm workspaces）

| パッケージ | 役割 |
| --- | --- |
| `packages/shared` | 型・Zodスキーマ・enum・ポリシー既定値・JSONエクスポート型（フロント/バック共有） |
| `apps/api` | Hono バックエンド（Lambda 互換）+ 監査Agent + ローカル起動 + seed |
| `apps/web` | React + Vite SPA |
| `packages/infra` | AWS CDK スタック雛形（後続：実デプロイ用） |

ストレージは **DynamoDB 単一テーブル** + **S3**。ローカルは LocalStack で AWS 互換 API を提供し、
本番へは endpoint 設定の差替と CDK デプロイで移行できる。

## クイックスタート

前提: Node.js 20+ / pnpm 10+ / Docker（Compose v2）

```bash
# 1) 依存インストール
pnpm install

# 2) 環境変数を用意
cp .env.example .env

# 3) LocalStack 起動（S3 + DynamoDB）
pnpm stack:up

# 4) テーブル/バケット作成・マスタ/デモデータ投入
pnpm seed

# 5) API + フロントを並行起動
pnpm dev
#   API:  http://localhost:8787
#   Web:  http://localhost:5173
```

ワンショット: `pnpm setup`（env生成 → install → stack:up → seed）。

## 会社の環境に持ち込んで動かす（最小手順）

前提: VS Code + Node 20+ / pnpm / Docker。

```bash
git clone https://github.com/Taguchi-1989/evidence-system.git
cd evidence-system
pnpm setup    # .env 自動生成 → 依存 → LocalStack 起動 → seed
pnpm dev      # http://localhost:5173 を開く
```

- `.env` は自動生成されます（`scripts/ensure-env.mjs`）。LocalStack 用のダミー値のみで、秘密情報は不要。
- VS Code で開くと**推奨拡張**（[.vscode/extensions.json](.vscode/extensions.json)）と
  **ワンクリックのタスク**（[.vscode/tasks.json](.vscode/tasks.json): LocalStack起動 / seed / dev）が使えます。
- **Dev Container / Codespaces 対応**（[.devcontainer/devcontainer.json](.devcontainer/devcontainer.json)）。
  「Reopen in Container」で Node・pnpm・Docker・Copilot 拡張まで揃った状態で即開発できます。

### GitHub Copilot で開発する

リポジトリに **Copilot 指示書**（[.github/copilot-instructions.md](.github/copilot-instructions.md)）を同梱。
Copilot Chat がこのプロジェクトの構成・規約（共有Zod / 単一テーブルキー / RBAC / ポリシー駆動 / 柔らかいUI文言）を
理解した状態で補完・提案します。Copilot に「このリポジトリの方針に沿って〜」と頼むだけで文脈が効きます。

## よく使うスクリプト（ルート）

| コマンド | 内容 |
| --- | --- |
| `pnpm dev` | api + web を並行起動 |
| `pnpm seed` | DynamoDB/S3 初期化 + マスタ/デモ投入 |
| `pnpm audit:run` | 監査Agent を手動実行 |
| `pnpm test` | 全パッケージの Vitest |
| `pnpm e2e` | Playwright e2e |
| `pnpm typecheck` / `pnpm lint` | 型チェック / Lint |
| `pnpm stack:up` / `pnpm stack:down` | LocalStack 起動 / 停止 |

## モックログイン

開発時はモック認証。ログイン画面で利用者とロール（一般入力者 / 上長 / 事務局 / 監査者 /
システム管理者）を切り替えて、各ロールの見え方を確認できる。本番は Cognito に差替（`AUTH_PROVIDER=cognito`）。

## AWS デプロイ・配信・夜間バッチ

ワンコマンドで AWS に展開できます（要 `aws configure`）。

```bash
pnpm deploy:bootstrap   # 初回のみ（CDK の土台）
pnpm deploy:aws         # フロントビルド + CDK deploy（API/DB/S3/CloudFront/監査バッチ）
```

**仕組みと流れの図解（Mermaid）→ [docs/deployment.md](docs/deployment.md)**
（AWS 設定バッチ / フロント配信(S3+CloudFront) / 夜間監査バッチ が何をして何ができるようになるか）

**構成の選び方（コスト×利用者規模の比較表）→ [docs/aws-architecture-comparison.md](docs/aws-architecture-comparison.md)**
（EC2 / S3 / DynamoDB / Aurora などの組み合わせ別コスト概算と、規模ごとの最適解）
