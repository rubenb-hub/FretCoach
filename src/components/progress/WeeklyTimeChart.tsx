import { formatMinutes } from "@/lib/utils/format";

interface WeeklyTimeChartProps {
  points: { label: string; totalSeconds: number }[];
}

export function WeeklyTimeChart({ points }: WeeklyTimeChartProps) {
  const max = Math.max(...points.map((p) => p.totalSeconds), 1);

  return (
    <div>
      <h3 className="text-sm font-semibold">Practice time per week</h3>
      <div
        className="mt-3 flex items-end gap-2"
        style={{ height: 96 }}
        role="img"
        aria-label={`Weekly practice time: ${points.map((p) => `${p.label} ${formatMinutes(p.totalSeconds)}`).join(", ")}`}
      >
        {points.map((p) => (
          <div key={p.label} className="flex flex-1 flex-col items-center gap-1">
            <div
              className="w-full max-w-6 rounded-t-md bg-primary"
              style={{ height: `${Math.max(4, (p.totalSeconds / max) * 72)}px` }}
            />
            <span className="text-[10px] text-foreground-muted">{p.label}</span>
          </div>
        ))}
      </div>
      <details className="mt-1">
        <summary className="cursor-pointer text-xs text-foreground-muted">View as table</summary>
        <table className="mt-2 w-full text-xs">
          <tbody>
            {points.map((p) => (
              <tr key={p.label} className="border-b border-border last:border-0">
                <td className="py-1 text-foreground-muted">{p.label}</td>
                <td className="py-1 text-right font-medium">{formatMinutes(p.totalSeconds)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
