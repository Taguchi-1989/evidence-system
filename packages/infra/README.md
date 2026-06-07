# @evidence/infra — AWS CDK スタック雛形

ローカル(LocalStack)で開発したシステムを、**同じ構造**で本番 AWS に展開するための
CDK 定義。MVP 段階では**未デプロイの雛形**。デプロイは後続マイルストーン。

## 含まれるリソース

| リソース | 内容 | ローカル対応 |
| --- | --- | --- |
| DynamoDB | 単一テーブル `evidence-system`（pk/sk + GSI1/2/3, PITR, 暗号化） | LocalStack DynamoDB |
| S3 | 証跡バケット（Block Public Access / 暗号化 / Versioning / CORS / Lifecycle, §14.3） | LocalStack S3 |
| Lambda (API) | `apps/api/src/lambda.ts`（Hono をそのまま Lambda 化） | `local-server.ts` |
| API Gateway | HTTP API → API Lambda 統合 | ローカルは直 HTTP |
| Cognito | UserPool + Client（`AUTH_PROVIDER=cognito` で利用） | MockAuthProvider |
| Lambda (監査) | `apps/api/src/lambda-audit.ts` | `pnpm audit:run` |
| EventBridge | 夜間 02:00 JST に監査 Lambda を起動（§15.1） | 手動実行 |

## 前提

- Node.js 20+ / AWS アカウント / 認証情報（`aws configure` 済み）
- 初回のみ: `npx aws-cdk bootstrap`

## デプロイ手順（雛形を本番化するとき）

```bash
pnpm install                     # infra の依存を取得
pnpm --filter @evidence/infra synth     # CloudFormation を合成して確認
pnpm --filter @evidence/infra deploy    # スタックをデプロイ
```

出力（CfnOutput）に API URL / テーブル名 / バケット名 / Cognito ID が表示される。
フロントの `VITE_API_BASE_URL` を API URL に向け、`apps/api` の env を出力値に合わせる。

## ローカル → AWS 移行で変わるのは設定だけ

アプリのコード（repositories / handlers / 監査Agent）は**無改変**。差し替えるのは:

1. **ストレージ接続**: env の `AWS_ENDPOINT_URL` を外す（AWS 実エンドポイントへ）。
2. **認証**: `AUTH_PROVIDER=cognito` にし、[`apps/api/src/auth/cognito.ts`](../../apps/api/src/auth/cognito.ts)
   の `verify()` を JWKS 検証で実装する（雛形あり）。フロントはログインを Cognito Hosted UI / SRP に差し替え。
3. **データ移行**: 既存データは `POST /admin/export`(JSON, schemaVersion 1.0) で書き出し、
   新環境にインポートできる（§16 移行可能性）。

## 未確定事項（デプロイ前に確定）

- CORS 許可オリジンを CloudFront ドメインに限定（現状 `*`）
- CloudFront + S3 静的ホスティングでフロントを配信（本雛形は API/データ層中心）
- KMS カスタムキー採用の要否（現状 S3/DDB マネージドキー）
- Step Functions 化（監査の大規模化時。現状 Lambda 単体）
