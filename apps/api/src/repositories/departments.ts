/** 部署マスタ（Department）リポジトリ。 */
import type { Department } from '@evidence/shared';
import { getItem, putItem, query } from '../db/ops.js';
import { departmentKeys, deptSkPrefix, masterPk } from '../db/keys.js';

const TYPE = 'Department';

export async function putDepartment(fiscalYear: string, dept: Department): Promise<Department> {
  await putItem(TYPE, departmentKeys(fiscalYear, dept.departmentId), dept);
  return dept;
}

export async function getDepartment(
  fiscalYear: string,
  departmentId: string,
): Promise<Department | null> {
  const keys = departmentKeys(fiscalYear, departmentId);
  return getItem<Department>(keys.pk, keys.sk);
}

export async function listDepartments(fiscalYear: string): Promise<Department[]> {
  return query<Department>(masterPk(fiscalYear), { skPrefix: deptSkPrefix });
}
