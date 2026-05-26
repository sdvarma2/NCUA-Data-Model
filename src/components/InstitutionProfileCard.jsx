"use client";

import { useState } from "react";
import { toTitleCase, formatCurrency, formatPct, formatAssets, formatCount } from "@/lib/formatters";
import DigitalDensityLegend from "@/components/DigitalDensityLegend";
import { DEFAULT_INPUTS } from "@/lib/model";

const INTENSITY_LABELS = {
  branch_heavy:    "Branch-Heavy",
  branch_balanced: "Branch-Balanced",
  hybrid:          "Hybrid",
  digital_leaning: "Digital-Leaning",
  very_digital:    "Very Digital",
};

const INTENSITY_EXPLANATIONS = {
  branch_heavy:
    "Primarily branch-served — most members interact in person. Often paired with strong ROA in markets with limited digital competition. The question for a digital expansion is whether net-new digital members bring deposit and loan balances that match this institution's existing margin profile.",
  branch_balanced:
    "Branch-centric with meaningful digital adoption. The institution's ROA reflects a mature model — digital expansion is accretive when it attracts net-new assets rather than repricing balances already on the books.",
  hybrid:
    "High digital density relative to branch count. Well-positioned for a dedicated digital-only channel. The key question is whether a new product tier can grow assets and defend market share at returns consistent with this institution's financial profile.",
  digital_leaning:
    "Digital-first with selective branch presence. Incremental digital product additions extend an existing digital strategy with lower infrastructure overhead.",
  very_digital:
    "Highly digital — minimal branch infrastructure relative to membership. Near-term digital product additions are natural extensions of an established digital-first model.",
};

// ── ROA Context helpers ───────────────────────────────────────────────────────

/**
 * Given an institution and the current model inputs, compute the ROA-anchored
 * metrics that replace the old "Gap to Hybrid" section.
 *
 * Break-even deposit balance: the avg deposits each new digital member must
 * carry for the channel to be ROA-neutral.  Formula:
 *   annualProgramCost / marginSpread
 * where marginSpread = (NIM − steady_rate_premium − ROA) / 100.
 *
 * Cannibalization drag: estimated bps of ROA compression from existing deposits
 * repricing to the digital rate under Scenario B.  Assumes deposits ≈ 80% of assets.
 */
function computeDigitalROAContext(institution, inputs) {
  const { nim_pct, roa_pct } = institution;

  // Annual per-member program cost at steady state, amortizing CPA over expected
  // member life (1 / attritionSteadyState).
  const amortizedCPA = inputs.steadyStateCPA * inputs.digitalAttritionSteadyState;
  const annualProgramCost =
    inputs.maintenanceDigital +
    inputs.platformCost +
    inputs.fraudCost +
    inputs.transactionCostDigital * inputs.avgDigitalTransactionsPerMonth * 12 +
    inputs.transactionCostTrad * inputs.avgTellerTransactionsPerMonth * 12 +
    inputs.costPerBranchVisit * inputs.freeVisits +
    amortizedCPA;

  // Steady-state rate premium floor: bps → pct
  const ratePremiumSteadyPct = inputs.rateBumpFloor / 100;

  // Net spread available above current ROA after absorbing the steady-state rate premium.
  // This is the margin that must cover annual program costs.
  const marginSpreadPct = nim_pct - ratePremiumSteadyPct - roa_pct;

  // Break-even deposit balance per digital member.
  // Each member brings balance B; their net income contribution is B × (marginSpread/100).
  // That must equal annualProgramCost → B = cost / (marginSpread/100).
  const breakEvenDepositBalance =
    marginSpreadPct > 0.01
      ? annualProgramCost / (marginSpreadPct / 100)
      : null; // NIM − premium − ROA ≤ ~0 → can't break even on deposits alone

  // Scenario B cannibalization ROA drag (in bps).
  // Existing deposits ≈ 80% of assets.
  // Additional interest cost = deposits × cannibrateB × ratePremium_decimal.
  // ROA drag (decimal) = 0.80 × cannibrateB × (rateBump/10000).
  // ROA drag (bps) = 0.80 × cannibrateB × rateBump.
  const D2A = 0.80; // deposit-to-asset ratio approximation
  const cannibDragBps_year1  = D2A * inputs.depositCannibRateB * inputs.rateBump;
  const cannibDragBps_steady = D2A * inputs.depositCannibRateB * inputs.rateBumpFloor;

  return {
    annualProgramCost: Math.round(annualProgramCost),
    marginSpreadPct,
    breakEvenDepositBalance,
    ratePremiumSteadyPct,
    cannibDragBps_year1:  Math.round(cannibDragBps_year1 * 10) / 10,
    cannibDragBps_steady: Math.round(cannibDragBps_steady * 10) / 10,
  };
}

