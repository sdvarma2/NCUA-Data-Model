"use client";

import { useMemo, useState } from "react";
import { useSimulationPlayer, MONTHS_TOTAL } from "@/lib/useSimulationPlayer";
import PLCurve, { COLOR_EXPANSION, COLOR_ALL_MARKETS } from "@/components/charts/PLCurve";
import CohortWaterfall from "@/components/charts/CohortWaterfall";
import MarketPenetration from "@/components/charts/MarketPenetration";

// ── Formatting ────────────────────────────────────────────────────────────────

function fmtMembers(n) {
  return Math.round(n).toLocaleString();
}

function fmtDollars(n) {
  const abs  = Math.abs(n);
  const sign = n < 0 ? "−" : "";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000)     return `${sign}$${Math.round(abs / 1_000)}k`;
  return `${sign}$${Math.round(abs)}`;
}

function fmtDollarsFull(n) {
  const abs  = Math.abs(n);
  const sign = n < 0 ? "−" : "";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000)     return `${sign}$${(abs / 1_000).toFixed(1)}k`;
  return `${sign}$${Math.round(abs)}`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

/** A single live-counter card. */
function CounterCard({ label, value, valueClass = "text-zinc-900", hint }) {
  return (
    <div className="bg-white rounded-lg border border-zinc-200 px-3 py-2 sm:px-4 sm:py-3 min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 truncate">{label}</p>
      <p className={`text-lg sm:text-xl font-bold tabular-nums leading-tight ${valueClass}`}>
        {value}
      </p>
      {hint && <p className="text-[10px] text-zinc-500 mt-0.5">{hint}</p>}
    </div>
  );
}

/** One summary card shown after the simulation completes. */
function SummaryCard({ icon, title, value, valueClass = "text-zinc-900", subtitle }) {
  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-4">
      <div className="flex items-start gap-2 mb-1">
        <span className="text-base">{icon}</span>
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide leading-snug">{title}</p>
      </div>
      <p className={`text-2xl font-bold ${valueClass}`}>{value}</p>
      {subtitle && <p className="text-xs text-zinc-500 mt-1 leading-snug">{subtitle}</p>}
    </div>
  );
}

/** Month label: "Month 24 · Year 2" */
function monthLabel(m) {
  if (!m) return "—";
  const yr = Math.ceil(m / 12);
  return `Month ${m} · Year ${yr}`;
}

// ── Speed selector ────────────────────────────────────────────────────────────

function SpeedSelector({ speed, setSpeed }) {
  return (
    <div className="flex items-center gap-0.5" role="group" aria-label="Playback speed">
      {[1, 2, 4].map((s) => (
        <button
          key={s}
          onClick={() => setSpeed(s)}
          aria-pressed={speed === s}
          className={`px-2 py-1 rounded text-xs font-semibold transition-colors min-w-[32px] min-h-[32px] ${
            speed === s
              ? "bg-zinc-900 text-white"
              : "bg-white border border-zinc-300 text-zinc-600 hover:bg-zinc-50"
          }`}
        >
          {s}×
        </button>
      ))}
    </div>
  );
}

// ── Play / Pause / Reset controls ─────────────────────────────────────────────

function PlayControls({ isPlaying, isComplete, play, pause, reset }) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={isPlaying ? pause : play}
        aria-label={isPlaying ? "Pause simulation" : (isComplete ? "Replay simulation" : "Play simulation")}
        className="flex items-center justify-center w-10 h-10 rounded-full bg-zinc-900 text-white hover:bg-zinc-700 transition-colors active:scale-95"
      >
        {isPlaying ? (
          // Pause icon
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <rect x="2" y="2" width="3.5" height="10" rx="1" fill="currentColor" />
            <rect x="8.5" y="2" width="3.5" height="10" rx="1" fill="currentColor" />
          </svg>
        ) : (
          // Play icon
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M3 2L12 7L3 12V2Z" fill="currentColor" />
          </svg>
        )}
      </button>
      <button
        onClick={reset}
        aria-label="Reset simulation"
        title="Reset"
        className="flex items-center justify-center w-8 h-8 rounded-full bg-white border border-zinc-300 text-zinc-600 hover:bg-zinc-50 transition-colors active:scale-95"
      >
        {/* Reset / rewind icon */}
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path
            d="M7 2.5C4.5 2.5 2.5 4.5 2.5 7s2 4.5 4.5 4.5 4.5-2 4.5-4.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path d="M4 1.5L2.5 3 4 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}

// ── Summary cards (Step 20) ───────────────────────────────────────────────────

