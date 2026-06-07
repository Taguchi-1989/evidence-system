/** 初期化ランナー：`pnpm seed`。実体は src/seed.ts の seedAll()。 */
import { seedAll } from '../src/seed.js';

seedAll().catch((e) => {
  console.error('[seed] 失敗:', e);
  process.exit(1);
});
