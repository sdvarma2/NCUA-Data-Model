"use client";

import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from "recharts";

function fmtMembers(n) {
  const abs = Math.abs(n);
  const sign = n < 0 ? "−" : "";
  if (abs >= 1_000) return `${sign}${Math.round(abs / 1_000)}k`;
  return `${sign}${Math.round(abs)}`;
}

function xTickFormatter(v) {
  if (v === 1)  return "M1";
  if (v % 12 === 0) return `M${v}`;
  return "";
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const yr    = Math.ceil(label / 12);
  const newM  = payload.find((p) => p.dataKey === "newMembers");
  const ret   = payload.find((p) => p.dataKey === "retained");
  const attr  = payload.find((p) => p.dataKey === "attrition");
  return (
    <div className="bg-white border border-zinc-200 rounded-lg shadow-lg px-3 py-2 text-xs min-w-[150px]">
      <p className="font-semibold text-zinc-900 mb-1">Month {label} · Year {yr}</p>
      {ret  && <p style={{ color: "#6b7280" }}>Retained: {fmtMembers(ret.value)}</p>}
      {newM && <p style={{ color: "#3b82f6" }}>New: +{fmtMembers(newM.value)}</p>}
      {attr && <p style={{ color: "#ef4444" }}>Attrition: {fmtMembers(attr.value)}</p>}
    </div>
  );
}

/**
 * Props:
 *   simulation    – { months } from runSimulation
 *   currentMonth  – 0–60
 *   height        – number (default 200)
 */
export default function CohortWaterfall({ simulation, currentMonth, height = 200 }) {
  const allData = useMemo(() => {
    if (!simulation) return [];
    return simulation.months.map((m, i) => {
      const prevTotal = i > 0 ? simulation.months[i - 1].totalActiveMembers : 0;
      const retained  = m.totalActiveMembers - m.newMembersGross;
      const attrition = -(Math.max(0, prevTotal - retained));
      return {
        month:      m.month,
        retained:   Math.max(0, retained),
        newMembers: m.newMembersGross,
        attrition,
      };
    });
  }, [simulation]);

  const visibleData = useMemo(
    () => (currentMonth > 0 ? allData.slice(0, currentMonth) : []),
    [allData, currentMonth]
  );

  if (!simulation) return null;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={visibleData}
        margin={{ top: 4, right: 8, bottom: 0, left: 4 }}
        barSize={currentMonth <= 24 ? 8 : currentMonth <= 48 ? 5 : 3}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
        <XAxis
          dataKey="month"
          type="number"
          domain={[1, 60]}
          ticks={[1, 12, 24, 36, 48, 60]}
          tickFormatter={xTickFormatter}
          tick={{ fontSize: 10, fill: "#71717a" }}
          axisLine={{ stroke: "#d4d4d8" }}
          tickLine={false}
        />
        <YAxis
          tickFormatter={fmtMembers}
          tick={{ fontSize: 10, fill: "#71717a" }}
          axisLine={false}
          tickLine={false}
          width={36}
        />
        <Tooltip content={<CustomTooltip />} />
        <ReferenceLine y={0} stroke="#a1a1aa" strokeWidth={1} />

        {/* Retained members — stacks first (bottom) */}
        <Bar dataKey="retained" name="Retained" stackId="cohort" fill="#9ca3af" isAnimationActive={false} />
        {/* New members — stacks on top */}
        <Bar dataKey="newMembers" name="New" stackId="cohort" fill="#3b82f6" radius={[2, 2, 0, 0]} isAnimationActive={false} />
        {/* Attrition — negative, renders downward */}
        <Bar dataKey="attrition" name="Attrition" stackId="attrition" fill="#ef4444" fillOpacity={0.7} radius={[0, 0, 2, 2]} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}
