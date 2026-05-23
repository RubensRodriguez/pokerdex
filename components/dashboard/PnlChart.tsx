"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatEurDelta } from "@/lib/utils";

interface PnlChartProps {
  points: Array<{ date: string; cumulative: number }>;
}

function formatDateTick(dateStr: string): string {
  const [, m, d] = dateStr.split("-");
  return `${d}/${m}`;
}

const GOLD = "#d4b056";
const MUTED = "#6e6d68";
const GRID = "#1c1c20";

export function PnlChart({ points }: PnlChartProps) {
  const allZero = points.every((p) => p.cumulative === 0);

  return (
    <div className="space-y-3">
      <p className="font-mono text-[10px] font-medium tracking-[0.11em] uppercase text-muted">
        30D · Net P&amp;L
      </p>
      <div className="h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="pnlGoldGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={GOLD} stopOpacity={0.18} />
                <stop offset="100%" stopColor={GOLD} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={formatDateTick}
              tick={{ fill: MUTED, fontFamily: "var(--font-mono)", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tickFormatter={formatEurDelta}
              tick={{ fill: MUTED, fontFamily: "var(--font-mono)", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={72}
            />
            <Tooltip
              formatter={(value) => [formatEurDelta(Number(value ?? 0)), "P&L"]}
              labelFormatter={(label) => formatDateTick(String(label))}
              contentStyle={{
                background: "#0a0a0c",
                border: "1px solid #1c1c20",
                borderRadius: 8,
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                color: "#ececeb",
              }}
              cursor={{ stroke: GOLD, strokeWidth: 1, strokeDasharray: "3 3" }}
            />
            <Area
              type="monotone"
              dataKey="cumulative"
              stroke={GOLD}
              strokeWidth={1.5}
              fill="url(#pnlGoldGradient)"
              dot={false}
              activeDot={{ r: 3, fill: GOLD, stroke: GOLD }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      {allZero && (
        <p className="text-[11px] text-muted">
          Nessun aggiornamento nel periodo. Il grafico mostrerà i dati una volta registrato un
          aggiornamento.
        </p>
      )}
    </div>
  );
}
