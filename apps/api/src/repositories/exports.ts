/** エクスポートジョブ（ExportJob）リポジトリ。 */
import type { ExportJob } from '@evidence/shared';
import { getItem, putItem, query, updateAttributes } from '../db/ops.js';
import { exportKeys, exportPk, yearExportGsi1pk } from '../db/keys.js';

const TYPE = 'ExportJob';

export async function saveExportJob(job: ExportJob): Promise<ExportJob> {
  await putItem(TYPE, exportKeys(job.exportJobId, job.fiscalYear, job.createdAt), job);
  return job;
}

export async function getExportJob(jobId: string): Promise<ExportJob | null> {
  return getItem<ExportJob>(exportPk(jobId), 'META');
}

export async function updateExportJob(jobId: string, attrs: Partial<ExportJob>): Promise<void> {
  await updateAttributes(exportPk(jobId), 'META', attrs);
}

export async function listExportJobs(fiscalYear: string): Promise<ExportJob[]> {
  return query<ExportJob>(yearExportGsi1pk(fiscalYear), { index: 'gsi1', descending: true });
}
