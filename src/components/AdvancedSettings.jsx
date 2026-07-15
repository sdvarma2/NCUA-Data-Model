"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { DEFAULT_INPUTS, DEFAULT_FOOTPRINT_INPUTS, MARKET_COMPETITIVENESS_PRESETS, suggestMilestones } from "@/lib/model";

// ── Info tooltip ─────────────────────────────────────────────────────────────

/**
 * Small ⓘ icon that shows a tooltip on hover, focus, and tap.
 * Positioned below-left of the icon so it doesn't overlap the input on the right.
 */
/**
 * `children` can be a plain string or JSX (paragraphs, lists, etc.).
 * `className` overrides the tooltip bubble width — default `w-64`; pass
 * `"w-80 max-w-[calc(100vw-2rem)]"` for longer content.
 */
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

// ── Suggest Milestones Modal ──────────────────────────────────────────────────

/**
 * Confirmation modal shown before applying suggested milestone values.
 * Renders as a fixed overlay so it sits above all panel content regardless of
 * scroll position. Clicking the backdrop dismisses without applying.
 */
function SuggestMilestonesModal({ current, suggested, onApply, onCancel }) {
  const rows = [
    { label: "Month 12",  currentVal: current.m12Target,  suggestedVal: suggested.m12Target  },
    { label: "Month 36",  currentVal: current.m36Target,  suggestedVal: suggested.m36Target  },
    { label: "Month 60",  currentVal: current.m60Target,  suggestedVal: suggested.m60Target  },
  ];
  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={onCancel}
      aria-modal="true"
      role="dialog"
      aria-labelledby="suggest-modal-title"
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5">
          <h2 id="suggest-modal-title" className="text-base font-semibold text-zinc-900 mb-1">
            Suggested Targets
          </h2>
          <p className="text-sm text-zinc-500 mb-4 leading-snug">
            Based on Bass parameters p&nbsp;=&nbsp;0.008, q&nbsp;=&nbsp;0.30 applied to your
            current SAM and attrition settings.
          </p>

          {/* Comparison table */}
          <div className="rounded-lg border border-zinc-200 overflow-hidden mb-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                    Milestone
                  </th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                    Current
                  </th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-zinc-900 uppercase tracking-wide">
                    Suggested
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {rows.map(({ label, currentVal, suggestedVal }) => {
                  const changed = suggestedVal !== currentVal;
                  return (
                    <tr key={label}>
                      <td className="py-2.5 px-3 text-zinc-600">{label}</td>
                      <td className="py-2.5 px-3 text-right text-zinc-400">
                        {currentVal.toLocaleString()}
                      </td>
                      <td className={`py-2.5 px-3 text-right font-medium ${changed ? "text-zinc-900" : "text-zinc-400"}`}>
                        {suggestedVal.toLocaleString()}
                        {changed && (
                          <span className={`ml-1.5 text-xs ${suggestedVal > currentVal ? "text-emerald-700" : "text-amber-700"}`}>
                            {suggestedVal > currentVal ? "▲" : "▼"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2.5 px-4 text-sm font-medium text-zinc-700 bg-white border border-zinc-300 rounded-lg hover:bg-zinc-50 transition-colors min-h-[44px]"
            >
              Keep current
            </button>
            <button
              type="button"
              onClick={onApply}
              className="flex-1 py-2.5 px-4 text-sm font-medium text-white bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors min-h-[44px]"
            >
              Apply suggestions
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Shared field-row layout ───────────────────────────────────────────────────

/**
 * Numeric input field with draft state.
 * `scale` converts stored→display (percent fields ×100).
 * On blur / Enter, clamps to [min, max] and calls onChange(fieldKey, stored).
 */
function NumberField({ fieldKey, label, unit, scale, precision, step, min, max, value, onChange, tooltip, tooltipClassName }) {
  const displayed     = (value * scale).toFixed(precision);
  const [draft, setDraft] = useState(displayed);
  const prevDisplayed = useRef(displayed);

  // Sync draft when external value changes (e.g., reset or preset applied)
  if (prevDisplayed.current !== displayed) {
    prevDisplayed.current = displayed;
    setDraft(displayed);
  }

  function commit() {
    const n = parseFloat(draft);
    if (isNaN(n)) { setDraft(displayed); return; }
    const clamped = Math.max(min, Math.min(max, n));
    onChange(fieldKey, clamped / scale);
    setDraft(clamped.toFixed(precision));
  }

  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-zinc-100 last:border-0">
      <span className="text-sm text-zinc-600 leading-snug flex items-center">
        {label}
        {tooltip && <InfoTip className={tooltipClassName}>{tooltip}</InfoTip>}
      </span>
      <div className="flex items-center gap-2 shrink-0">
        <input
          type="number"
          value={draft}
          step={step}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
          className="w-24 text-right text-sm rounded border border-zinc-400 px-2 py-1.5 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-zinc-500 bg-white text-zinc-900"
        />
        <span className="text-xs text-zinc-500 w-24 leading-tight">{unit}</span>
      </div>
    </div>
  );
}

/**
 * Free-text input field (e.g. market name).
 */
function TextField({ fieldKey, label, value, onChange }) {
  const [draft, setDraft] = useState(value ?? "");
  const prevValue = useRef(value);

  if (prevValue.current !== value) {
    prevValue.current = value;
    setDraft(value ?? "");
  }

  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-zinc-100 last:border-0">
      <span className="text-sm text-zinc-600 leading-snug">{label}</span>
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => onChange(fieldKey, draft)}
        onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
        className="w-48 text-right text-sm rounded border border-zinc-400 px-2 py-1.5 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-zinc-500 bg-white text-zinc-900"
      />
    </div>
  );
}

/**
 * Read-only derived value row (no input; shows a computed result).
 */
function DerivedField({ label, value, unit }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-zinc-100 last:border-0">
      <span className="text-sm text-zinc-500 leading-snug italic">{label}</span>
      <div className="flex items-center gap-2 shrink-0">
        <span className="w-24 text-right text-sm text-zinc-500 font-medium">{value}</span>
        <span className="text-xs text-zinc-500 w-24 leading-tight">{unit}</span>
      </div>
    </div>
  );
}

// ── Acquisition section ───────────────────────────────────────────────────────

const MC_OPTIONS = [
  { label: "Low",    preset: MARKET_COMPETITIVENESS_PRESETS.Low    },
  { label: "Medium", preset: MARKET_COMPETITIVENESS_PRESETS.Medium },
  { label: "High",   preset: MARKET_COMPETITIVENESS_PRESETS.High   },
];

function AcquisitionSection({ inputs, onChange, onBatchChange }) {
  const sam = Math.round(inputs.tam * (inputs.samPct / 100));
  const [suggestModal, setSuggestModal] = useState(null);

  // Determine active Market Competitiveness position by matching initialCPA exactly
  const activeMC = MC_OPTIONS.find((o) => o.preset.initialCPA === inputs.initialCPA)?.label ?? null;

  return (
    <>
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-600 mb-1 pt-4">
        Acquisition
      </h3>
      <div className="rounded-lg border border-zinc-200 bg-white px-4 divide-y-0">

        {/* ── Market Definition ──────────────────────────────────── */}
        <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400 pt-3 pb-1">
          Market Definition
        </p>

        <TextField
          fieldKey="marketName"
          label="Market Name / Geography"
          value={inputs.marketName}
          onChange={onChange}
        />
        <NumberField
          fieldKey="tam"
          label="Total Addressable Market (TAM)"
          unit="potential members"
          scale={1} precision={0} step={50000} min={50000} max={5000000}
          value={inputs.tam}
          onChange={onChange}
          tooltipClassName="w-80 max-w-[calc(100vw-2rem)]"
          tooltip="The total number of potential members in your target geography — every adult you could theoretically serve, before filtering for creditworthiness or product fit. If sourcing from census or FFIEC household data, multiply household counts by ~1.5–1.6 to convert to adults. Setting this too broadly inflates SAM and produces over-optimistic member projections; scope it to your actual launch market."
        />
        <NumberField
          fieldKey="samPct"
          label="Serviceable Addressable Market (SAM)"
          unit="% of TAM"
          scale={1} precision={0} step={5} min={5} max={100}
          value={inputs.samPct}
          onChange={onChange}
          tooltip="SAM refers to the portion of the addressable market that is eligible for your products, reachable, and creditworthy — the potential members you can actually convert."
          tooltipClassName="w-64"
        />
        <DerivedField
          label="SAM (Potential Members)"
          value={sam.toLocaleString()}
          unit="potential members"
        />

        {/* ── Membership Milestones ──────────────────────────────── */}
        <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400 pt-3 pb-1">
          Membership Milestones (net active members)
        </p>

        <NumberField
          fieldKey="m12Target"
          label="Target Active Members — Month 12"
          unit="members"
          scale={1} precision={0} step={250} min={0} max={500000}
          value={inputs.m12Target}
          onChange={onChange}
          tooltipClassName="w-80 max-w-[calc(100vw-2rem)]"
          tooltip="Net active members after attrition — not gross accounts opened. An active member has funded their account and is transacting. The Bass Curve optimizer fits p and q to hit all three milestones simultaneously, weighting Month 60 most heavily (3×). Month 12 reflects early-adopter signal; if this target is much higher than the Bass curve's natural early shape, the Simulation Detail will show ⚠ Ambitious."
        />
        <NumberField
          fieldKey="m36Target"
          label="Target Active Members — Month 36"
          unit="members"
          scale={1} precision={0} step={500} min={0} max={500000}
          value={inputs.m36Target}
          onChange={onChange}
          tooltipClassName="w-80 max-w-[calc(100vw-2rem)]"
          tooltip="Net active members after attrition at the 3-year mark. This is the inflection-point test — by Month 36, a realistic Bass Curve should be well past peak adoption velocity and settling into steady growth. Month 36 is weighted 2× in the Bass calibration optimizer. Use 'Suggest from SAM' to generate a value consistent with realistic Bass parameters for your SAM size."
        />
        <NumberField
          fieldKey="m60Target"
          label="Target Active Members — Month 60"
          unit="members"
          scale={1} precision={0} step={1000} min={0} max={500000}
          value={inputs.m60Target}
          onChange={onChange}
          tooltipClassName="w-80 max-w-[calc(100vw-2rem)]"
          tooltip="Net active members after attrition at the 5-year planning horizon — the primary target the model is calibrated to. Weighted 3× in the Bass optimizer, so the calibrated curve will nail this number first and accept larger residuals at Months 12 and 36. As a sanity check: Month 60 active members should be noticeably less than the SAM (market saturation takes longer than 5 years for most products) and noticeably less than total gross acquired (attrition is real)."
        />

        {/* Suggest from SAM button */}
        <div className="py-2 flex justify-end">
          <button
            type="button"
            onClick={() => setSuggestModal(suggestMilestones(inputs))}
            className="text-sm text-zinc-500 hover:text-zinc-700 transition-colors flex items-center gap-1.5 min-h-[44px] px-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 shrink-0" aria-hidden="true">
              <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.83-4.401Z" clipRule="evenodd" />
            </svg>
            Suggest from SAM
          </button>
        </div>

        {/* ── Acquisition Economics ──────────────────────────────── */}
        <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400 pt-3 pb-1">
          Acquisition Economics
        </p>

        {/* Market Competitiveness preset toggle */}
        <div className="py-2.5 border-b border-zinc-100">
          <div className="flex items-center justify-between gap-3 mb-2">
            <span className="text-sm text-zinc-600 leading-snug">Market Competitiveness</span>
            <span className="text-xs text-zinc-400 leading-tight w-24 text-right">preset</span>
          </div>
          <div className="flex gap-1.5">
            {MC_OPTIONS.map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => onBatchChange(opt.preset)}
                className={`flex-1 text-xs font-medium py-2 px-3 rounded border transition-colors min-h-[44px] ${
                  activeMC === opt.label
                    ? "bg-zinc-800 text-white border-zinc-800"
                    : "bg-white text-zinc-600 border-zinc-300 hover:border-zinc-500 hover:text-zinc-800"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <NumberField
          fieldKey="initialCPA"
          label="Initial Cost Per (Active Member) Acquisition"
          unit="$ / active member"
          scale={1} precision={0} step={25} min={50} max={2000}
          value={inputs.initialCPA}
          onChange={onChange}
          tooltipClassName="w-80 max-w-[calc(100vw-2rem)]"
          tooltip={
            <>
              <p className="mb-2">
                This is the cost to acquire an active member (with funded accounts and
                consistent usage). The cost to acquire an active member will be higher than the cost
                of acquisition overall because, especially for digital users, a significant number
                will join but not fund accounts.
              </p>
              <ul className="list-disc list-outside pl-3.5 space-y-1.5 mb-2">
                <li>
                  Cornerstone Advisors&rsquo; annual &ldquo;What&rsquo;s Going On in Banking&rdquo; survey
                  consistently shows credit union new-member CPA of $200&ndash;400, higher for funded accounts.
                </li>
                <li>
                  Neobank S-1 filings (SoFi 2021, Chime disclosures) show CPA in the $280&ndash;350
                  range before incentives.
                </li>
              </ul>
              <p className="mb-2">
                The above covers institutions with existing brand presence, established member trust,
                and branch density to support the product. Most credit unions have none of those
                advantages. This means that a $450 CPA is likely on the low end.
              </p>
              <p>
                When setting this number, also consider who you are trying to acquire. High Net Worth
                members make up a small portion of any addressable market, and they are much harder
                to move. Consider significantly increasing Initial CPA and Steady-State CPA if you are
                targeting High Net Worth members.
              </p>
            </>
          }
        />
        <NumberField
          fieldKey="steadyStateCPA"
          label="Steady-State CPA"
          unit="$ / active member"
          scale={1} precision={0} step={5} min={10} max={500}
          value={inputs.steadyStateCPA}
          onChange={onChange}
          tooltipClassName="w-80 max-w-[calc(100vw-2rem)]"
          tooltip="The theoretical CPA floor at full maturity — once referrals, word-of-mouth, and organic discovery dominate acquisition. In practice, most new-market CU programs do not approach this floor within a 5-year window; the logistic decay curve will still be well above steady state at Month 60. Benchmarks from SoFi, Ally, and Cornerstone suggest even established digital brands with years of scale remain at $150–250+ per funded account. Set this conservatively — the model will show the realistic cost trajectory rather than an optimistic floor."
        />
        <NumberField
          fieldKey="monthsToSteadyState"
          label="Months to Reach Steady-State"
          unit="months"
          scale={1} precision={0} step={3} min={6} max={60}
          value={inputs.monthsToSteadyState}
          onChange={onChange}
          tooltipClassName="w-80 max-w-[calc(100vw-2rem)]"
          tooltip="How long the CPA decay curve takes to travel from Initial CPA to Steady-State CPA. The model uses a logistic (S-curve) shape — CPA falls slowly at first, accelerates mid-program, then flattens near steady state. At monthsToSteadyState, CPA is ~98% of the way to the floor. Setting this to 60 means the curve barely reaches steady state within the planning window — a realistic default for new-market programs where brand-building takes a decade or more to fully mature."
        />

        {/* ── Bass Diffusion Multiplier ───────────────────────────────── */}
        <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400 pt-3 pb-1">
          Bass Diffusion Multiplier
        </p>

        <NumberField
          fieldKey="qMultiplier"
          label="Word-of-Mouth Rate Multiplier (q)"
          unit="× baseline"
          scale={1} precision={2} step={0.05} min={0.1} max={3.0}
          value={inputs.qMultiplier}
          onChange={onChange}
          tooltipClassName="w-80 max-w-[calc(100vw-2rem)]"
          tooltip={
            <>
              <p className="mb-2">
                Scales the Bass diffusion model&rsquo;s <strong>q</strong> (imitation / word-of-mouth) coefficient relative
                to the calibrated baseline. q governs how fast existing members refer others — the
                organic, peer-driven spread of the product.
              </p>
              <p className="mb-2">
                At Aggressive rate incentives, q is set to 1.55× because high rates generate strong social
                signal (&ldquo;my credit union is paying 5%!&rdquo;). At Conservative, 0.65× because lower-rate
                products spread more quietly through relationship channels.
              </p>
              <p className="mb-2">Values above 1.0 accelerate the peak of the Bass curve; below 1.0 push the peak later and lower.</p>
              <p>
                There is no equivalent multiplier for <strong>p</strong> (paid/outbound discovery) — p is
                instead solved to hold your Month 60 goal fixed under whatever rate posture is selected, since
                p represents the acquisition intensity a marketing budget can actually move. See Rate Incentives
                for the resulting required acquisition intensity.
              </p>
            </>
          }
        />

      </div>
    </div>

    {suggestModal && (
      <SuggestMilestonesModal
        current={{ m12Target: inputs.m12Target, m36Target: inputs.m36Target, m60Target: inputs.m60Target }}
        suggested={suggestModal}
        onApply={() => { onBatchChange(suggestModal); setSuggestModal(null); }}
        onCancel={() => setSuggestModal(null)}
      />
    )}
    </>
  );
}

// ── Remaining sections (Deposits, Loans, Servicing, Retention) ───────────────

const SECTIONS = [
  {
    id: "deposits",
    label: "Deposits",
    fields: [
      { key: "avgDepositBalance",  label: "Avg Deposit Balance",                              unit: "$ / member",     scale: 1,   precision: 0, step: 500,  min: 1000,  max: 100000 },
      { key: "rateBump",         label: "Initial Rate Bump",  unit: "bps",      scale: 1, precision: 0, step: 5, min: 0, max: 300,
        tooltip: "The Initial Rate Bump represents the premium you'll pay on deposits initially to attract new members." },
      { key: "ratePremiumDecay", label: "Rate Bump Decay",    unit: "bps / yr", scale: 1, precision: 0, step: 1, min: 0, max: 50,
        tooltip: "The Rate Bump Decay represents how many basis points per year you'll lower your deposit rate bump by." },
      { key: "rateBumpFloor",    label: "Rate Bump Floor",    unit: "bps",      scale: 1, precision: 0, step: 5, min: 0, max: 200,
        tooltip: "The Rate Bump Floor represents the lowest value your Rate Bump will decay to. When set to 0, the premium you pay over standard rates will decay each year until the rate matches your standard rates." },
      { key: "depositCannibRateA", label: "Deposit Cannibalization — Expansion Markets Only", unit: "% / yr",         scale: 100, precision: 1, step: 0.1,  min: 0,     max: 25,
        tooltipClassName: "w-80 max-w-[calc(100vw-2rem)]",
        tooltip: (
          <>
            <p className="mb-2">
              The fraction of the institution&rsquo;s <strong>existing</strong> deposit balance sheet that reprices to the digital product&rsquo;s premium rate each year. Cannibalization occurs when existing members shift balances to the new digital accounts to capture the higher rate — the institution pays more interest on balances it already held.
            </p>
            <p className="mb-2">
              <strong>Expansion Only (0.5%):</strong> minimal. New-market members are unlikely to be existing depositors; only the most rate-sensitive current members notice and move balances.
            </p>
            <p>Applied to the full existing deposit balance sheet, not just digital member deposits. This cost runs every month regardless of how many digital members are acquired.</p>
          </>
        ),
      },
      { key: "depositCannibRateB", label: "Deposit Cannibalization — All Markets",            unit: "% / yr",         scale: 100, precision: 1, step: 0.5,  min: 0,     max: 50,
        tooltipClassName: "w-80 max-w-[calc(100vw-2rem)]",
        tooltip: (
          <>
            <p className="mb-2">
              The fraction of the institution&rsquo;s <strong>existing</strong> deposit balance sheet that reprices to the digital product&rsquo;s premium rate each year under the All Markets scenario.
            </p>
            <p className="mb-2">
              <strong>All Markets (5%):</strong> substantially higher because the credit union is actively marketing the digital product to existing members. Rate-aware depositors opt in to earn the better rate on balances they already have — a predictable response to an internally publicized rate advantage.
            </p>
            <p>Applied to the full existing deposit balance sheet, not just digital member deposits. The difference between Scenario A and B cannibalization rates is one of the key drivers of the wider spread in Scenario B outcomes.</p>
          </>
        ),
      },
    ],
  },
  {
    id: "loans",
    label: "Loans",
    fields: [
      { key: "loanPenetrationRate", label: "Loan Penetration Rate",                          unit: "% of members",   scale: 100, precision: 0, step: 1,    min: 0,     max: 100,
        tooltipClassName: "w-80 max-w-[calc(100vw-2rem)]",
        tooltip: (
          <>
            <p className="mb-2">
              20% is the recommended ceiling for this value, especially in the early years of an expansion based on the following:
            </p>
            <ul className="list-disc list-outside pl-3.5 space-y-1.5">
              <li>
                SoFi (~20%) — the most directly comparable data point. SoFi is lending-native, has actively pushed loan cross-sell for years, and still sits at ~20% of members holding a loan. A credit union launching a new digital channel has less lending brand recognition than SoFi, not more.
              </li>
              <li>
                67% digital loan application abandonment rate (Cornerstone/Alkami 2024) — a structural headwind that suppresses actual uptake well below intent.
              </li>
            </ul>
          </>
        ),
      },
      { key: "avgLoanBalance",      label: "Average Loan Balance",                           unit: "$ / borrower",   scale: 1,   precision: 0, step: 500,  min: 1000,  max: 100000,
        tooltipClassName: "w-80 max-w-[calc(100vw-2rem)]",
        tooltip: "The average outstanding loan balance per digital member who carries a loan. Blends across all loan types the product offers — personal, auto, HELOC, etc. NCUA call report data shows credit union average loan balances ranging from $8k (personal/consumer) to $22k+ (auto and HELOC). Use a weighted average that reflects your expected product mix for digital-channel borrowers.",
      },
      { key: "rateCut",             label: "Rate Cut — Digital Loans",                        unit: "bps",            scale: 1,   precision: 0, step: 5,    min: 0,     max: 200,
        tooltipClassName: "w-80 max-w-[calc(100vw-2rem)]",
        tooltip: "The reduction in loan interest rate offered to digital members as an incentive for originating through the digital channel. This is a revenue reduction — the credit union earns less NII per loan dollar compared to its standard loan book. A 25 bps cut is a modest incentive; 50–75 bps is more competitive for auto or personal loans. Set to 0 if the digital product does not offer a rate advantage on loans.",
      },
      { key: "loanCannibRateA",     label: "Loan Cannibalization — Expansion Markets Only",   unit: "% / yr",         scale: 100, precision: 2, step: 0.05, min: 0,     max: 25,
        tooltipClassName: "w-80 max-w-[calc(100vw-2rem)]",
        tooltip: (
          <>
            <p className="mb-2">
              The fraction of the institution&rsquo;s <strong>existing</strong> loan book that reprices to the digital product&rsquo;s reduced rate each year. Occurs when existing borrowers refinance through the digital channel to capture the lower rate.
            </p>
            <p>
              <strong>Expansion Only (0.15%):</strong> minimal. New-market members are unlikely to be existing borrowers, so cannibalization of the existing loan book is low — only existing members who notice the rate differential and actively refinance.
            </p>
          </>
        ),
      },
      { key: "loanCannibRateB",     label: "Loan Cannibalization — All Markets",              unit: "% / yr",         scale: 100, precision: 1, step: 0.5,  min: 0,     max: 50,
        tooltipClassName: "w-80 max-w-[calc(100vw-2rem)]",
        tooltip: (
          <>
            <p className="mb-2">
              The fraction of the institution&rsquo;s <strong>existing</strong> loan book that reprices to the digital product&rsquo;s reduced rate each year under the All Markets scenario.
            </p>
            <p>
              <strong>All Markets (1.5%):</strong> higher because existing borrowers are actively aware of the digital product and its rate advantage. Rate-sensitive members who are already familiar with the credit union are more likely to refinance existing balances through the digital channel to save on interest.
            </p>
          </>
        ),
      },
    ],
  },
  {
    id: "servicing",
    label: "Servicing Cost",
    fields: [
      { key: "maintenanceTrad",    label: "Account Maintenance — Traditional",  unit: "$ / member / yr", scale: 1, precision: 0, step: 10, min: 0, max: 1000,
        tooltipClassName: "w-80 max-w-[calc(100vw-2rem)]",
        tooltip: (
          <>
            <p className="mb-2">
              The <strong>fully-loaded</strong> annual cost of maintaining a branch-reliant member —
              direct account operations plus allocated branch staff time, customer service overhead,
              and inbound call center volume. Cornerstone Advisors and Filene Institute research
              consistently puts this at $250–350/year per member when overhead is properly allocated.
            </p>
            <p>
              Note: the NCUA&rsquo;s observed $148/year gap between hybrid and branch-heavy
              institutions is a conservative floor, not the true traditional-vs-digital spread.
              Hybrid CUs still carry significant branch overhead for their non-digital members,
              which compresses their average below the true branch-member cost.
            </p>
          </>
        ),
      },
      { key: "maintenanceDigital", label: "Account Maintenance — Digital",    unit: "$ / member / yr", scale: 1, precision: 0, step: 5,  min: 0, max: 500,
        tooltipClassName: "w-80 max-w-[calc(100vw-2rem)]",
        tooltip: (
          <>
            <p className="mb-2">
              The annual cost of core account operations for a digital-only member: back-office
              processing, compliance, and basic customer support. <strong>Do not include platform
              infrastructure costs here</strong> — those are captured separately in the Digital
              Platform Infrastructure field below.
            </p>
            <p>
              Neobank unit economics typically show $50–100/year for this line item at scale.
              The $95 default reflects a credit union that hasn&rsquo;t yet reached neobank-scale
              digital efficiency.
            </p>
          </>
        ),
      },
      { key: "transactionCostTrad",            label: "Transaction Cost — Teller",            unit: "$ / transaction", scale: 1,   precision: 2,  step: 0.25, min: 0,  max: 20    },
      { key: "transactionCostDigital",         label: "Transaction Cost — Digital",           unit: "$ / transaction", scale: 1,   precision: 2,  step: 0.01, min: 0,  max: 5     },
      { key: "avgTellerTransactionsPerMonth",  label: "Avg Teller Transactions / Month",      unit: "txns / mo",       scale: 1,   precision: 3,  step: 0.083,min: 0,  max: 10,
        tooltipClassName: "w-80 max-w-[calc(100vw-2rem)]",
        tooltip: (
          <>
            <p className="mb-2">
              The average number of teller interactions per digital member per month. The default of 0.333 equals 4 teller visits per year — consistent with the Federal Reserve&rsquo;s &ldquo;How America Banks&rdquo; survey finding that even digital-primary members average 3–5 branch visits annually for complex needs (loan closings, disputes, large-value transactions).
            </p>
            <p>
              Adjust down if the digital product has no branch access; adjust up if your members are known to be branch-reliant. This drives the teller transaction cost on digital members&rsquo; side of the servicing savings calculation.
            </p>
          </>
        ),
      },
      { key: "avgDigitalTransactionsPerMonth", label: "Avg Digital Transactions / Month",     unit: "txns / mo",       scale: 1,   precision: 0,  step: 1,    min: 0,  max: 100,
        tooltipClassName: "w-80 max-w-[calc(100vw-2rem)]",
        tooltip: "The average number of digital self-service transactions per active member per month — app logins, transfers, bill pay, mobile deposits, and similar. Cornerstone Advisors and Alkami research shows active digital banking users average 18–25 transactions/month. The 20 txns/month default is conservative for truly engaged digital-only members. Raise it if your digital product targets heavy transactors; lower it for a savings-oriented product.",
      },
      { key: "platformCost",                   label: "Digital Platform Infrastructure",      unit: "$ / member / yr", scale: 1,   precision: 0,  step: 5,    min: 0,  max: 200,
        tooltipClassName: "w-80 max-w-[calc(100vw-2rem)]",
        tooltip: (
          <>
            <p className="mb-2">
              The annual per-member cost of running the digital platform: core banking API access, mobile app hosting, cloud infrastructure, and third-party fintech integrations (e.g., Plaid, Galileo, or similar). <strong>Do not include fraud, ID verification, or account maintenance here</strong> — those are captured in separate fields.
            </p>
            <p>
              CUSO and white-label digital banking vendors typically price at $50–120/member/year at credit-union scale. The $72 default reflects mid-tier digital banking infrastructure without proprietary build costs.
            </p>
          </>
        ),
      },
      { key: "fraudCost",                      label: "Digital Fraud & ID Verification",      unit: "$ / member / yr", scale: 1,   precision: 0,  step: 1,    min: 0,  max: 100,
        tooltipClassName: "w-80 max-w-[calc(100vw-2rem)]",
        tooltip: (
          <>
            <p className="mb-2">
              The annual per-member cost of digital fraud monitoring, identity verification at onboarding, and dispute resolution — the incremental risk cost of operating a no-branch, digital-only channel. Includes KYC/AML screening, ongoing transaction monitoring, and chargeback processing.
            </p>
            <p>
              GIACT, Alloy, and Socure publish per-member pricing in the $8–20/year range at scale for ID verification alone. Add fraud losses and dispute handling and $15–25/year is a realistic all-in figure. The $15 default is on the lower end; raise it if the product targets thin-file or new-to-credit segments with higher fraud exposure.
            </p>
          </>
        ),
      },
      { key: "costPerBranchVisit", label: "Cost Per Branch Visit",   unit: "$ / visit",   scale: 1, precision: 2, step: 0.5, min: 0, max: 50,
        tooltipClassName: "w-80 max-w-[calc(100vw-2rem)]",
        tooltip: (
          <>
            <p className="mb-2">
              The cost absorbed by the credit union each time a digital member visits a branch.
              This flows into the <strong>digital member cost</strong> — it reduces net
              per-member savings, it is not a savings figure.
            </p>
            <p>
              This is distinct from Transaction Cost — Teller above, which measures the
              operational cost of a teller interaction for a <em>traditional</em> member.
              A branch visit may involve multiple interactions; this field reflects the
              fully-loaded cost of the visit itself (staff time + facility overhead).
            </p>
          </>
        ),
      },
      { key: "freeVisits",         label: "Free Branch Visits / Yr", unit: "visits / yr", scale: 1, precision: 0, step: 1,   min: 0, max: 12,
        tooltipClassName: "w-80 max-w-[calc(100vw-2rem)]",
        tooltip: (
          <>
            <p className="mb-2">
              The number of branch visits per year included in the digital product offering.
              Each visit is absorbed by the credit union at the Cost Per Branch Visit rate
              above, reducing net per-member servicing savings.
            </p>
            <p className="mb-2">
              Setting this to 0 models a pure digital-only product with no branch access.
              The 4-visit default (roughly quarterly) reflects a common
              &ldquo;digital-first, branch-optional&rdquo; positioning — enough to handle
              complex servicing needs like loan closings or disputes without eroding the
              digital cost advantage.
            </p>
            <p>
              Branch access also serves a strategic purpose: it bridges members who move
              between your digital service area and existing branch footprint, and positions
              the product to integrate naturally as the branch network expands into new
              markets over time.
            </p>
          </>
        ),
      },
    ],
  },
  {
    id: "retention",
    label: "Retention",
    fields: [
      { key: "digitalAttritionYear1",       label: "Digital Attrition — Year 1",        unit: "% / yr", scale: 100, precision: 0, step: 1, min: 0, max: 100,
        tooltipClassName: "w-80 max-w-[calc(100vw-2rem)]",
        tooltip: (
          <>
            <p className="mb-2">
              The annual attrition rate in the first year of membership. Year 1 attrition is structurally higher than steady-state because it includes <strong>funded-but-inactive accounts</strong> — members who opened and funded an account but never established a usage pattern and churned out. This is a known characteristic of digital-only products.
            </p>
            <p>
              Neobank cohort data (Chime, Current, Varo disclosures) consistently shows 15–25% first-year attrition before the product reaches scale and improves onboarding. Credit unions with limited digital brand recognition should expect the higher end of that range.
            </p>
          </>
        ),
      },
      { key: "digitalAttritionSteadyState", label: "Digital Attrition — Steady State",  unit: "% / yr", scale: 100, precision: 0, step: 1, min: 0, max: 100,
        tooltipClassName: "w-80 max-w-[calc(100vw-2rem)]",
        tooltip: (
          <>
            <p className="mb-2">
              The annual attrition rate for <strong>engaged, active members</strong> past their first year — those who have demonstrated a real banking relationship by transacting regularly. This is the long-run retention benchmark.
            </p>
            <p>
              FDIC and NCUA member retention data for digital-primary credit union segments shows 5–10% annual attrition. The 7% default reflects a digital credit union that retains members better than a typical neobank but hasn&rsquo;t yet achieved the loyalty of a full-service branch relationship.
            </p>
          </>
        ),
      },
    ],
  },
];

function SectionBlock({ section, inputs, onChange }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-600 mb-1 pt-4 first:pt-0">
        {section.label}
      </h3>
      <div className="rounded-lg border border-zinc-200 bg-white px-4 divide-y-0">
        {section.fields.map((f) => (
          <NumberField
            key={f.key}
            fieldKey={f.key}
            label={f.label}
            unit={f.unit}
            scale={f.scale}
            precision={f.precision}
            step={f.step}
            min={f.min}
            max={f.max}
            value={inputs[f.key]}
            onChange={onChange}
            tooltip={f.tooltip}
            tooltipClassName={f.tooltipClassName}
          />
        ))}
      </div>
    </div>
  );
}

// ── Footprint-specific sections (Scenario B panel) ───────────────────────────

const FOOTPRINT_SECTIONS = [
  {
    id: "fp-deposits",
    label: "Deposits",
    fields: [
      { key: "avgDepositBalance",  label: "Avg Deposit Balance",       unit: "$ / member",     scale: 1,   precision: 0, step: 500, min: 1000, max: 100000 },
      { key: "rateBump",           label: "Initial Rate Bump",          unit: "bps",            scale: 1,   precision: 0, step: 5,   min: 0,    max: 300    },
      { key: "ratePremiumDecay",   label: "Rate Bump Decay",            unit: "bps / yr",       scale: 1,   precision: 0, step: 1,   min: 0,    max: 50     },
      { key: "rateBumpFloor",      label: "Rate Bump Floor",            unit: "bps",            scale: 1,   precision: 0, step: 5,   min: 0,    max: 200    },
    ],
  },
  {
    id: "fp-loans",
    label: "Loans",
    fields: [
      { key: "loanPenetrationRate", label: "Loan Penetration Rate",     unit: "% of members",  scale: 100, precision: 0, step: 1,   min: 0,    max: 100    },
      { key: "avgLoanBalance",      label: "Average Loan Balance",      unit: "$ / borrower",  scale: 1,   precision: 0, step: 500, min: 1000, max: 100000 },
      { key: "rateCut",             label: "Rate Cut — Digital Loans",  unit: "bps",            scale: 1,   precision: 0, step: 5,   min: 0,    max: 200    },
    ],
  },
  {
    id: "fp-retention",
    label: "Retention",
    fields: [
      { key: "digitalAttritionYear1",       label: "Digital Attrition — Year 1",       unit: "% / yr", scale: 100, precision: 0, step: 1, min: 0, max: 100 },
      { key: "digitalAttritionSteadyState", label: "Digital Attrition — Steady State", unit: "% / yr", scale: 100, precision: 0, step: 1, min: 0, max: 100 },
    ],
  },
];

// ── Top-level component ───────────────────────────────────────────────────────

export default function AdvancedSettings({ inputs, onChange, onBatchChange }) {
  const [open, setOpen] = useState(false);

  function handleReset() {
    // Reset acquisition fields individually
    const acquisitionKeys = [
      "marketName", "tam", "samPct",
      "m12Target", "m36Target", "m60Target",
      "initialCPA", "steadyStateCPA", "monthsToSteadyState",
      "qMultiplier", "attritionMultiplier",
    ];
    for (const key of acquisitionKeys) {
      onChange(key, DEFAULT_INPUTS[key]);
    }
    // Reset all remaining section fields
    for (const section of SECTIONS) {
      for (const f of section.fields) {
        onChange(f.key, DEFAULT_INPUTS[f.key]);
      }
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-2 text-sm font-medium text-zinc-700 hover:text-zinc-900 transition-colors min-h-[44px] py-2"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`w-4 h-4 transition-transform ${open ? "rotate-90" : ""}`}
        >
          <path
            fillRule="evenodd"
            d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z"
            clipRule="evenodd"
          />
        </svg>
        Advanced Settings
        {!open && (
          <span className="text-xs text-zinc-500 font-normal">
            — edit individual model inputs
          </span>
        )}
      </button>

      {open && (
        <div className="mt-2 space-y-4">
          <AcquisitionSection
            inputs={inputs}
            onChange={onChange}
            onBatchChange={onBatchChange}
          />

          {SECTIONS.map((section) => (
            <SectionBlock
              key={section.id}
              section={section}
              inputs={inputs}
              onChange={onChange}
            />
          ))}

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleReset}
              className="text-sm text-zinc-500 hover:text-zinc-700 underline underline-offset-2 transition-colors min-h-[44px] px-2"
            >
              Reset all to defaults
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Scenario B: Existing Footprint Settings ───────────────────────────────────

/**
 * Second collapsible panel — visible only when Scenario B is active.
 * Configures the inside-footprint member stream that runs in parallel with the
 * expansion-market stream and is blended in runSimulation().
 */
export function FootprintSettings({ inputs, marketing, onMarketingChange, onChange }) {
  const [open, setOpen] = useState(false);
  const [suggestModal, setSuggestModal] = useState(null);
  const sam = Math.round(inputs.tam * (inputs.samPct / 100));

  function handleReset() {
    for (const key of Object.keys(DEFAULT_FOOTPRINT_INPUTS)) {
      onChange(key, DEFAULT_FOOTPRINT_INPUTS[key]);
    }
    // If marketing was on, also reset the CPA fields to 0 (no-marketing default)
    if (!marketing) {
      onChange("initialCPA",    DEFAULT_FOOTPRINT_INPUTS.initialCPA);
      onChange("steadyStateCPA", DEFAULT_FOOTPRINT_INPUTS.steadyStateCPA);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-2 text-sm font-medium text-zinc-700 hover:text-zinc-900 transition-colors min-h-[44px] py-2"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`w-4 h-4 transition-transform ${open ? "rotate-90" : ""}`}
        >
          <path
            fillRule="evenodd"
            d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z"
            clipRule="evenodd"
          />
        </svg>
        All Markets — Existing Footprint Settings
        {!open && (
          <span className="text-xs text-zinc-500 font-normal">
            — configure inside-footprint acquisition &amp; economics
          </span>
        )}
      </button>

      {open && (
        <div className="mt-2 space-y-4">

          {/* ── Marketing toggle ──────────────────────────────────────────── */}
          <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3.5">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={marketing}
                onChange={(e) => onMarketingChange(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-zinc-400 accent-zinc-800 shrink-0"
              />
              <span className="text-sm text-zinc-700 leading-snug">
                <span className="font-medium">Actively market inside existing branch footprint</span>
                <span className="block text-zinc-500 mt-0.5">
                  If unchecked, CPA is $0 — any inside-footprint acquisitions are incidental
                  to existing marketing efforts. Onboarding costs are already captured in
                  the shared servicing fields.
                </span>
              </span>
            </label>
          </div>

          {/* ── Acquisition ───────────────────────────────────────────────── */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-600 mb-1 pt-0">
              Acquisition
            </h3>
            <div className="rounded-lg border border-zinc-200 bg-white px-4 divide-y-0">

              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400 pt-3 pb-1">
                Market Definition
              </p>
              <TextField
                fieldKey="marketName"
                label="Market Name / Geography"
                value={inputs.marketName}
                onChange={onChange}
              />
              <NumberField
                fieldKey="tam"
                label="Total Addressable Market (TAM)"
                unit="potential members"
                scale={1} precision={0} step={10000} min={10000} max={5000000}
                value={inputs.tam}
                onChange={onChange}
              />
              <NumberField
                fieldKey="samPct"
                label="Serviceable Addressable Market (SAM)"
                unit="% of TAM"
                scale={1} precision={0} step={5} min={5} max={100}
                value={inputs.samPct}
                onChange={onChange}
                tooltip="SAM refers to the portion of the addressable market that is eligible for your products, reachable, and creditworthy — the potential members you can actually convert."
              />
              <DerivedField label="SAM (Potential Members)" value={sam.toLocaleString()} unit="potential members" />

              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400 pt-3 pb-1">
                Membership Milestones (net active members)
              </p>
              <NumberField
                fieldKey="m12Target"
                label="Target Active Members — Month 12"
                unit="members"
                scale={1} precision={0} step={100} min={0} max={500000}
                value={inputs.m12Target}
                onChange={onChange}
              />
              <NumberField
                fieldKey="m36Target"
                label="Target Active Members — Month 36"
                unit="members"
                scale={1} precision={0} step={250} min={0} max={500000}
                value={inputs.m36Target}
                onChange={onChange}
              />
              <NumberField
                fieldKey="m60Target"
                label="Target Active Members — Month 60"
                unit="members"
                scale={1} precision={0} step={500} min={0} max={500000}
                value={inputs.m60Target}
                onChange={onChange}
              />

              {/* Suggest from SAM button */}
              <div className="py-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSuggestModal(suggestMilestones(inputs))}
                  className="text-sm text-zinc-500 hover:text-zinc-700 transition-colors flex items-center gap-1.5 min-h-[44px] px-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 shrink-0" aria-hidden="true">
                    <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.83-4.401Z" clipRule="evenodd" />
                  </svg>
                  Suggest from SAM
                </button>
              </div>

              {marketing && (
                <>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400 pt-3 pb-1">
                    Acquisition Economics
                  </p>
                  <NumberField
                    fieldKey="initialCPA"
                    label="Initial Cost Per (Active Member) Acquisition"
                    unit="$ / active member"
                    scale={1} precision={0} step={25} min={0} max={2000}
                    value={inputs.initialCPA}
                    onChange={onChange}
                  />
                  <NumberField
                    fieldKey="steadyStateCPA"
                    label="Steady-State CPA"
                    unit="$ / active member"
                    scale={1} precision={0} step={5} min={0} max={500}
                    value={inputs.steadyStateCPA}
                    onChange={onChange}
                  />
                  <NumberField
                    fieldKey="monthsToSteadyState"
                    label="Months to Reach Steady-State"
                    unit="months"
                    scale={1} precision={0} step={3} min={6} max={60}
                    value={inputs.monthsToSteadyState}
                    onChange={onChange}
                  />
                </>
              )}
            </div>
          </div>

          {/* ── Deposits, Loans, Retention ────────────────────────────────── */}
          {FOOTPRINT_SECTIONS.map((section) => (
            <SectionBlock
              key={section.id}
              section={section}
              inputs={inputs}
              onChange={onChange}
            />
          ))}

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleReset}
              className="text-sm text-zinc-500 hover:text-zinc-700 underline underline-offset-2 transition-colors min-h-[44px] px-2"
            >
              Reset to footprint defaults
            </button>
          </div>
        </div>
      )}

      {suggestModal && (
        <SuggestMilestonesModal
          current={{ m12Target: inputs.m12Target, m36Target: inputs.m36Target, m60Target: inputs.m60Target }}
          suggested={suggestModal}
          onApply={() => {
            onChange("m12Target", suggestModal.m12Target);
            onChange("m36Target", suggestModal.m36Target);
            onChange("m60Target", suggestModal.m60Target);
            setSuggestModal(null);
          }}
          onCancel={() => setSuggestModal(null)}
        />
      )}
    </div>
  );
}
