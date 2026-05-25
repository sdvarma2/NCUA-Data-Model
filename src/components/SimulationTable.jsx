"use client";

import { useEffect, useRef, useState } from "react";

// Milestone months shown as rows in the table
const MILESTONE_MONTHS = [1, 6, 12, 24, 36, 60];

// ── Formatting helpers ────────────────────────────────────────────────────────

function fmtDollars(n) {
  const abs = Math.abs(n);
  const sign = n < 0 ? "−" : "";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000)     return `${sign}$${Math.round(abs / 1_000)}k`;
  return `${sign}$${Math.round(abs)}`;
}

// ── Calibration helpers ───────────────────────────────────────────────────────

function realismTextClass(overall) {
  if (overall === "green")  return "text-emerald-700";
  if (overall === "yellow") return "text-amber-700";
  return "text-red-600";
}

function realismText(overall) {
  if (overall === "green")  return "✓ Plausible";
  if (overall === "yellow") return "⚠ Ambitious";
  return "✗ Implausible";
}

/**
 * Click-toggle tooltip. The ? badge opens the panel; the × button or a click
 * outside closes it. Hover-only tooltips lose their hover zone when the cursor
 * moves from the badge to the (absolutely-positioned) panel content, so
 * click-toggle is the correct pattern for multi-line help text.
 */
function InfoTooltip({ children }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close when the user clicks outside the tooltip
  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <span ref={ref} className="relative inline-flex items-center ml-1 align-middle">
      {/* Badge — toggle on click */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-zinc-200 text-zinc-500 text-[9px] font-bold cursor-pointer select-none leading-none hover:bg-zinc-300 transition-colors"
        aria-label="More information"
        aria-expanded={open}
      >
        ?
      </button>

      {/* Tooltip panel */}
      {open && (
        <span
          role="tooltip"
          className="absolute top-5 left-0 z-20 w-72 rounded-lg bg-zinc-800 px-3.5 py-3 text-xs text-white leading-relaxed shadow-lg"
        >
          {/* Close button */}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute top-2 right-2.5 text-zinc-400 hover:text-white text-sm leading-none transition-colors"
            aria-label="Close"
          >
            ×
          </button>
          {children}
        </span>
      )}
    </span>
  );
}

// ── Tooltip content blocks ────────────────────────────────────────────────────

const BASS_FIT_TOOLTIP = (
  <>
    <span className="block font-semibold text-white mb-1.5">Bass Curve Calibration</span>
    <span className="block mb-2">
      A Bass Curve models how a new product spreads through a market by separating adoption into two forces.
    </span>
    <span className="block mb-1">
      <span className="font-semibold text-zinc-200">p — Innovation coefficient</span>
      {" "}(green: 0.003–0.020): the fraction of the market that adopts independently each period, driven by advertising and awareness.
    </span>
    <span className="block mb-2">
      <span className="font-semibold text-zinc-200">q — Imitation coefficient</span>
      {" "}(green: 0.15–0.45): the rate at which existing members influence non-adopters through word-of-mouth and social proof.
    </span>
    <span className="block text-zinc-300 border-t border-zinc-600 pt-2 mt-1">
      <span className="font-semibold text-white">Plausibility</span> is assessed on three dimensions: p and q within published ranges; Bass curve fits all milestones within ~10% error; no single target under-predicted by more than 10%.{" "}
      <span className="text-emerald-400">✓ Plausible</span> = all green.{" "}
      <span className="text-amber-400">⚠ Ambitious</span> = one or more targets may be hard to reach.{" "}
      <span className="text-red-400">✗ Implausible</span> = parameters outside realistic ranges.
    </span>
  </>
);

