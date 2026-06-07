# ─────────────────────────────────────────────────────────────
# AWS 最小デプロイバッチ（Windows / PowerShell）
#   何をするか: 依存解決 → フロントビルド → (初回) CDK bootstrap → CDK deploy
#   前提: Node 20+/pnpm/AWS 認証情報(aws configure 済み)
#   使い方:  .\scripts\deploy-aws.ps1            # 2回目以降
#            .\scripts\deploy-aws.ps1 -Bootstrap # 初回（CDKの土台を作成）
#   流れの図解は docs/deployment.md（Mermaid）を参照。
# ─────────────────────────────────────────────────────────────
param([switch]$Bootstrap)
$ErrorActionPreference = 'Stop'

Write-Host '==> [1/4] 依存インストール' -ForegroundColor Cyan
pnpm install

Write-Host '==> [2/4] フロントをビルド (apps/web/dist)' -ForegroundColor Cyan
pnpm --filter @evidence/web build

if ($Bootstrap) {
  Write-Host '==> [3/4] CDK bootstrap（初回のみ・CDK用の土台をAWSに作成）' -ForegroundColor Cyan
  pnpm --filter @evidence/infra exec cdk bootstrap
} else {
  Write-Host '==> [3/4] bootstrap はスキップ（-Bootstrap で実行可能）' -ForegroundColor DarkGray
}

Write-Host '==> [4/4] CDK deploy（CloudFormation で全リソースを作成/更新）' -ForegroundColor Cyan
pnpm --filter @evidence/infra exec cdk deploy --require-approval never

Write-Host '==> 完了。出力の WebUrl / ApiUrl / UserPoolId を控えてください。' -ForegroundColor Green