/** Format a break-even balance rounded to the nearest $500. */
function fmtBreakEven(n) {
  const r = Math.round(n / 500) * 500;
  const k = r / 1000;
  return `~$${Number.isInteger(k) ? `${k}k` : `${k.toFixed(1)}k`}`;
}

/** Status → Tailwind text-color class. */
function statusClass(s) {
  if (s === "green") return "text-emerald-700";
  if (s === "amber") return "text-amber-700";
  return "text-red-600";
}

// ── UI primitives ─────────────────────────────────────────────────────────────

function InfoButton({ onClick }) {
  return (
    <button
      aria-label="Learn more about Digital Density"
      onClick={onClick}
      className="text-zinc-500 hover:text-zinc-700 transition-colors"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
        <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" clipRule="evenodd" />
      </svg>
    </button>
  );
}

function MetricRow({ label, value, benchmarks, benchmarkLabel, benchmarkBand }) {
  const bArr = Array.isArray(benchmarks) ? benchmarks : benchmarks ? [benchmarks] : [];
  return (
    <div className="border-b border-zinc-100 last:border-0">
      <div className="flex items-baseline justify-between py-1.5">
        <span className="text-sm text-zinc-600">{label}</span>
        <div className="text-right">
          <span className="text-sm font-semibold text-zinc-900">{value}</span>
          {bArr.length > 0 && (
            <span className="ml-2 text-xs text-zinc-500">
              {benchmarkLabel ?? "Hybrid* median"}{" "}
              {bArr.map((b, i) => (
                <span key={i}><span>{b}</span>{i < bArr.length - 1 ? " · " : ""}</span>
              ))}
            </span>
          )}
        </div>
      </div>
      {benchmarkBand && (
        <div className="pb-3">
          <p className="text-xs text-zinc-500 mb-2">{benchmarkBand.label}</p>
          <div className="grid grid-cols-3 gap-2">
            {benchmarkBand.columns.map(({ label: colLabel, value: colValue }) => (
              <div key={colLabel} className="rounded-md bg-zinc-50 px-2 py-1.5 text-center">
                <p className="text-xs text-zinc-500 mb-0.5">{colLabel}</p>
                <p className="text-sm font-semibold text-zinc-700">{colValue}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, children, action }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-1.5 mb-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-600">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

/**
 * A single ROA-context metric: label, a prominent color-coded value,
 * and a one-to-two sentence description below.
 */
function ContextBlock({ label, value, status, description }) {
  return (
    <div className="py-3 border-b border-zinc-100 last:border-0">
      <div className="flex items-baseline justify-between gap-3 mb-1">
        <span className="text-sm text-zinc-600">{label}</span>
        <span className={`text-sm font-semibold tabular-nums shrink-0 ${statusClass(status)}`}>
          {value}
        </span>
      </div>
      <p className="text-xs text-zinc-500 leading-snug">{description}</p>
    </div>
  );
}

export default function InstitutionProfileCard({ institution, institutions = [], inputs = DEFAULT_INPUTS }) {
  const [showLegend, setShowLegend] = useState(false);

  if (!institution) return null;

  const {
    CU_NAME, STATE, CITY, assets_b, members, branch_count,
    members_per_branch, opex_per_member, occupancy_per_member,
    nim_pct, roa_pct, digital_intensity,
    hybrid_opex_p25, hybrid_opex_p50, hybrid_opex_p75,
    hybrid_occupancy_p50,
  } = institution;

  const ctx = computeDigitalROAContext(institution, inputs);

  return (
    <>
      <div className="rounded-lg border border-zinc-200 bg-white p-6">

        {/* Identity */}
        <div className="mb-5">
          <h2 className="text-xl font-semibold text-zinc-900">{toTitleCase(CU_NAME)}</h2>
          <p className="text-sm text-zinc-500 mt-0.5">{toTitleCase(CITY)}, {STATE}</p>
          <div className="flex gap-4 mt-3 text-sm">
            <div>
              <p className="text-xs text-zinc-500">Assets</p>
              <p className="font-semibold text-zinc-800">{formatAssets(assets_b)}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Members</p>
              <p className="font-semibold text-zinc-800">{formatCount(members)}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Branches</p>
              <p className="font-semibold text-zinc-800">{branch_count}</p>
            </div>
          </div>
        </div>

        {/* Digital Density */}
        <Section
          title="Digital Density"
          action={<InfoButton onClick={() => setShowLegend(true)} />}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-block rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-700">
              {INTENSITY_LABELS[digital_intensity] ?? digital_intensity}
            </span>
            <span className="text-xs text-zinc-500">
              {formatCount(members_per_branch)} members / branch
            </span>
          </div>
          <p className="text-xs text-zinc-500 leading-relaxed">
            {INTENSITY_EXPLANATIONS[digital_intensity]}
          </p>
        </Section>

        {/* Operating Costs */}
        <Section title="Operating Costs">
          <MetricRow
            label="Total Operating Cost / Member"
            value={formatCurrency(opex_per_member)}
            benchmarkBand={{
              label: "High-Digital-Density Peer Range (Percentile)",
              columns: [
                { label: "25th", value: formatCurrency(hybrid_opex_p25) },
                { label: "50th", value: formatCurrency(hybrid_opex_p50) },
                { label: "75th", value: formatCurrency(hybrid_opex_p75) },
              ],
            }}
          />
          <MetricRow
            label="Occupancy Cost / Member"
            value={formatCurrency(occupancy_per_member)}
            benchmarks={formatCurrency(hybrid_occupancy_p50)}
            benchmarkLabel="High-digital-density peer median"
          />
        </Section>

        {/* Revenue */}
        <Section title="Revenue & Profitability">
          <MetricRow
            label="Net Interest Margin"
            value={formatPct(nim_pct)}
          />
          <MetricRow
            label="Return on Assets"
            value={formatPct(roa_pct)}
          />
        </Section>

        {/* Digital Program ROA Analysis */}
        <Section title="Digital Program ROA Analysis">
          {/* Break-even deposit balance */}
          {ctx.breakEvenDepositBalance != null ? (() => {
            const be = ctx.breakEvenDepositBalance;
            const status = be < 10000 ? "green" : be < 20000 ? "amber" : "red";
            const statusNote =
              be < 10000
                ? "Favorable — consistent with typical credit union member deposit balances."
                : be < 20000
                ? "Achievable, but requires attracting members who carry meaningful deposit balances."
                : "Challenging — the program can only be ROA-neutral if it targets high-balance members.";
            return (
              <ContextBlock
                label="Break-Even Deposit / Digital Member"
                value={fmtBreakEven(be)}
                status={status}
                description={`Avg deposits each digital member must carry for the program to be ROA-neutral at this institution's current margins. Based on $${ctx.annualProgramCost}/yr in steady-state program costs against a ${ctx.marginSpreadPct.toFixed(2)}% net spread (${formatPct(nim_pct)} NIM − ${ctx.ratePremiumSteadyPct.toFixed(2)}% steady-state premium − ${formatPct(roa_pct)} ROA). ${statusNote}`}
              />
            );
          })() : (
            <ContextBlock
              label="Break-Even Deposit / Digital Member"
              value="N/A"
              status="red"
              description={`NIM (${formatPct(nim_pct)}) minus the steady-state rate premium and current ROA (${formatPct(roa_pct)}) leaves no net spread to absorb program costs from deposits alone. Loan cross-sell would be required for the program to be ROA-positive.`}
            />
          )}

          {/* Scenario B cannibalization drag */}
          {(() => {
            const y1 = ctx.cannibDragBps_year1;
            const st = ctx.cannibDragBps_steady;
            const status = y1 < 3 ? "green" : y1 < 8 ? "amber" : "red";
            return (
              <ContextBlock
                label="Scenario B Cannibalization Drag"
                value={`~${y1} bps → ${st} bps`}
                status={status}
                description={`Estimated ROA compression (Year 1 → steady state) from existing member deposits repricing to the digital product's premium rate. A floor cost that runs regardless of how many new members are acquired. Rises directly with the rate premium set in Advanced Settings.`}
              />
            );
          })()}
        </Section>
      </div>

      {/* Digital Density Legend Modal */}
      {showLegend && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Digital Density Legend"
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 overflow-y-auto"
          onClick={(e) => { if (e.target === e.currentTarget) setShowLegend(false); }}
        >
          <div className="relative bg-white rounded-xl shadow-xl max-w-3xl w-full mt-8 mb-8 p-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-semibold text-zinc-900">Digital Density</h2>
              <button
                aria-label="Close"
                onClick={() => setShowLegend(false)}
                className="text-zinc-500 hover:text-zinc-700 transition-colors p-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                </svg>
              </button>
            </div>
            <p className="text-sm text-zinc-500 leading-relaxed mb-5">
              Digital Density measures members per branch. Higher density indicates greater digital reliance across the membership. Institutions are classified into five tiers based on NCUA call report data. A higher tier reflects existing digital adoption — it does not imply that lower-density institutions need to change their model; it describes where they currently sit.
            </p>
            <DigitalDensityLegend institutions={institutions} />
          </div>
        </div>
      )}
    </>
  );
}
