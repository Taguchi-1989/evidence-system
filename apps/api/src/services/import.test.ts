import { describe, expect, it } from 'vitest';
import { parseCsv } from './import.js';

describe('parseCsv', () => {
  it('ヘッダを内部フィールド名にマッピングする', () => {
    const rows = parseCsv('テーマ名,達成内容\nA,B\n');
    expect(rows).toEqual([{ title: 'A', achievementText: 'B' }]);
  });

  it('BOM 付き CSV を処理できる', () => {
    const rows = parseCsv('﻿テーマ名\nA\n');
    expect(rows).toEqual([{ title: 'A' }]);
  });

  it('クオート内のカンマ・改行・エスケープされた引用符を扱える', () => {
    const rows = parseCsv('テーマ名,達成内容\n"a,b","line1\nline2 ""quoted"""\n');
    expect(rows).toEqual([{ title: 'a,b', achievementText: 'line1\nline2 "quoted"' }]);
  });

  it('CRLF 改行を扱える', () => {
    const rows = parseCsv('テーマ名,達成内容\r\nA,B\r\nC,D\r\n');
    expect(rows).toHaveLength(2);
    expect(rows[1]).toEqual({ title: 'C', achievementText: 'D' });
  });

  it('空行・末尾改行を無視する', () => {
    const rows = parseCsv('テーマ名\nA\n\n , \nB\n\n');
    expect(rows.map((r) => r.title)).toEqual(['A', 'B']);
  });

  it('列数が足りない行は空文字で埋める', () => {
    const rows = parseCsv('テーマ名,達成内容\nA\n');
    expect(rows).toEqual([{ title: 'A', achievementText: '' }]);
  });

  it('未知のヘッダはそのままのキーで保持する', () => {
    const rows = parseCsv('テーマ名,メモ\nA,x\n');
    expect(rows).toEqual([{ title: 'A', メモ: 'x' }]);
  });

  it('空文字列は空配列を返す', () => {
    expect(parseCsv('')).toEqual([]);
  });
});
