/**
 * 証跡ファイルの読み取り・テキスト抽出（要件 §15.2「ファイルが読めるか」）。
 * ストレージは objects 抽象経由（S3/ローカルFS どちらでも動作）。
 * MVP: CSV/テキストはネイティブ抽出。XLSX/PDF/PPTX/画像は「読取可・バイナリ」として扱う
 * （リッチ抽出は Textract / 専用パーサを後から差し込める設計）。
 */
import type { EvidenceFile } from '@evidence/shared';
import { extractExtension } from '@evidence/shared';
import { getObjectText, objectExists } from '../storage/objects.js';

export interface ExtractResult {
  readable: boolean;
  /** 抽出できたテキスト（なければ null） */
  text: string | null;
  /** 抽出種別 */
  kind: 'text' | 'binary' | 'missing';
}

const TEXT_EXTENSIONS = new Set(['csv', 'txt', 'json', 'md', 'log']);

export async function extractEvidence(ev: EvidenceFile): Promise<ExtractResult> {
  if (!(await objectExists(ev.s3Key))) {
    return { readable: false, text: null, kind: 'missing' };
  }
  const ext = extractExtension(ev.originalFileName);
  if (TEXT_EXTENSIONS.has(ext)) {
    const text = await getObjectText(ev.s3Key);
    if (text === null) return { readable: false, text: null, kind: 'missing' };
    return { readable: true, text: text.slice(0, 20000), kind: 'text' };
  }
  // バイナリ：存在し読み取り可能だがテキスト抽出は未対応
  return { readable: true, text: null, kind: 'binary' };
}
