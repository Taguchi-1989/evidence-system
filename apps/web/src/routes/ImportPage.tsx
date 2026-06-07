/** Excel/CSV 一括取込（事務局・管理者）。presign→直PUT→取込。ドライランで事前検証。 */
import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { endpoints, type ImportResult } from '@/lib/endpoints';
import { putToPresignedUrl } from '@/lib/api';
import { DEFAULT_FISCAL_YEAR } from '@/lib/constants';
import { useToast } from '@/components/ui/toast';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';

const HEADERS = ['部署ID', '氏名', 'テーマ名', '達成内容', '影響度', '貢献度', '証跡有無', '証跡なし理由', '補足'];

function downloadTemplate() {
  const example = ['dept-002', '山田 太郎', '月次レポート自動化', '集計を自動化し時間短縮', '3', '4', '資料あり', '', ''];
  const csv = '﻿' + [HEADERS.join(','), example.join(',')].join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'import-template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export function ImportPage() {
  const { notify } = useToast();
  const qc = useQueryClient();
  const [file, setFile] = React.useState<File | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [result, setResult] = React.useState<ImportResult | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const run = async (dryRun: boolean) => {
    if (!file) return;
    setBusy(true);
    try {
      const presign = await endpoints.importPresign({
        fileName: file.name,
        contentType: file.type || 'application/octet-stream',
        fileSize: file.size,
      });
      await putToPresignedUrl(presign.uploadUrl, file);
      const res = await endpoints.runImport({
        fiscalYear: DEFAULT_FISCAL_YEAR,
        s3Key: presign.s3Key,
        dryRun,
      });
      setResult(res);
      if (!dryRun) {
        notify(`取込完了：新規 ${res.created} / 更新 ${res.updated} / エラー ${res.failed}`);
        void qc.invalidateQueries({ queryKey: ['submissions'] });
        void qc.invalidateQueries({ queryKey: ['stats', DEFAULT_FISCAL_YEAR] });
      } else {
        notify(`検証完了：${res.total - res.failed} 件OK / ${res.failed} 件エラー`);
      }
    } catch (e) {
      notify(e instanceof Error ? e.message : 'エラーが発生しました', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="一括取込（Excel / CSV）"
        description="過去の成果などをまとめて登録します。まず検証（ドライラン）→ 問題なければ取込実行。"
        actions={
          <Button variant="outline" size="sm" onClick={downloadTemplate}>
            テンプレート(CSV)
          </Button>
        }
      />

      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-sm">ファイルを選択</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.csv"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setResult(null);
            }}
            className="text-sm"
          />
          <p className="text-xs text-muted-foreground">
            列：{HEADERS.join(' / ')}（先頭行はヘッダ）。影響度・貢献度は 1〜5、証跡有無はラベルかキー。
          </p>
          <div className="flex gap-2">
            <Button variant="outline" disabled={!file || busy} onClick={() => void run(true)}>
              検証（ドライラン）
            </Button>
            <Button disabled={!file || busy || !result || result.dryRun === false} onClick={() => void run(false)}>
              取込を実行
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            ※ 先に「検証」を実行してください。エラーが無ければ「取込を実行」が押せます。
          </p>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              {result.dryRun ? '検証結果' : '取込結果'}：
              <span className="ml-2">
                全 {result.total} 行 ・ OK {result.total - result.failed} ・ エラー {result.failed}
                {!result.dryRun && ` ・ 新規 ${result.created} / 更新 ${result.updated}`}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <THead>
                <TR>
                  <TH>行</TH>
                  <TH>状態</TH>
                  <TH>内容</TH>
                </TR>
              </THead>
              <TBody>
                {result.results.map((r) => (
                  <TR key={r.row}>
                    <TD className="w-12">{r.row}</TD>
                    <TD>
                      <Badge variant={r.ok ? 'success' : 'destructive'}>{r.ok ? 'OK' : 'エラー'}</Badge>
                    </TD>
                    <TD className="text-xs">{r.ok ? r.title : r.message}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
