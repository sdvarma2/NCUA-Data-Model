"use client";

import { useState } from "react";

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

function CalibrationLine({ label, cal }) {
  if (!cal) return null;
  return (
    <p className="text-xs text-zinc-500 mt-0.5 leading-snug">
      {label}: p = {cal.p.toFixed(4)}, q = {cal.q.toFixed(3)}
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
            label={footprintCalibration ? "Expansion" : "Bass fit"}
            cal={calibration}
          />
          {footprintCalibration && (
            <CalibrationLine label="Footprint" cal={footprintCalibration} />
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