function SummaryCards({ simulation, institution }) {
  if (!simulation) return null;

  const last = simulation.months[MONTHS_TOTAL - 1];

  // Break-even
  const breakEvenMonth = simulation.months.find((m) => m.isBreakEvenMonth)?.month ?? null;

  // 5-year cumulative net
  const cumulNet = last.cumulativeNetContribution;

  // Cannibalization cost
  const totalCannib = last.cumulativeCannibalDrag;
  const depositCannib = simulation.months.reduce((s, m) => s + m.depositCannibalizationCost, 0);
  const loanCannib    = simulation.months.reduce((s, m) => s + m.loanCannibalizationCost, 0);

  // ROA impact — cumulative 5-year net as a fraction of total assets, expressed in bps
  const totalAssets  = (institution?.assets_b ?? 0) * 1e9;
  const roaImpactBps = totalAssets > 0 ? (cumulNet / totalAssets) * 10000 : null;

  return (
    <div className="mt-6">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-3">
        5-Year Summary
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Card 1: Break-even */}
        <SummaryCard
          icon="🎯"
          title="Break-Even"
          value={breakEvenMonth ? `Month ${breakEvenMonth} of 60` : "Not reached"}
          valueClass={breakEvenMonth ? "text-emerald-700" : "text-red-600"}
          subtitle={breakEvenMonth
            ? `Year ${Math.ceil(breakEvenMonth / 12)} of the program`
            : "Cumulative net stays negative through year 5"}
        />

        {/* Card 2: 5-year cumulative net */}
        <SummaryCard
          icon="💰"
          title="5-Year Cumulative Net"
          value={fmtDollarsFull(cumulNet)}
          valueClass={cumulNet >= 0 ? "text-emerald-700" : "text-red-600"}
          subtitle="Total net contribution over 60 months"
        />

        {/* Card 3: Cannibalization cost */}
        <SummaryCard
          icon="⚠️"
          title="Cannibalization Cost"
          value={`−${fmtDollarsFull(totalCannib)}`}
          valueClass="text-amber-700"
          subtitle={`Deposit: −${fmtDollarsFull(depositCannib)} · Loan: −${fmtDollarsFull(loanCannib)}`}
        />

        {/* Card 4: ROA impact */}
        <SummaryCard
          icon="📊"
          title="ROA Impact"
          value={
            roaImpactBps == null
              ? "—"
              : roaImpactBps >= 0
                ? `+${roaImpactBps.toFixed(1)} bps`
                : `${roaImpactBps.toFixed(1)} bps`
          }
          valueClass={
            roaImpactBps == null
              ? "text-zinc-500"
              : roaImpactBps >= 0
                ? "text-emerald-700"
                : "text-red-600"
          }
          subtitle="5-year cumulative net ÷ total assets"
        />
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

/**
 * Props:
 *   simulationA   – { months, calibration } | null
 *   simulationB   – { months, calibration } | null
 *   scenario      – "scenario_a" | "scenario_b"
 *   institution   – selected institution object (for summary cards)
 */
export default function SimulationStage({ simulationA, simulationB, scenario, institution }) {
  const { currentMonth, isPlaying, speed, play, pause, reset, scrub, setSpeed, isComplete } =
    useSimulationPlayer();

  const [showComparison, setShowComparison] = useState(false);

  const primary   = scenario === "scenario_a" ? simulationA : simulationB;
  const secondary = scenario === "scenario_a" ? simulationB : simulationA;

  // Current row for live counters
  const row = currentMonth > 0 ? primary?.months[currentMonth - 1] : null;

  // Derived counter values
  const totalMembers      = row?.totalActiveMembers ?? 0;
  const cumulAcqSpend     = row?.cumulativeAcquisitionSpend ?? 0;
  const cannibDrag        = row?.cumulativeCannibalDrag ?? 0;
  const cumulNet          = row?.cumulativeNetContribution ?? 0;
  const netIsPositive     = cumulNet >= 0 && currentMonth > 0;

  // Has the simulation reached break-even yet?
  const breakEvenMonth = useMemo(
    () => primary?.months.find((m) => m.isBreakEvenMonth)?.month ?? null,
    [primary]
  );
  const pastBreakEven = breakEvenMonth !== null && currentMonth >= breakEvenMonth;

  const canCompare = simulationA && simulationB;

  if (!primary) return null;

  return (
    <div className="bg-zinc-50 rounded-2xl border border-zinc-200 overflow-hidden">
      {/* ── Header bar ───────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-zinc-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Simulation</p>
          <p className="text-sm font-semibold text-zinc-900">
            {currentMonth === 0
              ? "Press play to begin"
              : isComplete
              ? `Complete — ${monthLabel(MONTHS_TOTAL)}`
              : monthLabel(currentMonth)}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <SpeedSelector speed={speed} setSpeed={setSpeed} />
          <PlayControls
            isPlaying={isPlaying}
            isComplete={isComplete}
            play={play}
            pause={pause}
            reset={reset}
          />
        </div>
      </div>

      {/* ── Scrubber ─────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-zinc-100 px-4 pb-2 pt-1">
        <input
          type="range"
          min={0}
          max={MONTHS_TOTAL}
          value={currentMonth}
          onChange={(e) => scrub(Number(e.target.value))}
          aria-label="Scrub to month"
          className="w-full h-1.5 accent-zinc-900 cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-zinc-400 mt-0.5 select-none">
          <span>Launch</span>
          <span>Yr 1</span>
          <span>Yr 2</span>
          <span>Yr 3</span>
          <span>Yr 4</span>
          <span>Yr 5</span>
        </div>
      </div>

      <div className="p-4 space-y-5">
        {/* ── Live counters (Step 15) ───────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <CounterCard
            label="Digital Members"
            value={currentMonth === 0 ? "—" : fmtMembers(totalMembers)}
          />
          <CounterCard
            label="Cumul. Acq. Spend"
            value={currentMonth === 0 ? "—" : fmtDollars(-cumulAcqSpend)}
            valueClass="text-red-600"
          />
          <CounterCard
            label="Cannib. Drag"
            value={currentMonth === 0 ? "—" : fmtDollars(-cannibDrag)}
            valueClass="text-amber-700"
            hint={row ? `Deposit + loan combined` : undefined}
          />
          <CounterCard
            label="Cumul. Net"
            value={currentMonth === 0 ? "—" : fmtDollars(cumulNet)}
            valueClass={
              currentMonth === 0
                ? "text-zinc-900"
                : pastBreakEven
                ? "text-emerald-700"
                : "text-red-600"
            }
            hint={pastBreakEven ? "Break-even reached ✓" : undefined}
          />
        </div>

        {/* ── P&L curve (Steps 16–17) ───────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
            <p className="text-xs font-semibold text-zinc-700">
              Cumulative P&amp;L
            </p>
            <div className="flex items-center gap-3 text-[10px] text-zinc-500 flex-wrap">
              {showComparison ? (
                // Comparison mode: two named scenario lines
                <>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-5 h-0.5 rounded" style={{ backgroundColor: COLOR_EXPANSION }} />
                    <span style={{ color: COLOR_EXPANSION }} className="font-semibold">Expansion Only</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-5 h-0.5" style={{ backgroundImage: `repeating-linear-gradient(to right, ${COLOR_ALL_MARKETS} 0,${COLOR_ALL_MARKETS} 7px,transparent 7px,transparent 11px)` }} />
                    <span style={{ color: COLOR_ALL_MARKETS }} className="font-semibold">All Markets</span>
                  </span>
                </>
              ) : (
                // Single mode: actual + ghost
                <>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-4 h-0.5" style={{ backgroundImage: "repeating-linear-gradient(to right, #d97706 0,#d97706 4px,transparent 4px,transparent 8px)" }} />
                    Without cannib.
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-4 h-0.5 rounded" style={{ backgroundColor: pastBreakEven ? "#10b981" : "#ef4444" }} />
                    Actual
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="overflow-x-auto">
            <div className="min-w-[280px]">
              <PLCurve
                simulationA={simulationA}
                simulationB={simulationB}
                currentMonth={currentMonth}
                scenario={scenario}
                showComparison={showComparison}
                height={240}
              />
            </div>
          </div>
        </div>

        {/* ── Waterfall + Penetration (Steps 18–19) ────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Cohort waterfall — spans 2 of 3 columns on sm+ */}
          <div className="sm:col-span-2">
            <p className="text-xs font-semibold text-zinc-700 mb-2">Member Cohorts</p>
            <div className="flex items-center gap-3 text-[10px] text-zinc-500 mb-1">
              <span className="flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-sm bg-gray-400" /> Retained
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-sm bg-blue-500" /> New
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-sm bg-red-400" /> Attrition
              </span>
            </div>
            <div className="overflow-x-auto">
              <div className="min-w-[200px]">
                <CohortWaterfall simulation={primary} currentMonth={currentMonth} height={180} />
              </div>
            </div>
          </div>

          {/* Market penetration gauge */}
          <div className="flex flex-col justify-center">
            <p className="text-xs font-semibold text-zinc-700 mb-2 text-center">
              Market Penetration
            </p>
            <MarketPenetration
              simulation={primary}
              currentMonth={currentMonth}
              scenario={scenario}
            />
            {scenario === "scenario_b" && (
              <p className="text-[10px] text-zinc-500 text-center mt-1 leading-snug">
                Outer: expansion · Inner: footprint
              </p>
            )}
          </div>
        </div>

        {/* ── Compare Scenarios button (Step 21) ───────────────────────── */}
        {canCompare && (
          <div className="flex items-center gap-3 pt-1 flex-wrap">
            <button
              onClick={() => setShowComparison((v) => !v)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors min-h-[36px] ${
                showComparison
                  ? "bg-zinc-900 text-white border-zinc-900"
                  : "bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-50"
              }`}
            >
              {showComparison ? "Hide Comparison" : "Compare Both Scenarios"}
            </button>
            {!showComparison && (
              <p className="text-[11px] text-zinc-500">
                Overlay Expansion Only and All Markets on the same chart
              </p>
            )}
          </div>
        )}

        {/* ── Summary cards (Step 20) — visible after completion or at M60 ── */}
        {(isComplete || currentMonth >= MONTHS_TOTAL) && (
          <SummaryCards simulation={primary} institution={institution} />
        )}
      </div>
    </div>
  );
}
