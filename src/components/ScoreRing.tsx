import { cn } from "@/lib/cn";

export function ScoreRing({
  value,
  max,
  size = 96,
  label,
}: {
  value: number;
  max: number;
  size?: number;
  label?: string;
}) {
  const pct = max ? Math.min(1, value / max) : 0;
  const r = size / 2 - 6;
  const c = 2 * Math.PI * r;
  const tone = pct >= 0.8 ? "var(--good)" : pct >= 0.5 ? "var(--primary)" : "var(--warn)";

  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={6} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={tone}
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
        />
      </svg>
      <div className="absolute text-center leading-tight">
        <div className={cn("font-bold", size > 80 ? "text-xl" : "text-base")}>{value}</div>
        <div className="text-[10px] text-muted">/ {max}</div>
      </div>
      {label ? <span className="sr-only">{label}</span> : null}
    </div>
  );
}
