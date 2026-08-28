"use client";

import Link from "next/link";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { AnalysisData } from "@/lib/analysis";
import { cn } from "@/lib/cn";

const RANGES = [
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "year", label: "Year" },
] as const;

export function AnalysisView({
  data,
  basePath = "/analysis",
}: {
  data: AnalysisData;
  /** where the range tabs link — "/analysis" for self, "/leader/<id>" for a student */
  basePath?: string;
}) {
  const { range, chart, chartMax, chartCaption, summary, streak } = data;
  const hasData = chart.some((p) => p.value > 0);

  return (
    <div className="mt-4 space-y-4">
      <div className="flex gap-2">
        {RANGES.map((r) => (
          <Link
            key={r.key}
            href={`${basePath}?r=${r.key}`}
            scroll={false}
            className={cn(
              "tap rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              range === r.key
                ? "bg-primary text-primary-fg shadow-sm"
                : "border border-border bg-surface text-muted",
            )}
          >
            {r.label}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Total" value={`${summary.total}`} sub={`/ ${summary.max}`} />
        <Stat label="Avg / day" value={`${summary.average}`} sub="/ 200" />
        <Stat label="Days filled" value={`${summary.daysFilled}`} />
        <Stat label="Streak" value={`${streak}`} sub="days" />
      </div>

      <div className="card p-4">
        <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
          {chartCaption}
        </div>
        {hasData ? (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chart} margin={{ top: 6, right: 10, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="score-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: "var(--muted)" }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                  minTickGap={16}
                />
                <YAxis
                  domain={[0, chartMax]}
                  ticks={[0, chartMax / 4, chartMax / 2, (chartMax * 3) / 4, chartMax]}
                  tick={{ fontSize: 10, fill: "var(--muted)" }}
                  tickLine={false}
                  axisLine={false}
                  width={30}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "var(--muted)" }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  name="score"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  fill="url(#score-fill)"
                  dot={{ r: 2.5, fill: "var(--primary)" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="py-12 text-center text-sm text-muted">Nothing submitted in this range yet.</p>
        )}
      </div>

      <div className="card grid grid-cols-2 gap-4 p-4 text-sm">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted">Best day</div>
          <div className="mt-1 font-medium">
            {summary.bestDay ? `${summary.bestDay.date} · ${summary.bestDay.score}` : "—"}
          </div>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted">
            Mangal aratis
          </div>
          <div className="mt-1 font-medium">{summary.mangalAratis}</div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card p-3.5">
      <div className="text-lg font-semibold">
        {value} {sub ? <span className="text-xs font-normal text-muted">{sub}</span> : null}
      </div>
      <div className="mt-0.5 text-[11px] text-muted">{label}</div>
    </div>
  );
}
