# ─────────────────────────────────────────────────────────────
# Docker を「Docker Desktop なし・無償」で使えるようにする（Windows）。
#   方式: WSL2 + Docker Engine。Docker Desktop のライセンス費を回避。
#   要: 管理者権限（WSL 未導入時はインストール＆再起動が必要）。
#   使い方（管理者 PowerShell）:  .\scripts\setup-docker-wsl.ps1
# ─────────────────────────────────────────────────────────────
$ErrorActionPreference = 'Stop'

Write-Host '==> [1/3] WSL ディストリの有無を確認' -ForegroundColor Cyan
$distros = & wsl.exe -l -q 2>$null | Where-Object { $_ -and $_.Trim() -ne '' }

if (-not $distros) {
  Write-Host '   WSL ディストリが見つかりません。WSL2 + Ubuntu を導入します（要再起動）。' -ForegroundColor Yellow
  wsl.exe --install -d Ubuntu
  Write-Host ''
  Write-Host '★ 再起動後に Ubuntu が初回起動し、ユーザー名/パスワードを設定します。' -ForegroundColor Yellow
  Write-Host '  その後、もう一度この同じスクリプトを実行してください。' -ForegroundColor Yellow
  exit 0
}

wsl.exe --set-default-version 2 | Out-Null
Write-Host "   検出: $($distros -join ', ')" -ForegroundColor DarkGray

Write-Host '==> [2/3] WSL 内で Docker Engine を導入' -ForegroundColor Cyan
$repo = (Resolve-Path "$PSScriptRoot\..").Path
$wslRepo = (& wsl.exe wslpath -a "$repo").Trim()
& wsl.exe bash -lc "cd '$wslRepo' && bash scripts/install-docker.sh"

Write-Host '==> [3/3] 反映のため WSL を再起動' -ForegroundColor Cyan
wsl.exe --shutdown

Write-Host ''
Write-Host '完了。以降は WSL ターミナル内で開発します:' -ForegroundColor Green
Write-Host '  1) WSL を開く（スタート→Ubuntu、または `wsl`）' -ForegroundColor Green
Write-Host '  2) リポジトリへ移動し  pnpm setup && pnpm dev' -ForegroundColor Green
Write-Host '  3) Windows のブラウザで http://localhost:5173 を開く（WSL2 が localhost を転送）' -ForegroundColor Green
