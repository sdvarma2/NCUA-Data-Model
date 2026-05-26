"use client";

import { useMemo } from "react";
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Area,
} from "recharts";

// ── Palette ───────────────────────────────────────────────────────────────────

// Single-scenario view
const COLOR_ACTUAL_POSITIVE = "#10b981"; // emerald-500 — post break-even
const COLOR_ACTUAL_NEGATIVE = "#ef4444"; // red-500  — pre break-even
const COLOR_GHOST            = "#d97706"; // amber-600 — without-cannib ghost line

// Comparison view — always use these fixed colors so users learn the mapping
export const COLOR_EXPANSION  = "#2563eb"; // blue-600  — Expansion Only
export const COLOR_ALL_MARKETS = "#ea580c"; // orange-600 — All Markets

// ── Formatting ────────────────────────────────────────────────────────────────

function fmtAxis(n) {
  const abs  = Math.abs(n);
  const sign = n < 0 ? "−" : "";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(0)}M`;
  if (abs >= 1_000)     return `${sign}$${Math.round(abs / 1_000)}k`;
  return `${sign}$${Math.round(abs)}`;
}

function fmtTooltip(value) {
  if (value == null) return "—";
  const abs  = Math.abs(value);
  const sign = value < 0 ? "−" : "+";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000)     return `${sign}$${Math.round(abs / 1_000)}k`;
  return `${sign}$${Math.round(abs)}`;
}

function xTickFormatter(v) {
  if (v === 1)          return "Launch";
  if (v % 12 === 0)     return `Yr ${v / 12}`;
  return "";
}

// ── Y-axis domain ─────────────────────────────────────────────────────────────

function computeYDomain(months) {
  let min = 0, max = 0;
  for (const m of months) {
    const net      = m.cumulativeNetContribution;
    const noCannib = m.cumulativeNetContribution + m.cumulativeCannibalDrag;
    if (net      < min) min = net;
    if (noCannib > max) max = noCannib;
    if (noCannib < min) min = noCannib;
    if (net      > max) max = net;
  }
  const pad  = Math.max(Math.abs(max - min) * 0.12, 50_000);
  const step = 500_000;
  return [
    Math.floor((min - pad) / step) * step,
    Math.ceil( (max + pad) / step) * step,
  ];
}

// ── Traveling dot — renders only on the last visible data point ───────────────

function TravelingDot({ cx, cy, index, dataLength, color }) {
  if (index !== dataLength - 1) return null;
  return (
    <circle
      cx={cx} cy={cy} r={5}
      fill={color} stroke="white" strokeWidth={2}
    />
  );
}

// ── Tooltip ───────────────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label, showComparison }) {
  if (!active || !payload?.length) return null;
  const yr    = Math.ceil(label / 12);
  const title = `Month ${label} · Year ${yr}`;

  // Filter out ghost (noCannib) lines from the tooltip in comparison mode
  // to keep it clean — user can see ghost in single mode but in comparison
  // mode we only show the two scenario actuals.
  const visibleRows = payload.filter((p) =>
    showComparison
      ? p.dataKey === "netExpansion" || p.dataKey === "netAllMarkets"
      : true
  );

  return (
    <div className="bg-white border border-zinc-200 rounded-lg shadow-lg px-3 py-2 text-xs text-zinc-700 min-w-[180px]">
      <p className="font-semibold mb-1 text-zinc-900">{title}</p>
      {visibleRows.map((p) => (
        <div key={p.dataKey} className="flex justify-between gap-4 mt-0.5">
          <span style={{ color: p.color }} className="font-medium">{p.name}</span>
          <span className="font-semibold tabular-nums">{fmtTooltip(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

/**
 * Props:
 *   simulationA      – { months } from runSimulation  (Expansion Only)
 *   simulationB      – { months } | null               (All Markets)
 *   currentMonth     – 0–60
 *   scenario         – "scenario_a" | "scenario_b"    (drives single-mode primary)
 *   showComparison   – bool
 *   height           – number (default 280)
 */
export default function PLCurve({
  simulationA,
  simulationB,
  currentMonth,
  scenario,
  showComparison = false,
  height = 280,
}) {
  const primary = scenario === "scenario_a" ? simulationA : simulationB;

  // ── Y-domain ────────────────────────────────────────────────────────────────
  const yDomain = useMemo(() => {
    const sources = [simulationA?.months, simulationB?.months].filter(Boolean);
    if (!sources.length) return [-1_000_000, 1_000_000];
    return computeYDomain(sources.flat());
  }, [simulationA, simulationB]);

  // ── Chart data ──────────────────────────────────────────────────────────────
  // Always include both A and B values so recharts sees a stable data shape.
  const allData = useMemo(() => {
    const base = primary ?? simulationA ?? simulationB;
    if (!base) return [];
    return base.months.map((_, i) => {
      const mA = simulationA?.months[i];
      const mB = simulationB?.months[i];
      const mP = (scenario === "scenario_a" ? mA : mB) ?? mA ?? mB;
      return {
        month: i + 1,
        // Single-mode keys (primary scenario)
        net:      mP?.cumulativeNetContribution ?? null,
        noCannib: mP ? mP.cumulativeNetContribution + mP.cumulativeCannibalDrag : null,
        // Comparison-mode keys (fixed: A = Expansion, B = All Markets)
        netExpansion:   mA?.cumulativeNetContribution ?? null,
        netAllMarkets:  mB?.cumulativeNetContribution ?? null,
      };
    });
  }, [primary, simulationA, simulationB, scenario]);

  const visibleData = useMemo(
    () => (currentMonth > 0 ? allData.slice(0, currentMonth) : []),
    [allData, currentMonth]
  );

  // ── Break-even tracking ─────────────────────────────────────────────────────
  const breakEvenExpansion = useMemo(
    () => simulationA?.months.find((m) => m.isBreakEvenMonth)?.month ?? null,
    [simulationA]
  );
  const breakEvenAllMarkets = useMemo(
    () => simulationB?.months.find((m) => m.isBreakEvenMonth)?.month ?? null,
    [simulationB]
  );

  // Single-mode break-even (primary scenario)
  const breakEvenPrimary = scenario === "scenario_a" ? breakEvenExpansion : breakEvenAllMarkets;
  const primaryHasBreakEven = breakEvenPrimary !== null && currentMonth >= breakEvenPrimary;

  // Comparison-mode break-even visibility
  const expansionHasBreakEven  = breakEvenExpansion  !== null && currentMonth >= breakEvenExpansion;
  const allMarketsHasBreakEven = breakEvenAllMarkets !== null && currentMonth >= breakEvenAllMarkets;

  const primaryLineColor = primaryHasBreakEven ? COLOR_ACTUAL_POSITIVE : COLOR_ACTUAL_NEGATIVE;

  if (!primary && !simulationA && !simulationB) {
    return (
      <div className="flex items-center justify-center text-xs text-zinc-400" style={{ height }}>
        No simulation data
      </div>
    );
  }

  const dataLength = visibleData.length;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart
        data={visibleData}
        margin={{ top: 8, right: 16, bottom: 0, left: 8 }}
      >
        <defs>
          <linearGradient id="cannibFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05} />
          </linearGradient>
        </defs>

        <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />

        <XAxis
          dataKey="month"
          type="number"
          domain={[1, 60]}
          ticks={[1, 12, 24, 36, 48, 60]}
          tickFormatter={xTickFormatter}
          tick={{ fontSize: 11, fill: "#71717a" }}
          axisLine={{ stroke: "#d4d4d8" }}
          tickLine={false}
        />
        <YAxis
          domain={yDomain}
          tickFormatter={fmtAxis}
          tick={{ fontSize: 11, fill: "#71717a" }}
          axisLine={false}
          tickLine={false}
          width={52}
        />

        <Tooltip content={<CustomTooltip showComparison={showComparison} />} />

        {/* Zero baseline */}
        <ReferenceLine y={0} stroke="#a1a1aa" strokeWidth={1.5} />

        {/* ── SINGLE-SCENARIO VIEW ──────────────────────────────────────────── */}
        {!showComparison && (
          <>
            {/* Ghost "without cannibalization" line — amber with fill shadow */}
            <Area
              dataKey="noCannib"
              name="Without cannibalization"
              stroke={COLOR_GHOST}
              strokeWidth={1.5}
              strokeDasharray="4 4"
              fill="url(#cannibFill)"
              fillOpacity={1}
              dot={false}
              activeDot={false}
              isAnimationActive={false}
              connectNulls
            />
            {/* Actual P&L — white fill masks the amber below it */}
            <Area
              dataKey="net"
              name="Cumulative net"
              stroke={primaryLineColor}
              strokeWidth={2.5}
              fill="#fafafa"
              fillOpacity={1}
              dot={(props) => (
                <TravelingDot
                  key={`dot-single-${props.index}`}
                  {...props}
                  dataLength={dataLength}
                  color={primaryLineColor}
                />
              )}
              activeDot={false}
              isAnimationActive={false}
              connectNulls
            />
            {/* Break-even marker */}
            {primaryHasBreakEven && breakEvenPrimary && (
              <ReferenceLine
                x={breakEvenPrimary}
                stroke={COLOR_ACTUAL_POSITIVE}
                strokeWidth={1.5}
                strokeDasharray="4 4"
                label={{
                  value: `Break-even — M${breakEvenPrimary}`,
                  position: "insideTopLeft",
                  fontSize: 10,
                  fill: "#065f46",
                  fontWeight: 600,
                }}
              />
            )}
          </>
        )}

        {/* ── COMPARISON VIEW ───────────────────────────────────────────────── */}
        {showComparison && (
          <>
            {/* Expansion Only — solid blue */}
            <Line
              dataKey="netExpansion"
              name="Expansion Only"
              stroke={COLOR_EXPANSION}
              strokeWidth={2.5}
              dot={(props) => (
                <TravelingDot
                  key={`dot-exp-${props.index}`}
                  {...props}
                  dataLength={dataLength}
                  color={COLOR_EXPANSION}
                />
              )}
              activeDot={false}
              isAnimationActive={false}
              connectNulls
            />
            {/* All Markets — dashed orange */}
            <Line
              dataKey="netAllMarkets"
              name="All Markets"
              stroke={COLOR_ALL_MARKETS}
              strokeWidth={2.5}
              strokeDasharray="7 4"
              dot={(props) => (
                <TravelingDot
                  key={`dot-all-${props.index}`}
                  {...props}
                  dataLength={dataLength}
                  color={COLOR_ALL_MARKETS}
                />
              )}
              activeDot={false}
              isAnimationActive={false}
              connectNulls
            />

            {/* Break-even markers — labeled by scenario name */}
            {expansionHasBreakEven && breakEvenExpansion && (
              <ReferenceLine
                x={breakEvenExpansion}
                stroke={COLOR_EXPANSION}
                strokeWidth={1.5}
                strokeDasharray="4 4"
                label={{
                  value: `Expansion Only — M${breakEvenExpansion}`,
                  position: "insideTopLeft",
                  fontSize: 10,
                  fill: COLOR_EXPANSION,
                  fontWeight: 600,
                }}
              />
            )}
            {allMarketsHasBreakEven && breakEvenAllMarkets && (
              <ReferenceLine
                x={breakEvenAllMarkets}
                stroke={COLOR_ALL_MARKETS}
                strokeWidth={1.5}
                strokeDasharray="4 4"
                label={{
                  value: `All Markets — M${breakEvenAllMarkets}`,
                  position: "insideBottomLeft",
                  fontSize: 10,
                  fill: COLOR_ALL_MARKETS,
                  fontWeight: 600,
                }}
              />
            )}
          </>
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
