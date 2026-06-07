/**
 * 依存ライブラリ無しの SVG バブルチャート。
 * 軸は AxisScale（対数スケール対応）で駆動：X=必要経費(¥) / Y=展開性(到達数)。
 * バブル面積が事業価値に比例（半径 ∝ √value）。クリックで選択（Plotly 風の詳細表示）。
 */
import type { AxisScale, BubblePoint } from '@/routes/bi/bi-config';

interface Props {
  points: BubblePoint[];
  colorFor: (domainKey: string) => string;
  xAxis: AxisScale;
  yAxis: AxisScale;
  quadrants?: { topLeft: string; topRight: string; bottomLeft: string; bottomRight: string };
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}

const W = 760;
const H = 500;
const PAD = { l: 78, r: 24, t: 24, b: 56 };
const plotW = W - PAD.l - PAD.r;
const plotH = H - PAD.t - PAD.b;

/** 対数スケールで 0..1 の正規化位置を返す */
function norm(a: AxisScale, v: number): number {
  const lmin = Math.log10(a.min);
  const lmax = Math.log10(a.max);
  const lv = Math.log10(Math.min(a.max, Math.max(a.min, v)));
  return (lv - lmin) / (lmax - lmin);
}

export function BubbleChart({
  points,
  colorFor,
  xAxis,
  yAxis,
  quadrants,
  selectedId,
  onSelect,
}: Props) {
  const sx = (v: number) => PAD.l + norm(xAxis, v) * plotW;
  const sy = (v: number) => PAD.t + (1 - norm(yAxis, v)) * plotH;

  const maxValue = Math.max(1, ...points.map((p) => p.value));
  const rMin = 7;
  const rMax = 34;
  const radius = (v: number) => rMin + (rMax - rMin) * Math.sqrt(v / maxValue);

  const midX = PAD.l + plotW / 2;
  const midY = PAD.t + plotH / 2;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="事業価値バブルチャート">
      <rect x={PAD.l} y={PAD.t} width={plotW} height={plotH} fill="hsl(210 40% 99%)" stroke="hsl(214 32% 88%)" />

      {/* X グリッド + 目盛（対数） */}
      {xAxis.ticks.map((t) => (
        <g key={`gx${t}`}>
          <line x1={sx(t)} y1={PAD.t} x2={sx(t)} y2={PAD.t + plotH} stroke="hsl(214 32% 92%)" />
          <text x={sx(t)} y={PAD.t + plotH + 16} fontSize="10" textAnchor="middle" fill="hsl(215 16% 47%)">
            {xAxis.format(t)}
          </text>
        </g>
      ))}
      {/* Y グリッド + 目盛（対数） */}
      {yAxis.ticks.map((t) => (
        <g key={`gy${t}`}>
          <line x1={PAD.l} y1={sy(t)} x2={PAD.l + plotW} y2={sy(t)} stroke="hsl(214 32% 92%)" />
          <text x={PAD.l - 8} y={sy(t) + 3} fontSize="10" textAnchor="end" fill="hsl(215 16% 47%)">
            {yAxis.format(t)}
          </text>
        </g>
      ))}

      {/* 中央の象限分割線（幾何中央） */}
      <line x1={midX} y1={PAD.t} x2={midX} y2={PAD.t + plotH} stroke="hsl(214 32% 80%)" strokeDasharray="4 4" />
      <line x1={PAD.l} y1={midY} x2={PAD.l + plotW} y2={midY} stroke="hsl(214 32% 80%)" strokeDasharray="4 4" />

      {quadrants && (
        <g fontSize="10" fill="hsl(215 16% 60%)">
          <text x={PAD.l + 4} y={PAD.t + 14}>{quadrants.topLeft}</text>
          <text x={PAD.l + plotW - 4} y={PAD.t + 14} textAnchor="end">{quadrants.topRight}</text>
          <text x={PAD.l + 4} y={PAD.t + plotH - 6}>{quadrants.bottomLeft}</text>
          <text x={PAD.l + plotW - 4} y={PAD.t + plotH - 6} textAnchor="end">{quadrants.bottomRight}</text>
        </g>
      )}

      {/* バブル（クリックで選択） */}
      {points.map((p) => {
        const c = colorFor(p.domainKey);
        const r = radius(p.value);
        const selected = p.id === selectedId;
        return (
          <g key={p.id} onClick={() => onSelect?.(p.id)} style={{ cursor: onSelect ? 'pointer' : 'default' }}>
            {selected && (
              <circle cx={sx(p.xValue)} cy={sy(p.yValue)} r={r + 5} fill="none" stroke={c} strokeWidth={2} strokeDasharray="3 3" />
            )}
            <circle
              cx={sx(p.xValue)}
              cy={sy(p.yValue)}
              r={r}
              fill={c}
              fillOpacity={selected ? 0.75 : 0.5}
              stroke={c}
              strokeWidth={selected ? 2.5 : 1.5}
            >
              <title>{`${p.label}\n${p.domainLabel}\n必要経費=${xAxis.format(p.xValue)} / 展開性=${yAxis.format(p.yValue)} / 事業価値=${p.value}\n${p.detail}`}</title>
            </circle>
            {/* 中心の白点＝証跡あり（証跡→JSON→BI の可視化） */}
            {p.hasEvidence && (
              <circle cx={sx(p.xValue)} cy={sy(p.yValue)} r={3} fill="#ffffff" stroke={c} strokeWidth={1} />
            )}
            <text x={sx(p.xValue)} y={sy(p.yValue) - r - 3} fontSize="9" textAnchor="middle" fill="hsl(222 47% 31%)">
              {p.label.length > 14 ? p.label.slice(0, 13) + '…' : p.label}
            </text>
          </g>
        );
      })}

      {/* 軸タイトル */}
      <text x={PAD.l + plotW / 2} y={H - 8} fontSize="12" textAnchor="middle" fill="hsl(222 47% 31%)">
        {xAxis.label}
      </text>
      <text x={16} y={PAD.t + plotH / 2} fontSize="12" textAnchor="middle" fill="hsl(222 47% 31%)" transform={`rotate(-90 16 ${PAD.t + plotH / 2})`}>
        {yAxis.label}
      </text>
    </svg>
  );
}
