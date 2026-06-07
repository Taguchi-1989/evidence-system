/**
 * Excel(XLSX)/CSV からの成果一括取込。
 * ヘッダ行→フィールドにマッピングし、Zod 相当の検証をして Submission を作成する。
 * 不正行はスキップせず、行番号付きでエラー報告（§取込プロンプト方針）。
 */
import ExcelJS from 'exceljs';
import {
  EVIDENCE_PRESENCE_LABELS,
  EVIDENCE_PRESENCES,
  validateForSubmit,
  type EvidencePresence,
  type ImpactLevel,
  type Submission,
} from '@evidence/shared';
import { saveSubmission } from '../repositories/submissions.js';
import { listDepartments } from '../repositories/departments.js';
import { getEffectivePolicy } from './policy.js';
import { getObjectBytes, getObjectText } from '../storage/objects.js';
import { id, nowIso } from '../lib/util.js';

export interface ImportRowResult {
  row: number;
  ok: boolean;
  message?: string;
  submissionId?: string;
  title?: string;
}
export interface ImportResult {
  total: number;
  created: number;
  failed: number;
  dryRun: boolean;
  results: ImportRowResult[];
}

/** ヘッダ表記 → 内部フィールド名 */
const HEADER_MAP: Record<string, string> = {
  部署ID: 'departmentId',
  部署: 'departmentName',
  氏名: 'userName',
  社員ID: 'userId',
  ユーザーID: 'userId',
  テーマ名: 'title',
  達成内容: 'achievementText',
  影響度: 'impact',
  貢献度: 'contribution',
  証跡有無: 'evidence',
  証跡なし理由: 'noEvidenceReason',
  補足: 'supplementary',
  補足コメント: 'supplementary',
};

const PRESENCE_BY_LABEL = new Map<string, EvidencePresence>(
  EVIDENCE_PRESENCES.map((k) => [EVIDENCE_PRESENCE_LABELS[k], k]),
);

type Row = Record<string, string>;

// ── パーサ ──────────────────────────────────────────────────
function rowsFromHeaders(header: string[], dataRows: string[][]): Row[] {
  const fields = header.map((h) => HEADER_MAP[h.trim()] ?? h.trim());
  return dataRows.map((cells) => {
    const r: Row = {};
    fields.forEach((f, i) => {
      r[f] = (cells[i] ?? '').toString().trim();
    });
    return r;
  });
}

