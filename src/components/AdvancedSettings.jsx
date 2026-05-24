"use client";

import { useRef, useState } from "react";
import { DEFAULT_INPUTS, DEFAULT_FOOTPRINT_INPUTS, MARKET_COMPETITIVENESS_PRESETS } from "@/lib/model";

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
          role="tooltip"
          className={`absolute left-0 top-full mt-1.5 z-20 rounded-lg bg-zinc-800 px-3 py-2.5 text-xs leading-relaxed text-white shadow-lg ${className}`}
        >
          {children}
        </span>
      )}
    </span>
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

  // Determine active Market Competitiveness position by matching initialCPA exactly
  const activeMC = MC_OPTIONS.find((o) => o.preset.initialCPA === inputs.initialCPA)?.label ?? null;

  return (
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
          unit="households"
          scale={1} precision={0} step={50000} min={50000} max={5000000}
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
          tooltip="SAM refers to the portion of the addressable market that is eligible for your products, reachable, creditworthy, etc. This is who you can actually convert."
          tooltipClassName="w-64"
        />
        <DerivedField
          label="SAM # of Households"
          value={sam.toLocaleString()}
          unit="households"
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
        />
        <NumberField
          fieldKey="m36Target"
          label="Target Active Members — Month 36"
          unit="members"
          scale={1} precision={0} step={500} min={0} max={500000}
          value={inputs.m36Target}
          onChange={onChange}
        />
        <NumberField
          fieldKey="m60Target"
          label="Target Active Members — Month 60"
          unit="members"
          scale={1} precision={0} step={1000} min={0} max={500000}
          value={inputs.m60Target}
          onChange={onChange}
        />

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
                This is the cost to acquire an active household (with funded accounts and
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
                households make up a small portion of any addressable market, and they are much harder
                to move. Consider significantly increasing Initial CPA and Steady-State CPA if you are
                targeting High Net Worth households.
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
        />
        <NumberField
          fieldKey="monthsToSteadyState"
          label="Months to Reach Steady-State"
          unit="months"
          scale={1} precision={0} step={3} min={6} max={60}
          value={inputs.monthsToSteadyState}
          onChange={onChange}
        />

      </div>
    </div>
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
      { key: "depositCannibRateA", label: "Deposit Cannibalization — Expansion Markets Only", unit: "% / yr",         scale: 100, precision: 1, step: 0.1,  min: 0,     max: 25     },
      { key: "depositCannibRateB", label: "Deposit Cannibalization — All Markets",            unit: "% / yr",         scale: 100, precision: 1, step: 0.5,  min: 0,     max: 50     },
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
      { key: "avgLoanBalance",      label: "Average Loan Balance",                           unit: "$ / borrower",   scale: 1,   precision: 0, step: 500,  min: 1000,  max: 100000 },
      { key: "rateCut",             label: "Rate Cut — Digital Loans",                        unit: "bps",            scale: 1,   precision: 0, step: 5,    min: 0,     max: 200    },
      { key: "loanCannibRateA",     label: "Loan Cannibalization — Expansion Markets Only",   unit: "% / yr",         scale: 100, precision: 2, step: 0.05, min: 0,     max: 25     },
      { key: "loanCannibRateB",     label: "Loan Cannibalization — All Markets",              unit: "% / yr",         scale: 100, precision: 1, step: 0.5,  min: 0,     max: 50     },
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
      { key: "avgTellerTransactionsPerMonth",  label: "Avg Teller Transactions / Month",      unit: "txns / mo",       scale: 1,   precision: 3,  step: 0.083,min: 0,  max: 10    },
      { key: "avgDigitalTransactionsPerMonth", label: "Avg Digital Transactions / Month",     unit: "txns / mo",       scale: 1,   precision: 0,  step: 1,    min: 0,  max: 100   },
      { key: "platformCost",                   label: "Digital Platform Infrastructure",      unit: "$ / member / yr", scale: 1,   precision: 0,  step: 5,    min: 0,  max: 200   },
      { key: "fraudCost",                      label: "Digital Fraud & ID Verification",      unit: "$ / member / yr", scale: 1,   precision: 0,  step: 1,    min: 0,  max: 100   },
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
      { key: "digitalAttritionYear1",       label: "Digital Attrition — Year 1",        unit: "% / yr", scale: 100, precision: 0, step: 1, min: 0, max: 100 },
      { key: "digitalAttritionSteadyState", label: "Digital Attrition — Steady State",  unit: "% / yr", scale: 100, precision: 0, step: 1, min: 0, max: 100 },
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
                unit="households"
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
                tooltip="SAM refers to the portion of the addressable market that is eligible for your products, reachable, creditworthy, etc. This is who you can actually convert."
              />
              <DerivedField label="SAM # of Households" value={sam.toLocaleString()} unit="households" />

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
    </div>
  );
}
