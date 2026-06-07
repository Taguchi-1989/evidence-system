/**
 * 証跡タイプと実ファイル形式の整合チェック（要件 §15.2
 *「証跡タイプと内容が大きく矛盾していないか」の一次判定）。
 * 形式レベルの矛盾のみを見る（内容の深い検証は LLM / Textract に委ねる）。
 */
import type { EvidenceType } from '@evidence/shared';

/** 証跡タイプごとに「妥当と思われる拡張子」。空集合は「任意（チェックしない）」 */
const PLAUSIBLE_EXTENSIONS: Record<EvidenceType, string[]> = {
  REPORT: ['pdf', 'pptx', 'xlsx', 'xls'],
  MEETING_MATERIAL: ['pdf', 'pptx', 'xlsx'],
  DESIGN_DOC: ['pdf', 'pptx', 'xlsx'],
  PROCEDURE: ['pdf', 'pptx'],
  MINUTES: ['pdf', 'pptx', 'csv', 'txt'],
  EXCEL_SUMMARY: ['xlsx', 'xls', 'csv'],
  KPI: ['xlsx', 'xls', 'csv', 'pdf'],
  SYSTEM_LOG: ['csv', 'txt', 'log'],
  MAIL_CHAT: [], // 形式は問わない
  IMAGE_PHOTO: ['png', 'jpg', 'jpeg', 'gif', 'webp'],
  CUSTOMER_FEEDBACK: [], // 形式は問わない
  OTHER: [], // 形式は問わない
};

export interface ConsistencyResult {
  consistent: boolean;
  note: string;
}

export function checkTypeConsistency(
  evidenceType: EvidenceType,
  extension: string,
): ConsistencyResult {
  const plausible = PLAUSIBLE_EXTENSIONS[evidenceType];
  if (plausible.length === 0) return { consistent: true, note: '' };
  if (plausible.includes(extension.toLowerCase())) return { consistent: true, note: '' };
  return {
    consistent: false,
    note: `証跡タイプ(${evidenceType})と拡張子(.${extension})が一致しない可能性があります。`,
  };
}