const FOOTPRINT_TOOLTIP = (
  <>
    <span className="block font-semibold text-white mb-1.5">Inside-Footprint vs. Expansion</span>
    <span className="block mb-2">
      In the All Markets scenario, adoption is modeled as two independent streams with different economics.
    </span>
    <span className="block mb-1">
      <span className="font-semibold text-zinc-200">Expansion</span> targets households outside the credit union's current membership — net-new relationships in markets where the institution has no prior presence. Acquisition costs are higher and early attrition is greater because no existing trust has been established.
    </span>
    <span className="block mb-2">
      <span className="font-semibold text-zinc-200">Footprint (this line)</span> targets the credit union's existing members — converting them to the digital-only product. The relationship already exists, so acquisition costs are substantially lower (cross-sell vs. new-market advertising) and attrition is reduced.
    </span>
    <span className="block text-zinc-300 border-t border-zinc-600 pt-2 mt-1">
      Each stream runs its own Bass Curve calibration against separate milestone targets. The p and q shown here reflect adoption dynamics within a known, trusting audience — expect lower p (less cold outreach needed) and similar q (word-of-mouth still drives imitation within the existing base).
    </span>
  </>
);

// ── CalibrationLine ───────────────────────────────────────────────────────────

function CalibrationLine({ label, cal, tooltip }) {
  if (!cal) return null;
  return (
    <p className="text-xs text-zinc-500 mt-0.5 leading-snug">
      <span className="inline-flex items-center gap-0">
        {label}
        {tooltip && <InfoTooltip>{tooltip}</InfoTooltip>}
      </span>
      {": "}p = {cal.p.toFixed(4)}, q = {cal.q.toFixed(3)}
      {" · "}
      <span className={realismTextClass(cal.realismIndicator.overall)}>
        {realismText(cal.realismIndicator.overall)}
      </span>
    </p>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

/**
 * Tabular breakdown of simulation outputs at months 1, 6, 12, 24, 36, and 60.
 * Has its own A/B toggle so it can be used as an independent debugging surface
 * regardless of which scenario is active in the main toggle.
 */
export default function SimulationTable({ simulationA, simulationB, scenario }) {
  // Default to whichever scenario is currently active, but allow independent control
  const [tableScenario, setTableScenario] = useState(scenario ?? "scenario_a");

  const sim = tableScenario === "scenario_a" ? simulationA : simulationB;
  if (!sim) return null;

  const rows     = MILESTONE_MONTHS.map((m) => sim.months[m - 1]);
  const breakEven = sim.months.find((m) => m.isBreakEvenMonth);
  const { calibration, footprintCalibration } = sim;

  return (
    <section
      className="rounded-lg border border-zinc-200 bg-white p-5"
      aria-label="Simulation Detail"
    >
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Simulation Detail
          </h2>
          <CalibrationLine
            label={footprintCalibration ? "Expansion" : "Bass Fit"}
            cal={calibration}
            tooltip={BASS_FIT_TOOLTIP}
          />
          {footprintCalibration && (
            <CalibrationLine
              label="Footprint"
              cal={footprintCalibration}
              tooltip={FOOTPRINT_TOOLTIP}
            />
          )}
          <p className="text-xs text-zinc-500 mt-0.5 leading-snug">
            Break-even:{" "}
            {breakEven
              ? `Month ${breakEven.month}`
              : "Not reached within 5 years"}
          </p>
        </div>

        {/* Independent scenario toggle */}
        <div
          className="flex rounded-lg overflow-hidden border border-zinc-200 text-xs shrink-0"
          role="group"
          aria-label="Select scenario to inspect"
        >
          <button
            onClick={() => setTableScenario("scenario_a")}
            className={`min-h-[44px] px-3 py-2 font-medium transition-colors ${
              tableScenario === "scenario_a"
                ? "bg-zinc-800 text-white"
                : "bg-white text-zinc-600 hover:bg-zinc-50"
            }`}
          >
            Expansion Only
          </button>
          <button
            onClick={() => setTableScenario("scenario_b")}
            className={`min-h-[44px] px-3 py-2 font-medium transition-colors border-l border-zinc-200 ${
              tableScenario === "scenario_b"
                ? "bg-zinc-800 text-white"
                : "bg-white text-zinc-600 hover:bg-zinc-50"
            }`}
          >
            All Markets
          </button>
        </div>
      </div>

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-xs border-collapse">
          <thead>
            <tr className="border-b-2 border-zinc-200">
              <th scope="col" className="text-left font-semibold text-zinc-500 pb-2 pr-4 whitespace-nowrap">
                Month
              </th>
              <th scope="col" className="text-right font-semibold text-zinc-500 pb-2 px-3 whitespace-nowrap">
                Digital Members
              </th>
              <th scope="col" className="text-right font-semibold text-zinc-500 pb-2 px-3 whitespace-nowrap">
                Cumul. Acq. Spend
              </th>
              <th scope="col" className="text-right font-semibold text-zinc-500 pb-2 px-3 whitespace-nowrap">
                Monthly NII
              </th>
              <th scope="col" className="text-right font-semibold text-zinc-500 pb-2 px-3 whitespace-nowrap">
                Rate Premium
              </th>
              <th scope="col" className="text-right font-semibold text-zinc-500 pb-2 px-3 whitespace-nowrap">
                Cannibalization
              </th>
              <th scope="col" className="text-right font-semibold text-zinc-500 pb-2 px-3 whitespace-nowrap">
                Servicing Savings
              </th>
              <th scope="col" className="text-right font-semibold text-zinc-500 pb-2 px-3 whitespace-nowrap">
                Monthly Net
              </th>
              <th scope="col" className="text-right font-semibold text-zinc-500 pb-2 pl-3 whitespace-nowrap">
                Cumul. Net
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.month}
                className={`border-b border-zinc-100 last:border-0 ${
                  row.isBreakEvenMonth ? "bg-emerald-50" : ""
                }`}
              >
                {/* Month */}
                <td className="py-2.5 pr-4 font-medium text-zinc-700 whitespace-nowrap">
                  {row.month}
                  {row.isBreakEvenMonth && (
                    <span
                      className="ml-1.5 text-emerald-700"
                      title="Break-even month"
                      aria-label="Break-even month"
                    >
                      ★
                    </span>
                  )}
                </td>

                {/* Digital Members */}
                <td className="py-2.5 px-3 text-right tabular-nums text-zinc-700">
                  {row.totalActiveMembers.toLocaleString()}
                </td>

                {/* Cumulative Acquisition Spend */}
                <td className="py-2.5 px-3 text-right tabular-nums text-zinc-700">
                  {fmtDollars(row.cumulativeAcquisitionSpend)}
                </td>

                {/* Monthly NII */}
                <td className="py-2.5 px-3 text-right tabular-nums text-zinc-700">
                  {fmtDollars(row.monthlyGrossNII)}
                </td>

                {/* Rate Premium Cost */}
                <td className="py-2.5 px-3 text-right tabular-nums text-zinc-700">
                  {fmtDollars(row.monthlyRatePremiumCost)}
                </td>

                {/* Cannibalization */}
                <td className="py-2.5 px-3 text-right tabular-nums text-zinc-700">
                  {fmtDollars(row.monthlyCannibalizationCost)}
                </td>

                {/* Servicing Savings */}
                <td className="py-2.5 px-3 text-right tabular-nums text-zinc-700">
                  {fmtDollars(row.monthlyServicingCostSavings)}
                </td>

                {/* Monthly Net — color-coded */}
                <td
                  className={`py-2.5 px-3 text-right tabular-nums font-medium ${
                    row.monthlyNetContribution >= 0 ? "text-emerald-700" : "text-red-600"
                  }`}
                >
                  {fmtDollars(row.monthlyNetContribution)}
                </td>

                {/* Cumulative Net — color-coded */}
                <td
                  className={`py-2.5 pl-3 text-right tabular-nums font-medium ${
                    row.cumulativeNetContribution >= 0 ? "text-emerald-700" : "text-red-600"
                  }`}
                >
                  {fmtDollars(row.cumulativeNetContribution)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
