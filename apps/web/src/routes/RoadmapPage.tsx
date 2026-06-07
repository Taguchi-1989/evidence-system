/**
 * ロードマップ／マイルストーン（管理用）。
 * 「ざっくり（概要ボード）」と「詳細（成果物チェックリスト）」を切替可能。既定はざっくり。
 * 定義は routes/roadmap/roadmap-config.ts（管理者が中身を編集）。
 */
import { useState } from 'react';
import {
  ROADMAP,
  STATUS_LABEL,
  type Milestone,
  type MilestoneStatus,
} from '@/routes/roadmap/roadmap-config';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function statusVariant(s: MilestoneStatus): 'success' | 'default' | 'muted' {
  return s === 'done' ? 'success' : s === 'in_progress' ? 'default' : 'muted';
}
function jumpTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
const doneRatio = (m: Milestone) => `${m.deliverables.filter((d) => d.done).length}/${m.deliverables.length}`;

const STATUS_ORDER: MilestoneStatus[] = ['in_progress', 'planned', 'done'];

export function RoadmapPage() {
  const [view, setView] = useState<'overview' | 'detail'>('overview');

  const allDeliv = ROADMAP.flatMap((m) => m.deliverables);
  const doneCount = allDeliv.filter((d) => d.done).length;
  const pct = allDeliv.length ? Math.round((doneCount / allDeliv.length) * 100) : 0;
  const msDone = ROADMAP.filter((m) => m.status === 'done').length;

  return (
    <div>
      <PageHeader
        title="ロードマップ / マイルストーン"
        description={`マイルストーン ${msDone}/${ROADMAP.length} 完了 ・ 成果物 ${doneCount}/${allDeliv.length}（${pct}%）`}
        actions={
          <div className="flex rounded-md border p-0.5">
            <Button
              variant={view === 'overview' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView('overview')}
            >
              ざっくり
            </Button>
            <Button
              variant={view === 'detail' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView('detail')}
            >
              詳細
            </Button>
          </div>
        }
      />

      {/* 進捗バー（共通） */}
      <Card className="mb-4">
        <CardContent className="py-4">
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
          </div>
        </CardContent>
      </Card>

      {view === 'overview' ? <OverviewBoard /> : <DetailList />}
    </div>
  );
}

/** ざっくり：ステータス別の3カラム俯瞰ボード（成果物の詳細は出さない） */
function OverviewBoard() {
  const groups = STATUS_ORDER.map((status) => ({
    status,
    items: ROADMAP.filter((m) => m.status === status),
  }));
  const dot = (s: MilestoneStatus) =>
    s === 'done' ? 'bg-emerald-500' : s === 'in_progress' ? 'bg-blue-500' : 'bg-slate-300';

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {groups.map(({ status, items }) => (
        <div key={status}>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <span className={cn('inline-block h-2.5 w-2.5 rounded-full', dot(status))} />
            {STATUS_LABEL[status]}
            <span className="text-xs font-normal text-muted-foreground">({items.length})</span>
          </div>
          <div className="space-y-2">
            {items.map((m) => (
              <Card key={m.id}>
                <CardContent className="py-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium leading-snug">{m.title}</p>
                    <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      {doneRatio(m)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{m.summary}</p>
                </CardContent>
              </Card>
            ))}
            {items.length === 0 && <p className="text-xs text-muted-foreground">なし</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

/** 詳細：各マイルストーンの成果物チェックリスト + ジャンプ */
function DetailList() {
  const dot = (s: MilestoneStatus) =>
    s === 'done' ? 'bg-emerald-500' : s === 'in_progress' ? 'bg-blue-500' : 'bg-slate-300';
  return (
    <>
      <Card className="mb-4">
        <CardContent className="flex flex-wrap gap-2 py-4">
          {ROADMAP.map((m) => (
            <Button key={m.id} variant="outline" size="sm" onClick={() => jumpTo(m.id)}>
              <span className={cn('mr-1.5 inline-block h-2 w-2 rounded-full', dot(m.status))} />
              {m.title}
            </Button>
          ))}
        </CardContent>
      </Card>

      <div className="space-y-4">
        {ROADMAP.map((m) => (
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
              <div className="mb-2 text-xs text-muted-foreground">成果物 {doneRatio(m)}</div>
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
        ))}
      </div>
    </>
  );
}
