/**
 * BI ダッシュボード：成果ポートフォリオのバブルチャート。
 * X=必要経費 / Y=展開性 / サイズ=事業価値 / 色=領域(部署)。マッピングは routes/bi/bi-config.ts。
 */
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Submission } from '@evidence/shared';
import { endpoints } from '@/lib/endpoints';
import { DEFAULT_FISCAL_YEAR } from '@/lib/constants';
import { PageHeader } from '@/components/PageHeader';
import { BubbleChart } from '@/components/BubbleChart';
import { BubbleDetail } from '@/components/BubbleDetail';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AXIS, DOMAIN_PALETTE, QUADRANTS, toBubble } from '@/routes/bi/bi-config';

export function BiDashboardPage() {
  const { data: subData, isLoading } = useQuery({
    queryKey: ['submissions', 'all', DEFAULT_FISCAL_YEAR, 'bi'],
    queryFn: () => endpoints.listSubmissions({ scope: 'all', fiscalYear: DEFAULT_FISCAL_YEAR }),
  });
  const { data: masters } = useQuery({
    queryKey: ['masters', DEFAULT_FISCAL_YEAR],
    queryFn: () => endpoints.masters(DEFAULT_FISCAL_YEAR),
  });

  const deptName = useMemo(() => {
    const map = new Map((masters?.departments ?? []).map((d) => [d.departmentId, d.name]));
    return (id: string) => map.get(id) ?? id;
  }, [masters]);

  const submissions = subData?.items ?? [];
  const points = useMemo(
    () => submissions.map((s) => toBubble(s, deptName)),
    [submissions, deptName],
  );
  const subMap = useMemo(() => {
    const m = new Map<string, Submission>();
    for (const s of submissions) m.set(s.submissionId, s);
    return m;
  }, [submissions]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = selectedId ? subMap.get(selectedId) : undefined;

  // 領域(部署)→色 を安定割当
  const colorMap = useMemo(() => {
    const keys = [...new Set(points.map((p) => p.domainKey))].sort();
    const m = new Map<string, string>();
    keys.forEach((k, i) => m.set(k, DOMAIN_PALETTE[i % DOMAIN_PALETTE.length]!));
    return m;
  }, [points]);
  const colorFor = (k: string) => colorMap.get(k) ?? '#64748b';

  const legend = useMemo(() => {
    const seen = new Map<string, string>();
    for (const p of points) if (!seen.has(p.domainKey)) seen.set(p.domainKey, p.domainLabel);
    return [...seen.entries()];
  }, [points]);

  return (
    <div>
      <PageHeader
        title="BI ダッシュボード（成果ポートフォリオ）"
        description="必要経費×展開性で配置し、バブルの大きさ＝事業価値、色＝領域（部署）で俯瞰します。"
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* チャート（左 2/3） */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">
              {AXIS.sizeLabel} ／ {AXIS.colorLabel}（バブルをクリックで詳細）
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">読み込み中...</p>
            ) : points.length === 0 ? (
              <p className="p-8 text-center text-sm text-muted-foreground">対象データがありません。</p>
            ) : (
              <>
                <BubbleChart
                  points={points}
                  colorFor={colorFor}
                  xLabel={AXIS.xLabel}
                  yLabel={AXIS.yLabel}
                  quadrants={QUADRANTS}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                />
                {/* 凡例（領域＝色） */}
                <div className="mt-3 flex flex-wrap gap-3">
                  {legend.map(([key, label]) => (
                    <span key={key} className="flex items-center gap-1.5 text-xs">
                      <span
                        className="inline-block h-3 w-3 rounded-full"
                        style={{ backgroundColor: colorFor(key) }}
                      />
                      {label}
                    </span>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* 詳細パネル（右 1/3） */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm">詳細</CardTitle>
          </CardHeader>
          <CardContent>
            {selected ? (
              <BubbleDetail submission={selected} deptName={deptName} />
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                バブルをクリックすると、成果の詳細（経費・一回性・効果・リードタイム・成果発現時期など）が表示されます。
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardContent className="py-4 text-xs leading-relaxed text-muted-foreground">
          <p className="mb-1 font-medium text-foreground">象限の読み方</p>
          <ul className="grid gap-1 sm:grid-cols-2">
            <li>左上：{QUADRANTS.topLeft}</li>
            <li>右上：{QUADRANTS.topRight}</li>
            <li>左下：{QUADRANTS.bottomLeft}</li>
            <li>右下：{QUADRANTS.bottomRight}</li>
          </ul>
          <p className="mt-2">
            ※ 必要経費・事業価値は専用項目が未整備のため、現状は影響度・貢献度から自動推定して表示しています
            （実データ項目を追加したら <code>routes/bi/bi-config.ts</code> を差し替え）。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
