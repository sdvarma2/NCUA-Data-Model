"use client";

import { computeModelHealth } from "@/lib/model";

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
 */
function HealthRow({ label, value, status = "neutral", hint }) {
  const valueClass = STATUS_CLASSES[status]?.value ?? STATUS_CLASSES.neutral.value;
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-zinc-100 last:border-0">
      <span className="text-sm text-zinc-600 leading-snug">{label}</span>
      <div className="flex items-center gap-2 shrink-0">
        {status !== "neutral" && <StatusDot status={status} />}
        <span className={`text-sm font-medium tabular-nums ${valueClass}`}>
          {value}
        </span>
        {hint && (
          <span className="text-xs text-zinc-400 leading-tight text-right w-20 hidden sm:block">
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
      <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
        {label}
      </p>
      {description && (
        <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug">
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
    ? `${fmtDollars(h.annualCannibDragScenarioB)} (${fmtPct(h.cannibDragAsPctOfNII)} of NII)`
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
        <p className="text-xs text-zinc-400 mt-0.5 leading-snug">
          Derived instrument values — verify inputs are producing a plausible
          model before running the simulation.
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
          label="Servicing savings"
          value={`$${Math.round(h.servicingSavingsPerMemberYr)}`}
          status={savingsStatus}
          hint="target $90–150"
        />
        <HealthRow
          label="Rate premium cost"
          value={`$${Math.round(h.ratePremiumPerMemberYr)}`}
          status="neutral"
          hint="deposit + loan"
        />
        <HealthRow
          label="Net (savings − premium)"
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
          label="Gross NII"
          value={`$${Math.round(h.monthlyNIIper1000).toLocaleString()}`}
          status="neutral"
        />
        <HealthRow
          label="Rate premium cost"
          value={`$${Math.round(h.monthlyRatePremiumPer1000).toLocaleString()}`}
          status="neutral"
        />
        <HealthRow
          label="NII coverage ratio"
          value={h.niiCoverageRatio == null ? "—" : `${h.niiCoverageRatio.toFixed(1)}×`}
          status={coverageStatus}
          hint="target > 3×"
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
              label="Annual cannibalization drag"
              value={cannibLabel}
              status={cannibStatus}
              hint="target < 5%"
            />
          </div>
        </>
      )}
    </section>
  );
}
