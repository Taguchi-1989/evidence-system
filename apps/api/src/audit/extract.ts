/**
 * 証跡ファイルの読み取り・テキスト抽出（要件 §15.2「ファイルが読めるか」）。
 * ストレージは objects 抽象経由（S3/ローカルFS どちらでも動作）。
 *   - CSV/テキスト : ネイティブ抽出
 *   - XLSX        : exceljs でセル文字列を抽出
 *   - PDF/PPTX/画像: 「読取可・バイナリ」（リッチ抽出は Textract / 専用パーサを後から追加可能）
 */
import ExcelJS from 'exceljs';
import type { EvidenceFile } from '@evidence/shared';
import { extractExtension } from '@evidence/shared';
import { getObjectText, getObjectBytes, objectExists } from '../storage/objects.js';

export interface ExtractResult {
  readable: boolean;
  text: string | null;
  kind: 'text' | 'binary' | 'missing';
}

const TEXT_EXTENSIONS = new Set(['csv', 'txt', 'json', 'md', 'log']);
const XLSX_EXTENSIONS = new Set(['xlsx']);

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

  if (XLSX_EXTENSIONS.has(ext)) {
    const bytes = await getObjectBytes(ev.s3Key);
    if (!bytes) return { readable: false, text: null, kind: 'missing' };
    try {
      const text = await extractXlsxText(bytes);
      return { readable: true, text: text.slice(0, 20000), kind: 'text' };
    } catch {
      return { readable: true, text: null, kind: 'binary' };
    }
  }

  // バイナリ：存在し読み取り可能だがテキスト抽出は未対応
  return { readable: true, text: null, kind: 'binary' };
}

/** XLSX の全シート・全セルをタブ区切りテキストへ */
async function extractXlsxText(bytes: Uint8Array): Promise<string> {
  const wb = new ExcelJS.Workbook();
  // exceljs の型は旧 Buffer 想定。Node22 の generic Buffer と齟齬が出るため cast。
  await wb.xlsx.load(Buffer.from(bytes) as never);
  const lines: string[] = [];
  wb.eachSheet((sheet) => {
    lines.push(`# ${sheet.name}`);
    sheet.eachRow((row) => {
      const values = Array.isArray(row.values) ? row.values.slice(1) : [];
      lines.push(values.map(cellToText).join('\t'));
    });
  });
  return lines.join('\n');
}

function cellToText(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'object') {
    const o = v as { text?: string; result?: unknown; richText?: { text: string }[] };
    if (Array.isArray(o.richText)) return o.richText.map((r) => r.text).join('');
    if (typeof o.text === 'string') return o.text;
    if ('result' in o) return String(o.result ?? '');
    return '';
  }
  return String(v);
}