async function parseXlsx(bytes: Uint8Array): Promise<Row[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(Buffer.from(bytes) as never);
  const sheet = wb.worksheets[0];
  if (!sheet) return [];
  const matrix: string[][] = [];
  sheet.eachRow((row) => {
    const values = Array.isArray(row.values) ? row.values.slice(1) : [];
    matrix.push(values.map((v) => cellToText(v)));
  });
  if (matrix.length < 1) return [];
  const [header, ...data] = matrix;
  return rowsFromHeaders(header!, data);
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

/** 簡易CSVパーサ（ダブルクオート対応） */
function parseCsv(text: string): Row[] {
  const stripped = text.replace(/^﻿/, '');
  const records: string[][] = [];
  let field = '';
  let record: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < stripped.length; i++) {
    const c = stripped[i];
    if (inQuotes) {
      if (c === '"') {
        if (stripped[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') {
      record.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && stripped[i + 1] === '\n') i++;
      record.push(field);
      records.push(record);
      field = '';
      record = [];
    } else field += c;
  }
  if (field.length || record.length) {
    record.push(field);
    records.push(record);
  }
  const nonEmpty = records.filter((r) => r.some((c) => c.trim() !== ''));
  if (nonEmpty.length < 1) return [];
  const [header, ...data] = nonEmpty;
  return rowsFromHeaders(header!, data);
}

// ── 行 → Submission ─────────────────────────────────────────
function parseLevel(v: string): ImpactLevel | null | 'invalid' {
  if (!v) return null;
  const n = Number(v);
  if (Number.isInteger(n) && n >= 1 && n <= 5) return n as ImpactLevel;
  return 'invalid';
}

function resolvePresence(v: string): EvidencePresence {
  if (!v) return 'NONE';
  if ((EVIDENCE_PRESENCES as readonly string[]).includes(v)) return v as EvidencePresence;
  return PRESENCE_BY_LABEL.get(v) ?? 'OTHER';
}

function buildSubmission(
  r: Row,
  ctx: { fiscalYear: string; deptByName: Map<string, string>; deptIds: Set<string>; index: number },
): { submission?: Submission; error?: string } {
  if (!r.title?.trim()) return { error: 'テーマ名が空です' };

  let departmentId = r.departmentId?.trim() ?? '';
  if (!departmentId && r.departmentName) {
    departmentId = ctx.deptByName.get(r.departmentName.trim()) ?? '';
  }
  if (!departmentId) return { error: '部署ID（または既知の部署名）が必要です' };
  if (!ctx.deptIds.has(departmentId))
    return { error: `部署ID '${departmentId}' がマスタに存在しません` };

  const impact = parseLevel(r.impact ?? '');
  if (impact === 'invalid') return { error: '影響度は 1〜5 で指定してください' };
  const contribution = parseLevel(r.contribution ?? '');
  if (contribution === 'invalid') return { error: '貢献度は 1〜5 で指定してください' };

  const presence = resolvePresence(r.evidence ?? '');
  const now = nowIso();
  const userId = r.userId?.trim() || `imp-${ctx.fiscalYear}-${ctx.index}`;

  const submission: Submission = {
    submissionId: id('sub'),
    fiscalYear: ctx.fiscalYear,
    userId,
    departmentId,
    userName: r.userName?.trim() || userId,
    title: r.title.trim(),
    achievementText: r.achievementText?.trim() ?? '',
    impactLevelSelf: impact,
    impactReason: '',
    contributionLevelSelf: contribution,
    contributionReason: '',
    evidencePresence: presence,
    hasEvidence: presence === 'AVAILABLE',
    noEvidenceReason: r.noEvidenceReason?.trim() ?? '',
    supplementaryComment: r.supplementary?.trim() ?? '',
    status: 'submitted', // 取込は記録済み成果として登録
    reviewComment: '',
    createdAt: now,
    updatedAt: now,
    submittedAt: now,
    approvedAt: null,
    approverId: null,
    deletedAt: null,
  };
  return { submission };
}

export async function importSubmissions(opts: {
  fiscalYear: string;
  s3Key: string;
  dryRun: boolean;
}): Promise<ImportResult> {
  const ext = opts.s3Key.split('.').pop()?.toLowerCase() ?? '';
  let rows: Row[] = [];
  if (ext === 'xlsx') {
    const bytes = await getObjectBytes(opts.s3Key);
    if (bytes) rows = await parseXlsx(bytes);
  } else if (ext === 'csv') {
    const text = await getObjectText(opts.s3Key);
    if (text) rows = parseCsv(text);
  } else {
    throw new Error('対応形式は xlsx / csv です');
  }

  const [departments, eff] = await Promise.all([
    listDepartments(opts.fiscalYear),
    getEffectivePolicy(opts.fiscalYear),
  ]);
  const deptByName = new Map(departments.map((d) => [d.name, d.departmentId]));
  const deptIds = new Set(departments.map((d) => d.departmentId));

  const results: ImportRowResult[] = [];
  let created = 0;
  for (let i = 0; i < rows.length; i++) {
    const rowNo = i + 2; // ヘッダ=1行目
    const { submission, error } = buildSubmission(rows[i]!, {
      fiscalYear: opts.fiscalYear,
      deptByName,
      deptIds,
      index: i + 1,
    });
    if (error || !submission) {
      results.push({ row: rowNo, ok: false, message: error });
      continue;
    }
    // 運用モード連動の提出バリデーション（Strict は不完全行をブロック＝通常フローと整合）
    const check = validateForSubmit(submission, eff.policy);
    if (check.blocked) {
      results.push({ row: rowNo, ok: false, message: check.problems.map((p) => p.message).join(' / ') });
      continue;
    }
    if (!opts.dryRun) await saveSubmission(submission);
    created += opts.dryRun ? 0 : 1;
    results.push({ row: rowNo, ok: true, submissionId: submission.submissionId, title: submission.title });
  }

  return {
    total: rows.length,
    created,
    failed: results.filter((r) => !r.ok).length,
    dryRun: opts.dryRun,
    results,
  };
}
