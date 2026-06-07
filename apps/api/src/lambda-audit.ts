/** 監査Agent の Lambda エントリ（EventBridge 夜間スケジュールから起動）。 */
import { runAudit } from './audit/agent.js';
import { currentFiscalYear } from './lib/util.js';

export const handler = async (event: { fiscalYear?: string } | undefined) => {
  const fiscalYear = event?.fiscalYear ?? currentFiscalYear();
  return runAudit({ fiscalYear });
};
