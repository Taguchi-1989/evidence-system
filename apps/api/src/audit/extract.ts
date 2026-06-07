/**
 * 証跡ファイルの読み取り・テキスト抽出（要件 §15.2「ファイルが読めるか」）。
 * MVP: CSV/テキストはネイティブ抽出。XLSX/PDF/PPTX/画像は「読取可・バイナリ」として扱う
 * （リッチ抽出は Textract / 専用パーサを後から差し込める設計）。
 */
import { GetObjectCommand } from '@aws-sdk/client-s3';
import type { EvidenceFile } from '@evidence/shared';
import { extractExtension } from '@evidence/shared';
import { s3, BUCKET } from '../s3/client.js';

export interface ExtractResult {
  readable: boolean;
  /** 抽出できたテキスト（なければ null） */
  text: string | null;
  /** 抽出種別 */
  kind: 'text' | 'binary' | 'missing';
}

const TEXT_EXTENSIONS = new Set(['csv', 'txt', 'json', 'md', 'log']);

export async function extractEvidence(ev: EvidenceFile): Promise<ExtractResult> {
  try {
    const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: ev.s3Key }));
    const ext = extractExtension(ev.originalFileName);

    if (TEXT_EXTENSIONS.has(ext) && res.Body) {
      const text = await res.Body.transformToString('utf-8');
      return { readable: true, text: text.slice(0, 20000), kind: 'text' };
    }
    // バイナリ：存在し読み取り可能だがテキスト抽出は未対応
    return { readable: true, text: null, kind: 'binary' };
  } catch {
    return { readable: false, text: null, kind: 'missing' };
  }
}
