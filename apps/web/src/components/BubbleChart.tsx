/**
 * 依存ライブラリ無しの SVG バブルチャート（X=必要経費 / Y=展開性 / サイズ=事業価値 / 色=領域）。
 * 軸は 0–100 固定。バブル面積が事業価値に比例（半径 ∝ √value）。
 * 編集しやすいよう純粋な SVG のみで構成（GitHub Copilot で調整可能）。
 */
import type { BubblePoint } from '@/routes/bi/bi-config';

interface Props {
  points: BubblePoint[];
  colorFor: (domainKey: string) => string;
  xLabel: string;
  yLabel: string;
  quadrants?: { topLeft: string; topRight: string; bottomLeft: string; bottomRight: string };
}

const W = 760;
const H = 500;
const PAD = { l: 64, r: 24, t: 24, b: 56 };
const plotW = W - PAD.l - PAD.r;
const plotH = H - PAD.t - PAD.b;

const sx = (v: number) => PAD.l + (v / 100) * plotW;
const sy = (v: number) => PAD.t + (1 - v / 100) * plotH; // 上が大きい
const TICKS = [0, 25, 50, 75, 100];

export function BubbleChart({ points, colorFor, xLabel, yLabel, quadrants }: Props) {
  const maxValue = Math.max(1, ...points.map((p) => p.value));
  const rMin = 7;
  const rMax = 34;
  const radius = (v: number) => rMin + (rMax - rMin) * Math.sqrt(v / maxValue);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="事業価値バブルチャート">
      {/* プロット枠 */}
      <rect x={PAD.l} y={PAD.t} width={plotW} height={plotH} fill="hsl(210 40% 99%)" stroke="hsl(214 32% 88%)" />

      {/* グリッド + 目盛 */}
      {TICKS.map((t) => (
        <g key={`gx${t}`}>
          <line x1={sx(t)} y1={PAD.t} x2={sx(t)} y2={PAD.t + plotH} stroke="hsl(214 32% 92%)" />
          <text x={sx(t)} y={PAD.t + plotH + 16} fontSize="10" textAnchor="middle" fill="hsl(215 16% 47%)">
            {t}
          </text>
        </g>
      ))}
      {TICKS.map((t) => (
        <g key={`gy${t}`}>
          <line x1={PAD.l} y1={sy(t)} x2={PAD.l + plotW} y2={sy(t)} stroke="hsl(214 32% 92%)" />
          <text x={PAD.l - 8} y={sy(t) + 3} fontSize="10" textAnchor="end" fill="hsl(215 16% 47%)">
            {t}
          </text>
        </g>
      ))}

      {/* 中央の象限分割線 */}
      <line x1={sx(50)} y1={PAD.t} x2={sx(50)} y2={PAD.t + plotH} stroke="hsl(214 32% 80%)" strokeDasharray="4 4" />
      <line x1={PAD.l} y1={sy(50)} x2={PAD.l + plotW} y2={sy(50)} stroke="hsl(214 32% 80%)" strokeDasharray="4 4" />

      {/* 象限ラベル */}
      {quadrants && (
        <g fontSize="10" fill="hsl(215 16% 60%)">
          <text x={sx(2)} y={sy(98) + 4}>{quadrants.topLeft}</text>
          <text x={sx(98)} y={sy(98) + 4} textAnchor="end">{quadrants.topRight}</text>
          <text x={sx(2)} y={sy(2)}>{quadrants.bottomLeft}</text>
          <text x={sx(98)} y={sy(2)} textAnchor="end">{quadrants.bottomRight}</text>
        </g>
      )}

      {/* バブル */}
      {points.map((p) => {
        const c = colorFor(p.domainKey);
        return (
          <g key={p.id}>
            <circle cx={sx(p.xValue)} cy={sy(p.yValue)} r={radius(p.value)} fill={c} fillOpacity={0.5} stroke={c} strokeWidth={1.5}>
              <title>{`${p.label}\n${p.domainLabel}\n必要経費=${p.xValue} / 展開性=${p.yValue} / 事業価値=${p.value}\n${p.detail}`}</title>
            </circle>
            <text x={sx(p.xValue)} y={sy(p.yValue) - radius(p.value) - 3} fontSize="9" textAnchor="middle" fill="hsl(222 47% 31%)">
              {p.label.length > 14 ? p.label.slice(0, 13) + '…' : p.label}
            </text>
          </g>
        );
      })}

      {/* 軸タイトル */}
      <text x={PAD.l + plotW / 2} y={H - 8} fontSize="12" textAnchor="middle" fill="hsl(222 47% 31%)">
        {xLabel}
      </text>
      <text x={16} y={PAD.t + plotH / 2} fontSize="12" textAnchor="middle" fill="hsl(222 47% 31%)" transform={`rotate(-90 16 ${PAD.t + plotH / 2})`}>
        {yLabel}
      </text>
    </svg>
  );
}
