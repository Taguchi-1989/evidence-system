/** 提出（Submission）リポジトリ。単一テーブルのキー再構築は keys.ts に集約。 */
import type { Submission, SubmissionStatus } from '@evidence/shared';
import { getItem, putItem, query, type StoredItem } from '../db/ops.js';
import {
  submissionKeys,
  submissionPk,
  yearAllSubmissionsGsi1pk,
  deptSubmissionsGsi2pk,
  userSubmissionsGsi3pk,
} from '../db/keys.js';

const TYPE = 'Submission';

/** GSI ソート用タイムスタンプ（提出済なら submittedAt、なければ createdAt） */
function sortTs(s: Submission): string {
  return s.submittedAt ?? s.createdAt;
}

export async function saveSubmission(s: Submission): Promise<Submission> {
  const keys = submissionKeys({
    submissionId: s.submissionId,
    fiscalYear: s.fiscalYear,
    departmentId: s.departmentId,
    userId: s.userId,
    status: s.status,
    sortTs: sortTs(s),
  });
  await putItem(TYPE, keys, s);
  return s;
}

export async function getSubmission(submissionId: string): Promise<Submission | null> {
  return getItem<Submission>(submissionPk(submissionId), 'META');
}

function filterActive(items: Submission[]): Submission[] {
  return items.filter((s) => !s.deletedAt);
}

function filterStatus(items: Submission[], status?: SubmissionStatus): Submission[] {
  return status ? items.filter((s) => s.status === status) : items;
}

/** 事務局/管理者：年度内の全提出 */
export async function listByFiscalYear(
  fiscalYear: string,
  status?: SubmissionStatus,
): Promise<Submission[]> {
  const items = await query<Submission>(yearAllSubmissionsGsi1pk(fiscalYear), {
    index: 'gsi1',
    descending: true,
  });
  return filterStatus(filterActive(items), status);
}

/** 上長：部署の提出 */
export async function listByDepartment(
  fiscalYear: string,
  departmentId: string,
  status?: SubmissionStatus,
): Promise<Submission[]> {
  const items = await query<Submission>(deptSubmissionsGsi2pk(fiscalYear, departmentId), {
    index: 'gsi2',
  });
  return filterStatus(filterActive(items), status);
}

/** 一般：自分の提出 */
export async function listByUser(userId: string, fiscalYear?: string): Promise<Submission[]> {
  const items = await query<Submission>(userSubmissionsGsi3pk(userId), {
    index: 'gsi3',
    ...(fiscalYear ? { skPrefix: `FY#${fiscalYear}#` } : {}),
  });
  return filterActive(items);
}

export type StoredSubmission = StoredItem<Submission>;
