#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# AWS 最小デプロイバッチ（macOS / Linux / WSL）— 状態を判定しながら進む
#   1) AWS認証の有無を判定（無ければ中止）
#   2) フロントをビルド
#   3) bootstrap 済みかを判定し、未済みのときだけ実行
#   4) deploy（冪等：差分のみ適用）
#   使い方:  ./scripts/deploy-aws.sh                 （自動判定）
#            FORCE_BOOTSTRAP=1 ./scripts/deploy-aws.sh （bootstrapを強制）
# ─────────────────────────────────────────────────────────────
set -euo pipefail
FORCE_BOOTSTRAP="${FORCE_BOOTSTRAP:-0}"

echo "==> [1/4] AWS 認証情報を確認"
HAVE_AWS=0
if command -v aws >/dev/null 2>&1; then
  HAVE_AWS=1
  if aws sts get-caller-identity >/dev/null 2>&1; then
    echo "   ✓ 認証OK"
  else
    echo "   ✗ AWS 認証情報がありません。aws configure を実行してください。"
    exit 1
  fi
else
  echo "   ! aws CLI 未検出。CDK は環境変数/プロファイルの認証を使用します。"
fi

echo "==> [2/4] フロントをビルド (apps/web/dist)"
pnpm --filter @evidence/web build

echo "==> [3/4] CDK bootstrap の要否を判定"
need_bootstrap=1
if [ "$FORCE_BOOTSTRAP" != "1" ] && [ "$HAVE_AWS" = "1" ]; then
  if aws cloudformation describe-stacks --stack-name CDKToolkit >/dev/null 2>&1; then
    need_bootstrap=0
  fi
fi
if [ "$need_bootstrap" = "1" ]; then
  echo "   bootstrap を実行します（未済み or 不明 or 強制）"
  pnpm --filter @evidence/infra exec cdk bootstrap
else
  echo "   ✓ bootstrap 済みを検出（スキップ）"
fi

echo "==> [4/4] CDK deploy（差分のみ適用）"
pnpm --filter @evidence/infra exec cdk deploy --require-approval never

echo "完了。出力の WebUrl / ApiUrl / UserPoolId を控えてください。"
