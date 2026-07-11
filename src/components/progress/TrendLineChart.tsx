"use client";

import { useId } from "react";

interface TrendLineChartProps {
  title: string;
  points: { label: string; value: number | null }[];
  maxValue?: number;
  unit?: string;
  emptyMessage?: string;
}

/** A small single-series trend line with direct end-labeling and an accessible text summary. */
export function TrendLineChart({ title, points, maxValue = 100, unit = "", emptyMessage }: TrendLineChartProps) {
  const gradientId = useId();
  const withData = points.filter((p) => p.value !== null) as { label: string; value: number }[];

  if (withData.length < 2) {
    return (
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="mt-1 text-xs text-foreground-muted">{emptyMessage ?? "Not enough data yet."}</p>
      </div>
    );
  }

  const width = 280;
  const height = 90;
  const paddingX = 8;
  const paddingY = 12;
  const stepX = (width - paddingX * 2) / (points.length - 1);

  const coords = points.map((p, i) => {
    const x = paddingX + i * stepX;
    if (p.value === null) return { x, y: null };
    const y = height - paddingY - (p.value / maxValue) * (height - paddingY * 2);
    return { x, y };
  });

  const validCoords = coords.filter((c): c is { x: number; y: number } => c.y !== null);
  const path = validCoords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
  const last = validCoords[validCoords.length - 1];
  const latestValue = points[points.length - 1].value;

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="text-xs text-foreground-muted">
          latest: {latestValue !== null ? `${Math.round(latestValue)}${unit}` : "—"}
        </span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="mt-2 w-full" role="img" aria-label={`${title} trend chart`}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.25} />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <path d={`${path} L${last.x},${height - paddingY} L${validCoords[0].x},${height - paddingY} Z`} fill={`url(#${gradientId})`} />
        <path d={path} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        {validCoords.map((c, i) => (
          <circle key={i} cx={c.x} cy={c.y} r={i === validCoords.length - 1 ? 4 : 3} fill="var(--accent)" />
        ))}
      </svg>
      <details className="mt-1">
        <summary className="cursor-pointer text-xs text-foreground-muted">View as table</summary>
        <table className="mt-2 w-full text-xs">
          <tbody>
            {points.map((p) => (
              <tr key={p.label} className="border-b border-border last:border-0">
                <td className="py-1 text-foreground-muted">{p.label}</td>
                <td className="py-1 text-right font-medium">{p.value !== null ? `${Math.round(p.value)}${unit}` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
