# ─────────────────────────────────────────────────────────────
# AWS 最小デプロイバッチ（Windows / PowerShell）— 状態を判定しながら進む
#   1) AWS認証の有無を判定（無ければ中止）
#   2) フロントをビルド
#   3) bootstrap 済みかを判定し、未済みのときだけ実行
#   4) deploy（冪等：差分のみ適用）
#   使い方:  .\scripts\deploy-aws.ps1            （自動判定）
#            .\scripts\deploy-aws.ps1 -ForceBootstrap （bootstrapを強制）
# ─────────────────────────────────────────────────────────────
param([switch]$ForceBootstrap)
$ErrorActionPreference = 'Stop'

Write-Host '==> [1/4] AWS 認証情報を確認' -ForegroundColor Cyan
$haveAws = [bool](Get-Command aws -ErrorAction SilentlyContinue)
if ($haveAws) {
  & aws sts get-caller-identity *> $null
  if ($LASTEXITCODE -ne 0) {
    Write-Host '   ✗ AWS 認証情報がありません。`aws configure` を実行してください。' -ForegroundColor Red
    exit 1
  }
  Write-Host '   ✓ 認証OK' -ForegroundColor DarkGray
} else {
  Write-Host '   ! aws CLI 未検出。CDK は環境変数/プロファイルの認証を使用します。' -ForegroundColor Yellow
}

Write-Host '==> [2/4] フロントをビルド (apps/web/dist)' -ForegroundColor Cyan
pnpm --filter @evidence/web build

Write-Host '==> [3/4] CDK bootstrap の要否を判定' -ForegroundColor Cyan
$needBootstrap = $true
if (-not $ForceBootstrap -and $haveAws) {
  & aws cloudformation describe-stacks --stack-name CDKToolkit *> $null
  if ($LASTEXITCODE -eq 0) { $needBootstrap = $false }
}
if ($needBootstrap) {
  Write-Host '   bootstrap を実行します（未済み or 不明 or 強制）' -ForegroundColor Yellow
  pnpm --filter @evidence/infra exec cdk bootstrap
} else {
  Write-Host '   ✓ bootstrap 済みを検出（スキップ）' -ForegroundColor DarkGray
}

Write-Host '==> [4/4] CDK deploy（差分のみ適用）' -ForegroundColor Cyan
pnpm --filter @evidence/infra exec cdk deploy --require-approval never

Write-Host '完了。出力の WebUrl / ApiUrl / UserPoolId を控えてください。' -ForegroundColor Green
