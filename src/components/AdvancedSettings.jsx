"use client";

import { useRef, useState } from "react";
import { DEFAULT_INPUTS } from "@/lib/model";

// Each field: key matches DEFAULT_INPUTS, scale converts stored→display (pct fields: ×100)
const SECTIONS = [
  {
    id: "acquisition",
    label: "Acquisition",
    fields: [
      { key: "launchCPA",                   label: "Launch CPA",                         unit: "$ / member",     scale: 1,   precision: 0,  step: 25,   min: 50,    max: 2000    },
      { key: "launchDuration",              label: "Launch duration",                    unit: "months",         scale: 1,   precision: 0,  step: 1,    min: 1,     max: 36      },
      { key: "steadyStateCPA",             label: "Steady-state CPA",                   unit: "$ / member",     scale: 1,   precision: 0,  step: 5,    min: 10,    max: 500     },
      { key: "monthlyMemberTarget",         label: "Monthly member target",              unit: "members / mo",   scale: 1,   precision: 0,  step: 50,   min: 50,    max: 10000   },
      { key: "addressableMarket",           label: "Addressable market",                 unit: "households",     scale: 1,   precision: 0,  step: 50000,min: 50000, max: 5000000 },
      { key: "difficultyMultiplier",        label: "Market difficulty multiplier",        unit: "×",              scale: 1,   precision: 1,  step: 0.1,  min: 0.5,   max: 3.0     },
    ],
  },
  {
    id: "deposits",
    label: "Deposits",
    fields: [
      { key: "avgDepositBalance",           label: "Avg deposit balance",                unit: "$ / member",     scale: 1,   precision: 0,  step: 500,  min: 1000,  max: 100000  },
      { key: "rateBump",                    label: "Rate bump — digital deposits",        unit: "bps",            scale: 1,   precision: 0,  step: 5,    min: 0,     max: 300     },
      { key: "ratePremiumDecay",            label: "Rate premium decay",                  unit: "bps / yr",       scale: 1,   precision: 0,  step: 1,    min: 0,     max: 50      },
      { key: "depositCannibRateA",          label: "Deposit cannibalization — Scenario A",unit: "% / yr",         scale: 100, precision: 1,  step: 0.1,  min: 0,     max: 25      },
      { key: "depositCannibRateB",          label: "Deposit cannibalization — Scenario B",unit: "% / yr",         scale: 100, precision: 1,  step: 0.5,  min: 0,     max: 50      },
    ],
  },
  {
    id: "loans",
    label: "Loans",
    fields: [
      { key: "loanPenetrationRate",         label: "Loan penetration rate",               unit: "% of members",   scale: 100, precision: 0,  step: 1,    min: 0,     max: 100     },
      { key: "avgLoanBalance",              label: "Avg loan balance",                    unit: "$ / borrower",   scale: 1,   precision: 0,  step: 500,  min: 1000,  max: 100000  },
      { key: "rateCut",                     label: "Rate cut — digital loans",             unit: "bps",            scale: 1,   precision: 0,  step: 5,    min: 0,     max: 200     },
      { key: "loanCannibRateA",             label: "Loan cannibalization — Scenario A",    unit: "% / yr",         scale: 100, precision: 2,  step: 0.05, min: 0,     max: 25      },
      { key: "loanCannibRateB",             label: "Loan cannibalization — Scenario B",    unit: "% / yr",         scale: 100, precision: 1,  step: 0.5,  min: 0,     max: 50      },
    ],
  },
  {
    id: "servicing",
    label: "Servicing Cost",
    fields: [
      { key: "maintenanceTrad",             label: "Account maintenance — traditional",   unit: "$ / member / yr", scale: 1,  precision: 0,  step: 10,   min: 0,     max: 1000    },
      { key: "maintenanceDigital",          label: "Account maintenance — digital",       unit: "$ / member / yr", scale: 1,  precision: 0,  step: 5,    min: 0,     max: 500     },
      { key: "transactionCostTrad",         label: "Transaction cost — teller",           unit: "$ / transaction", scale: 1,  precision: 2,  step: 0.25, min: 0,     max: 20      },
      { key: "transactionCostDigital",      label: "Transaction cost — digital",          unit: "$ / transaction", scale: 1,  precision: 2,  step: 0.01, min: 0,     max: 5       },
      { key: "avgTellerTransactionsPerMonth",label: "Avg teller transactions / month",    unit: "txns / mo",       scale: 1,  precision: 3,  step: 0.083,min: 0,     max: 10      },
      { key: "avgDigitalTransactionsPerMonth",label: "Avg digital transactions / month",  unit: "txns / mo",       scale: 1,  precision: 0,  step: 1,    min: 0,     max: 100     },
      { key: "platformCost",                label: "Digital platform infrastructure",     unit: "$ / member / yr", scale: 1,  precision: 0,  step: 5,    min: 0,     max: 200     },
      { key: "fraudCost",                   label: "Digital fraud & ID verification",     unit: "$ / member / yr", scale: 1,  precision: 0,  step: 1,    min: 0,     max: 100     },
      { key: "costPerBranchVisit",          label: "Cost per branch visit",               unit: "$ / visit",       scale: 1,  precision: 2,  step: 0.5,  min: 0,     max: 50      },
      { key: "freeVisits",                  label: "Free branch visits / yr",             unit: "visits / yr",     scale: 1,  precision: 0,  step: 1,    min: 0,     max: 12      },
    ],
  },
  {
    id: "retention",
    label: "Retention",
    fields: [
      { key: "digitalAttritionYear1",       label: "Digital attrition — year 1",          unit: "% / yr",         scale: 100, precision: 0,  step: 1,    min: 0,     max: 100     },
      { key: "digitalAttritionSteadyState", label: "Digital attrition — steady state",    unit: "% / yr",         scale: 100, precision: 0,  step: 1,    min: 0,     max: 100     },
    ],
  },
];

function NumberField({ fieldKey, label, unit, scale, precision, step, min, max, value, onChange }) {
  const displayed = (value * scale).toFixed(precision);
  const [draft, setDraft] = useState(displayed);
  const prevDisplayed = useRef(displayed);

  // Sync draft when external value changes (e.g., reset to defaults)
  if (prevDisplayed.current !== displayed) {
    prevDisplayed.current = displayed;
    setDraft(displayed);
  }

  function commit() {
    const n = parseFloat(draft);
    if (isNaN(n)) {
      setDraft(displayed);
      return;
    }
    const clamped = Math.max(min, Math.min(max, n));
    onChange(fieldKey, clamped / scale);
    setDraft((clamped).toFixed(precision));
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

export default function AdvancedSettings({ inputs, onChange }) {
  const [open, setOpen] = useState(false);

  function handleReset() {
    // Replace all overrides with DEFAULT_INPUTS values by emitting each key
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
