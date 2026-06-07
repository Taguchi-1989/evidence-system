/** 監査Agent の手動実行（夜間バッチ相当）。`pnpm audit:run [fiscalYear]` */
import { runAudit } from '../src/audit/agent.js';

const fiscalYear = process.argv[2] ?? '2026';

runAudit({ fiscalYear })
  .then((summary) => {
    console.log('[audit] 完了 ✅');
    console.log(summary);
  })
  .catch((e) => {
    console.error('[audit] 失敗:', e);
    process.exit(1);
  });
