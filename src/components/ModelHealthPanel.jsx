"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { computeModelHealth } from "@/lib/model";

// ── Info tooltip (same pattern as AdvancedSettings) ───────────────────────────

function InfoTip({ children, className = "w-64" }) {
  const [open, setOpen] = useState(false);
  const [offsetX, setOffsetX] = useState(0);
  const tipRef = useRef(null);

  useLayoutEffect(() => {
    if (!open) {
      setOffsetX(0);
      return;
    }
    if (!tipRef.current) return;
    const margin = 16;
    const viewportWidth = document.documentElement.clientWidth;
    const rect = tipRef.current.getBoundingClientRect();
    // rect reflects the untransformed position on first paint since offsetX resets to 0 on close
    let next = 0;
    if (rect.right > viewportWidth - margin) {
      next = viewportWidth - margin - rect.right;
    }
    if (rect.left + next < margin) {
      next = margin - rect.left;
    }
    setOffsetX(next);
  }, [open]);

  return (
    <span className="relative inline-flex items-center ml-1">
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
        aria-label="More information"
        className="rounded-full text-zinc-400 hover:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-400 transition-colors flex items-center justify-center w-4 h-4"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5" aria-hidden="true">
          <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" clipRule="evenodd" />
        </svg>
      </button>
      {open && (
        <span
          ref={tipRef}
          role="tooltip"
          style={{ transform: offsetX ? `translateX(${offsetX}px)` : undefined }}
          className={`absolute left-0 top-full mt-1.5 z-20 rounded-lg bg-zinc-800 px-3 py-2.5 text-xs leading-relaxed text-white shadow-lg ${className}`}
        >
          {children}
        </span>
      )}
    </span>
  );
}

// ── Color helpers ─────────────────────────────────────────────────────────────

function statusOf(value, thresholds) {
  // thresholds: [{ min, max, status }] checked in order; first match wins.
  // Pass null/undefined value → "neutral".
  if (value == null) return "neutral";
  for (const { min = -Infinity, max = Infinity, status } of thresholds) {
    if (value >= min && value <= max) return status;
  }
  return "neutral";
}

const STATUS_CLASSES = {
  green:   { dot: "bg-emerald-500", value: "text-emerald-700" },
  amber:   { dot: "bg-amber-500",   value: "text-amber-700"   },
  red:     { dot: "bg-red-500",     value: "text-red-600"     },
  neutral: { dot: "bg-zinc-300",    value: "text-zinc-900"    },
};

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusDot({ status }) {
  const cls = STATUS_CLASSES[status]?.dot ?? STATUS_CLASSES.neutral.dot;
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full shrink-0 ${cls}`}
      aria-hidden="true"
    />
  );
}

/**
 * A single metric row: label | • value  hint
 * Pass `tooltip` to show an ⓘ info icon next to the label.
 */
function HealthRow({ label, value, status = "neutral", hint, tooltip, tooltipClassName }) {
  const valueClass = STATUS_CLASSES[status]?.value ?? STATUS_CLASSES.neutral.value;
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-zinc-100 last:border-0">
      <span className="text-sm text-zinc-600 leading-snug flex items-center">
        {label}
        {tooltip && <InfoTip className={tooltipClassName ?? "w-72 max-w-[calc(100vw-2rem)]"}>{tooltip}</InfoTip>}
      </span>
      <div className="flex items-center gap-2 shrink-0">
        {status !== "neutral" && <StatusDot status={status} />}
        <span className={`text-sm font-medium tabular-nums ${valueClass}`}>
          {value}
        </span>
        {hint && (
          <span className="text-xs text-zinc-500 leading-tight text-right w-20 hidden sm:block">
            {hint}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Group header ──────────────────────────────────────────────────────────────

function GroupHeader({ label, description }) {
  return (
    <div className="pb-1">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      {description && (
        <p className="text-[11px] text-zinc-500 mt-0.5 leading-snug">
          {description}
        </p>
      )}
    </div>
  );
}

// ── Formatting helpers ────────────────────────────────────────────────────────

function fmtDollars(n) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${Math.round(n / 1_000)}k`;
  return `$${Math.round(n)}`;
}

function fmtPct(n) {
  return `${(n * 100).toFixed(1)}%`;
}

// ── Main component ────────────────────────────────────────────────────────────

/**
 * Instrument panel showing derived "health" values computed from the
 * current inputs and selected institution. Positioned between the strategy
 * levers and the simulation preview so the user can verify model plausibility
 * before running the animation.
 */
