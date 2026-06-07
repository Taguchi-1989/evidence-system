// .env が無ければ .env.example から作成する（OS非依存）。
// pull 直後でも `pnpm setup` / `pnpm dev` がそのまま通るようにするためのもの。
import { existsSync, copyFileSync } from 'node:fs';

if (!existsSync('.env')) {
  copyFileSync('.env.example', '.env');
  console.log('[ensure-env] .env を .env.example から作成しました');
} else {
  console.log('[ensure-env] .env は既に存在します（変更なし）');
}
