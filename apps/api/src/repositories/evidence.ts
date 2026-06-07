/** 証跡ファイル（EvidenceFile）リポジトリ。 */
import type { EvidenceFile } from '@evidence/shared';
import { getItem, putItem, query, updateAttributes } from '../db/ops.js';
import { evidenceKeys, evidenceSkPrefix, submissionPk } from '../db/keys.js';

const TYPE = 'EvidenceFile';

export async function saveEvidence(e: EvidenceFile): Promise<EvidenceFile> {
  await putItem(TYPE, evidenceKeys(e.submissionId, e.evidenceId), e);
  return e;
}

export async function getEvidence(
  submissionId: string,
  evidenceId: string,
): Promise<EvidenceFile | null> {
  const keys = evidenceKeys(submissionId, evidenceId);
  return getItem<EvidenceFile>(keys.pk, keys.sk);
}

/** 提出配下の証跡一覧（論理削除を除く） */
export async function listEvidence(submissionId: string): Promise<EvidenceFile[]> {
  const items = await query<EvidenceFile>(submissionPk(submissionId), {
    skPrefix: evidenceSkPrefix,
  });
  return items.filter((e) => !e.deletedAt);
}

export async function updateEvidence(
  submissionId: string,
  evidenceId: string,
  attrs: Partial<EvidenceFile>,
): Promise<void> {
  const keys = evidenceKeys(submissionId, evidenceId);
  await updateAttributes(keys.pk, keys.sk, attrs);
}
