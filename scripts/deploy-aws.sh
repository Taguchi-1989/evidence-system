#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# AWS 最小デプロイバッチ（macOS / Linux / WSL）
#   何をするか: 依存解決 → フロントビルド → (初回) CDK bootstrap → CDK deploy
#   前提: Node 20+/pnpm/AWS 認証情報(aws configure 済み)
#   使い方:  ./scripts/deploy-aws.sh              # 2回目以降
#            BOOTSTRAP=1 ./scripts/deploy-aws.sh  # 初回（CDKの土台を作成）
#   流れの図解は docs/deployment.md（Mermaid）を参照。
# ─────────────────────────────────────────────────────────────
set -euo pipefail

echo "==> [1/4] 依存インストール"
pnpm install

echo "==> [2/4] フロントをビルド (apps/web/dist)"
pnpm --filter @evidence/web build

if [ "${BOOTSTRAP:-0}" = "1" ]; then
  echo "==> [3/4] CDK bootstrap（初回のみ・CDK用の土台をAWSに作成）"
  pnpm --filter @evidence/infra exec cdk bootstrap
else
  echo "==> [3/4] bootstrap はスキップ（BOOTSTRAP=1 で実行可能）"
fi

echo "==> [4/4] CDK deploy（CloudFormation で全リソースを作成/更新）"
pnpm --filter @evidence/infra exec cdk deploy --require-approval never

echo "==> 完了。出力の WebUrl / ApiUrl / UserPoolId を控えてください。"
