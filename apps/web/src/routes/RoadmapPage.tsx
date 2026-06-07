/**
 * ロードマップ／マイルストーン（管理用）。
 * 「これが出来ているか・成果物がどうか」を一覧し、各マイルストーンへジャンプできる。
 * 定義は routes/roadmap/roadmap-config.ts。
 */
import { ROADMAP, STATUS_LABEL, type MilestoneStatus } from '@/routes/roadmap/roadmap-config';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

function statusVariant(s: MilestoneStatus): 'success' | 'default' | 'muted' {
  return s === 'done' ? 'success' : s === 'in_progress' ? 'default' : 'muted';
}

function jumpTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function RoadmapPage() {
  const allDeliv = ROADMAP.flatMap((m) => m.deliverables);
  const doneCount = allDeliv.filter((d) => d.done).length;
  const pct = allDeliv.length ? Math.round((doneCount / allDeliv.length) * 100) : 0;
  const msDone = ROADMAP.filter((m) => m.status === 'done').length;

  return (
    <div>
      <PageHeader
        title="ロードマップ / マイルストーン"
        description={`成果物 ${doneCount}/${allDeliv.length}（${pct}%）完了 ・ マイルストーン ${msDone}/${ROADMAP.length} 完了`}
      />

      {/* 進捗バー */}
      <Card className="mb-4">
        <CardContent className="py-4">
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
          </div>
        </CardContent>
      </Card>

      {/* マイルストーンへジャンプ */}
      <Card className="mb-4">
        <CardContent className="flex flex-wrap gap-2 py-4">
          {ROADMAP.map((m) => (
            <Button key={m.id} variant="outline" size="sm" onClick={() => jumpTo(m.id)}>
              <span
                className={
                  'mr-1.5 inline-block h-2 w-2 rounded-full ' +
                  (m.status === 'done'
                    ? 'bg-emerald-500'
                    : m.status === 'in_progress'
                      ? 'bg-blue-500'
                      : 'bg-slate-300')
                }
              />
              {m.title}
            </Button>
          ))}
        </CardContent>
      </Card>

      {/* マイルストーン詳細（縦並び・各成果物の達成状況） */}
      <div className="space-y-4">
        {ROADMAP.map((m) => {
          const done = m.deliverables.filter((d) => d.done).length;
          return (
            <Card key={m.id} id={m.id} className="scroll-mt-20">
              <CardContent className="py-5">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <h3 className="font-semibold">{m.title}</h3>
                  <div className="flex items-center gap-2">
                    {m.period && <span className="text-xs text-muted-foreground">{m.period}</span>}
                    <Badge variant={statusVariant(m.status)}>{STATUS_LABEL[m.status]}</Badge>
                  </div>
                </div>
                <p className="mb-3 text-sm text-muted-foreground">{m.summary}</p>
                <div className="mb-2 text-xs text-muted-foreground">
                  成果物 {done}/{m.deliverables.length}
                </div>
                <ul className="space-y-1.5">
                  {m.deliverables.map((d, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className={d.done ? 'text-emerald-600' : 'text-muted-foreground'}>
                        {d.done ? '☑' : '☐'}
                      </span>
                      <span className={d.done ? '' : 'text-muted-foreground'}>{d.label}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
