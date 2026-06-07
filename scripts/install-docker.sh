#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# Docker Engine（無償・Apache-2.0）を Ubuntu/Debian(WSL含む)に導入する。
# Docker Desktop は使わない＝ライセンス費ゼロ。
#   使い方（WSL/Linux 内で）:  bash scripts/install-docker.sh
# ─────────────────────────────────────────────────────────────
set -euo pipefail

# 既に Docker が稼働していれば何もしない（判定して進む）
if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  echo "==> Docker は既に稼働中です: $(docker --version)（変更なし）"
  exit 0
fi

if command -v docker >/dev/null 2>&1; then
  echo "==> docker は導入済み（デーモン未起動の可能性）: $(docker --version)"
else
  echo "==> Docker Engine を公式スクリプト(get.docker.com)で導入"
  curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
  sudo sh /tmp/get-docker.sh
  rm -f /tmp/get-docker.sh
fi

echo "==> 現ユーザーを docker グループへ追加（sudo なしで docker 実行）"
sudo usermod -aG docker "$USER" || true

# WSL でサービスを自動起動できるよう systemd を有効化（WSL再起動後に有効）
if [ -f /proc/version ] && grep -qiE "microsoft|wsl" /proc/version; then
  if [ ! -f /etc/wsl.conf ] || ! grep -q "systemd=true" /etc/wsl.conf; then
    printf '[boot]\nsystemd=true\n' | sudo tee -a /etc/wsl.conf >/dev/null
    echo "==> /etc/wsl.conf に systemd=true を設定（Windows側で 'wsl --shutdown' 後に有効）"
  fi
fi

# 今すぐ起動を試す（systemd 未反映でも service で起動できる場合がある）
sudo service docker start 2>/dev/null || sudo systemctl start docker 2>/dev/null || true

echo "==> 確認"
docker --version
docker compose version 2>/dev/null || echo "（compose プラグインは docker と同梱されます）"
if docker info >/dev/null 2>&1; then
  echo "OK: dockerd 稼働中。'pnpm stack:up' が使えます。"
else
  echo "注意: 反映のため一度 WSL を終了してください → Windows で 'wsl --shutdown' → WSLを開き直す"
  echo "      （docker グループ反映のための再ログインも兼ねます）"
fi
