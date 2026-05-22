"use client";

import { useRef, useState } from "react";
import { DEFAULT_INPUTS, MARKET_COMPETITIVENESS_PRESETS } from "@/lib/model";

// ── Shared field-row layout ───────────────────────────────────────────────────

/**
 * Numeric input field with draft state.
 * `scale` converts stored→display (percent fields ×100).
 * On blur / Enter, clamps to [min, max] and calls onChange(fieldKey, stored).
 */
function NumberField({ fieldKey, label, unit, scale, precision, step, min, max, value, onChange }) {
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
      <span className="text-sm text-zinc-600 leading-snug">{label}</span>
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
          label="Market name / geography"
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
          label="SAM as % of TAM"
          unit="% of TAM"
          scale={1} precision={0} step={5} min={5} max={100}
          value={inputs.samPct}
          onChange={onChange}
        />
        <DerivedField
          label="Serviceable Addressable Market (SAM)"
          value={sam.toLocaleString()}
          unit="households"
        />

        {/* ── Membership Milestones ──────────────────────────────── */}
        <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400 pt-3 pb-1">
          Membership Milestones (net active members)
        </p>

        <NumberField
          fieldKey="m12Target"
          label="Target active members — Month 12"
          unit="members"
          scale={1} precision={0} step={250} min={0} max={500000}
          value={inputs.m12Target}
          onChange={onChange}
        />
        <NumberField
          fieldKey="m36Target"
          label="Target active members — Month 36"
          unit="members"
          scale={1} precision={0} step={500} min={0} max={500000}
          value={inputs.m36Target}
          onChange={onChange}
        />
        <NumberField
          fieldKey="m60Target"
          label="Target active members — Month 60"
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
          label="Initial CPA"
          unit="$ / active member"
          scale={1} precision={0} step={25} min={50} max={2000}
          value={inputs.initialCPA}
          onChange={onChange}
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
          label="Months to reach steady-state"
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
      { key: "avgDepositBalance",  label: "Avg deposit balance",                  unit: "$ / member",     scale: 1,   precision: 0, step: 500,  min: 1000,  max: 100000 },
      { key: "rateBump",           label: "Rate bump — digital deposits",          unit: "bps",            scale: 1,   precision: 0, step: 5,    min: 0,     max: 300    },
      { key: "ratePremiumDecay",   label: "Rate premium decay",                    unit: "bps / yr",       scale: 1,   precision: 0, step: 1,    min: 0,     max: 50     },
      { key: "depositCannibRateA", label: "Deposit cannibalization — Scenario A",  unit: "% / yr",         scale: 100, precision: 1, step: 0.1,  min: 0,     max: 25     },
      { key: "depositCannibRateB", label: "Deposit cannibalization — Scenario B",  unit: "% / yr",         scale: 100, precision: 1, step: 0.5,  min: 0,     max: 50     },
    ],
  },
  {
    id: "loans",
    label: "Loans",
    fields: [
      { key: "loanPenetrationRate", label: "Loan penetration rate",               unit: "% of members",   scale: 100, precision: 0, step: 1,    min: 0,     max: 100    },
      { key: "avgLoanBalance",      label: "Avg loan balance",                    unit: "$ / borrower",   scale: 1,   precision: 0, step: 500,  min: 1000,  max: 100000 },
      { key: "rateCut",             label: "Rate cut — digital loans",             unit: "bps",            scale: 1,   precision: 0, step: 5,    min: 0,     max: 200    },
      { key: "loanCannibRateA",     label: "Loan cannibalization — Scenario A",    unit: "% / yr",         scale: 100, precision: 2, step: 0.05, min: 0,     max: 25     },
      { key: "loanCannibRateB",     label: "Loan cannibalization — Scenario B",    unit: "% / yr",         scale: 100, precision: 1, step: 0.5,  min: 0,     max: 50     },
    ],
  },
  {
    id: "servicing",
    label: "Servicing Cost",
    fields: [
      { key: "maintenanceTrad",                label: "Account maintenance — traditional",   unit: "$ / member / yr", scale: 1,   precision: 0,  step: 10,   min: 0,  max: 1000  },
      { key: "maintenanceDigital",             label: "Account maintenance — digital",       unit: "$ / member / yr", scale: 1,   precision: 0,  step: 5,    min: 0,  max: 500   },
      { key: "transactionCostTrad",            label: "Transaction cost — teller",           unit: "$ / transaction", scale: 1,   precision: 2,  step: 0.25, min: 0,  max: 20    },
      { key: "transactionCostDigital",         label: "Transaction cost — digital",          unit: "$ / transaction", scale: 1,   precision: 2,  step: 0.01, min: 0,  max: 5     },
      { key: "avgTellerTransactionsPerMonth",  label: "Avg teller transactions / month",    unit: "txns / mo",       scale: 1,   precision: 3,  step: 0.083,min: 0,  max: 10    },
      { key: "avgDigitalTransactionsPerMonth", label: "Avg digital transactions / month",   unit: "txns / mo",       scale: 1,   precision: 0,  step: 1,    min: 0,  max: 100   },
      { key: "platformCost",                   label: "Digital platform infrastructure",     unit: "$ / member / yr", scale: 1,   precision: 0,  step: 5,    min: 0,  max: 200   },
      { key: "fraudCost",                      label: "Digital fraud & ID verification",     unit: "$ / member / yr", scale: 1,   precision: 0,  step: 1,    min: 0,  max: 100   },
      { key: "costPerBranchVisit",             label: "Cost per branch visit",               unit: "$ / visit",       scale: 1,   precision: 2,  step: 0.5,  min: 0,  max: 50    },
      { key: "freeVisits",                     label: "Free branch visits / yr",             unit: "visits / yr",     scale: 1,   precision: 0,  step: 1,    min: 0,  max: 12    },
    ],
  },
  {
    id: "retention",
    label: "Retention",
    fields: [
      { key: "digitalAttritionYear1",       label: "Digital attrition — year 1",         unit: "% / yr", scale: 100, precision: 0, step: 1, min: 0, max: 100 },
      { key: "digitalAttritionSteadyState", label: "Digital attrition — steady state",   unit: "% / yr", scale: 100, precision: 0, step: 1, min: 0, max: 100 },
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
          />
        ))}
      </div>
    </div>
  );
}

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
