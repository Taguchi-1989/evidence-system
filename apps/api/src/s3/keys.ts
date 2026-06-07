/** S3 キー設計（要件 §14.2）。年度/部署/ユーザー/提出/証跡 で階層化し追跡可能にする。 */
import { extractExtension } from '@evidence/shared';

export function evidenceS3Key(p: {
  fiscalYear: string;
  departmentId: string;
  userId: string;
  submissionId: string;
  evidenceId: string;
  originalFileName: string;
}): string {
  const ext = extractExtension(p.originalFileName) || 'bin';
  return [
    `fiscalYear=${p.fiscalYear}`,
    `departmentId=${p.departmentId}`,
    `userId=${p.userId}`,
    `submissionId=${p.submissionId}`,
    `evidenceId=${p.evidenceId}`,
    `original.${ext}`,
  ].join('/');
}