export default function ModelHealthPanel({ inputs, footprintInputs, scenario, institution }) {
  const isScenarioB = scenario === "scenario_b";
  // In Scenario B the footprint market is what's being added, so health metrics
  // reflect those inputs. Scenario A shows the expansion-market inputs.
  const activeInputs = isScenarioB ? footprintInputs : inputs;
  const h = computeModelHealth(activeInputs, institution);

  // ── Color thresholds ──────────────────────────────────────────────────────

  const savingsStatus = statusOf(h.servicingSavingsPerMemberYr, [
    { min: 90,  max: 200, status: "green" },
    { min: 50,  max: 89,  status: "amber" },
    { min: 200,           status: "amber" }, // above NCUA ceiling — possibly overstated
    { max: 49,            status: "red"   },
  ]);

  const netStatus = statusOf(h.netPerMemberYr, [
    { min: 1,  status: "green" },
    { min: -50, max: 0, status: "amber" },
    { max: -51, status: "red" },
  ]);

  const coverageStatus = statusOf(h.niiCoverageRatio, [
    { min: 3,            status: "green" },
    { min: 1.5, max: 2.99, status: "amber" },
    { max: 1.49,         status: "red"   },
  ]);

  const cannibStatus = statusOf(h.cannibDragAsPctOfNII, [
    { max: 0.049,           status: "green" },
    { min: 0.05, max: 0.099, status: "amber" },
    { min: 0.10,            status: "red"   },
  ]);

  // ── Formatted display values ──────────────────────────────────────────────

  const netSign = h.netPerMemberYr >= 0 ? "+" : "";
  const netLabel = `${netSign}$${Math.round(h.netPerMemberYr)}/yr`;

  const cannibLabel = h.cannibDragAsPctOfNII != null
    ? `${fmtDollars(h.annualCannibDragScenarioB)} (${fmtPct(h.cannibDragAsPctOfNII)} of interest income)`
    : fmtDollars(h.annualCannibDragScenarioB);

  return (
    <section
      className="rounded-lg border border-zinc-200 bg-white p-5"
      aria-label="Model Health"
    >
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Model Health
        </h2>
        <p className="text-xs text-zinc-500 mt-0.5 leading-snug">
          Use this panel to verify that the inputs provided are producing a
          plausible model before running the simulation.
        </p>
      </div>

      {/* ── Group 1: Per-member servicing economics ────────────────────── */}
      <GroupHeader
        label="Per Member / Year"
        description={
          isScenarioB
            ? "Footprint market — does the operational efficiency story hold up before counting interest income?"
            : "Does the operational efficiency story hold up before counting interest income?"
        }
      />
      <div className="rounded-lg border border-zinc-200 bg-zinc-50/50 px-4 mb-4">
        <HealthRow
          label="Servicing Savings"
          value={`$${Math.round(h.servicingSavingsPerMemberYr)}`}
          status={savingsStatus}
          hint="target $90–150"
          tooltip="Annual reduction in per-member operating cost for a digital member vs. a branch member. Computed as branch servicing cost minus digital servicing cost, covering transactions, platform fees, branch visit subsidies, and attrition-amortized acquisition cost."
        />
        <HealthRow
          label="Rate Premium Cost"
          value={`$${Math.round(h.ratePremiumPerMemberYr)}`}
          status="neutral"
          hint="deposit + loan"
          tooltip="Annualized rate concessions paid to digital members — the higher deposit rate plus the lower loan rate, weighted by deposit balance and loan penetration rate. Decreases over time as the rate bump decays toward the floor setting."
        />
        <HealthRow
          label="Net (Savings − Premium)"
          value={netLabel}
          status={netStatus}
          hint="target > $0"
        />
      </div>

      {/* ── Group 2: NII coverage ──────────────────────────────────────── */}
      <GroupHeader
        label="Per 1,000 Members / Month"
        description={
          isScenarioB
            ? "Footprint market — is the interest income earned large enough to absorb the rate concessions?"
            : "Is the interest income earned large enough to absorb the rate concessions?"
        }
      />
      <div className="rounded-lg border border-zinc-200 bg-zinc-50/50 px-4 mb-4">
        <HealthRow
          label="Gross Interest Income"
          value={`$${Math.round(h.monthlyNIIper1000).toLocaleString()}`}
          status="neutral"
          tooltip="Estimated gross interest income earned on digital member deposit and loan balances per 1,000 members per month, using the institution's NIM as the earning rate. This is the raw interest spread before subtracting the rate premium concession."
        />
        <HealthRow
          label="Rate Premium Cost"
          value={`$${Math.round(h.monthlyRatePremiumPer1000).toLocaleString()}`}
          status="neutral"
        />
        <HealthRow
          label="Interest Income Coverage Ratio"
          value={h.niiCoverageRatio == null ? "—" : `${h.niiCoverageRatio.toFixed(1)}×`}
          status={coverageStatus}
          hint="target > 3×"
          tooltip="Gross interest income divided by rate premium cost — how many times does the interest earned on digital balances cover the rate concession paid out. A ratio above 3× means the NIM comfortably absorbs the premium and still leaves meaningful spread. Below 1.5× the program earns less interest than it gives away in rate concessions."
          tooltipClassName="w-80 max-w-[calc(100vw-2rem)]"
        />
      </div>

      {/* ── Group 3: Institution risk — Scenario B only ────────────────── */}
      {isScenarioB && (
        <>
          <GroupHeader
            label="Institution Risk — Scenario B"
            description="How much does rate-matching erode the existing balance sheet's NII?"
          />
          <div className="rounded-lg border border-zinc-200 bg-zinc-50/50 px-4">
            <HealthRow
              label="Annual Cannibalization Drag"
              value={cannibLabel}
              status={cannibStatus}
              hint="target < 5%"
              tooltip="First-year estimate of net interest income erosion as rate-sensitive existing members migrate from standard to digital-tier rates under Scenario B (All Markets). Expressed as a total dollar impact and as a percentage of the institution's current annual gross interest income. Above 10% represents material balance-sheet risk."
              tooltipClassName="w-80 max-w-[calc(100vw-2rem)]"
            />
          </div>
        </>
      )}
    </section>
  );
}
