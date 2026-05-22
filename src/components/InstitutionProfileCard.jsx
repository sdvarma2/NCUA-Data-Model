"use client";

import { useState } from "react";
import { toTitleCase, formatCurrency, formatPct, formatAssets, formatCount } from "@/lib/formatters";
import DigitalDensityLegend from "@/components/DigitalDensityLegend";

const INTENSITY_LABELS = {
  branch_heavy:    "Branch-Heavy",
  branch_balanced: "Branch-Balanced",
  hybrid:          "Hybrid*",
  digital_leaning: "Digital-Leaning",
  very_digital:    "Very Digital",
};

const INTENSITY_EXPLANATIONS = {
  branch_heavy:    "Primarily branch-served — most services are delivered in person. Significant efficiency gains are possible with digital adoption.",
  branch_balanced: "Branch-centric with growing digital adoption. Room to grow digital channels before reducing branch infrastructure.",
  hybrid:          "Already in the Hybrid* benchmark cohort — the target state for this model. Balances digital reach with selective branch presence.",
  digital_leaning: "Digital-first with selective branch presence. Well-positioned for digital product expansion.",
  very_digital:    "Highly digital — minimal branch infrastructure relative to membership.",
};

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

export default function InstitutionProfileCard({ institution, institutions = [] }) {
  const [showLegend, setShowLegend] = useState(false);

  if (!institution) return null;

  const {
    CU_NAME, STATE, CITY, assets_b, members, branch_count,
    members_per_branch, opex_per_member, occupancy_per_member,
    nim_pct, roa_pct, digital_intensity,
    member_gap_to_hybrid, branch_surplus_vs_hybrid, opex_gap_vs_hybrid_median,
    hybrid_opex_p25, hybrid_opex_p50, hybrid_opex_p75,
    hybrid_occupancy_p50, hybrid_nim_p50, hybrid_roa_p50,
  } = institution;

  const isAtHybrid = branch_surplus_vs_hybrid === 0 && member_gap_to_hybrid === 0;

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
        <Section title="Operating Costs vs Hybrid* Benchmark">
          <MetricRow
            label="Total Operating Cost / Member"
            value={formatCurrency(opex_per_member)}
            benchmarkBand={{
              label: "Hybrid* Benchmark (Percentile)",
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
          />
        </Section>

        {/* Revenue */}
        <Section title="Revenue & Profitability vs Hybrid* Benchmark">
          <MetricRow
            label="Net Interest Margin"
            value={formatPct(nim_pct)}
            benchmarks={formatPct(hybrid_nim_p50)}
          />
          <MetricRow
            label="Return on Assets"
            value={formatPct(roa_pct)}
            benchmarks={formatPct(hybrid_roa_p50)}
          />
        </Section>

        {/* Gap to Hybrid */}
        <Section title="Gap to Hybrid*">
          <div className="space-y-2 text-sm">
            {opex_gap_vs_hybrid_median > 0 ? (
              <p className="text-zinc-600">
                <span className="font-semibold text-amber-700">{formatCurrency(opex_gap_vs_hybrid_median)}/member above Hybrid* median</span>
                {" "}— reducing overhead to Hybrid* levels would free up significant margin.
              </p>
            ) : (
              <p className="text-zinc-600">
                <span className="font-semibold text-emerald-700">{formatCurrency(Math.abs(opex_gap_vs_hybrid_median))}/member below Hybrid* median</span>
                {" "}— already operating efficiently relative to the benchmark.
              </p>
            )}

            {isAtHybrid ? (
              <p className="text-emerald-700 font-semibold">Already at Hybrid* density — no gap to close.</p>
            ) : branch_surplus_vs_hybrid > 0 ? (
              <p className="text-zinc-600">
                <span className="font-semibold">{branch_surplus_vs_hybrid} branches</span>
                {" "}would need to be consolidated at current membership level to reach Hybrid* density.
              </p>
            ) : (
              <p className="text-zinc-600">
                Needs{" "}
                <span className="font-semibold">{formatCount(member_gap_to_hybrid)} members</span>
                {" "}at current branch count to reach Hybrid* density.
              </p>
            )}
          </div>
        </Section>

        <p className="mt-4 text-xs text-zinc-500 leading-relaxed">
          *Refer to the Digital Density info-tip for a definition of this term.
        </p>
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
              Digital Density refers to the how many members an institution has per branch. Higher members per branch (density) indicates stronger digital reliance across the institution's membership. For the purposes of this model, the goal is to simulate strategies that move Branch-Balanced and Branch-Heavy institutions towards the Hybrid model.
            </p>
            <DigitalDensityLegend institutions={institutions} />
          </div>
        </div>
      )}
    </>
  );
}
