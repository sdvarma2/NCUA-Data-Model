"use client";

import { useState } from "react";

// ── Inline tooltip ────────────────────────────────────────────────────────────

function InfoTip({ children }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex items-center ml-1 align-middle">
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
          className="absolute left-0 top-full mt-1.5 z-20 rounded-lg bg-zinc-800 px-3 py-2.5 text-xs leading-relaxed text-white shadow-lg w-72 max-w-[calc(100vw-2rem)]"
        >
          {children}
        </span>
      )}
    </span>
  );
}

// ── Lever definitions ─────────────────────────────────────────────────────────

const LEVERS = [
  {
    id: "acquisitionAggression",
    label: "Acquisition Aggression",
    options: ["Conservative", "Moderate", "Aggressive"],
    defaultValue: "Moderate",
    tooltip: (
      <>
        <p className="mb-2">
          Sets your member acquisition cost trajectory: what you pay per active member
          at launch, the theoretical floor CPA decays toward over time, and how many
          months that decay takes.
        </p>
        <p className="mb-2">
          CPA is a pure cost overlay — it does not affect projected member counts.
          Changing this will not alter the Bass curve or milestone targets.
        </p>
        <p className="font-medium mb-0.5">Controls</p>
        <p className="mb-2">Initial CPA, Steady-State CPA, Months to Reach Steady-State.</p>
        <p className="font-medium mb-0.5">Doesn't control</p>
        <p>Member targets, market size, or member economics — adjust those via the other levers or Advanced Settings.</p>
      </>
    ),
  },
  {
    id: "rateCompetitiveness",
    label: "Rate Competitiveness",
    options: ["Conservative", "Moderate", "Aggressive"],
    defaultValue: "Moderate",
    tooltip: (
      <>
        <p className="mb-2">
          Sets your deposit and loan rate incentives. Conservative locks in a flat
          25 bps deposit premium with no decay — a modest, permanent incentive.
          Moderate starts at 50 bps and erodes to a small persistent edge.
          Aggressive holds a high-yield-level premium through most of the planning window.
        </p>
        <p className="font-medium mb-0.5">Controls</p>
        <p className="mb-2">Initial Rate Bump, Rate Bump Decay, Rate Bump Floor, Rate Cut on digital loans.</p>
        <p className="font-medium mb-0.5">Doesn't control</p>
        <p>
          Cannibalization rates. If choosing Aggressive, consider whether your deposit
          cannibalization inputs in Advanced Settings reflect that existing members
          may shift balances to capture the higher rate.
        </p>
      </>
    ),
  },
  {
    id: "memberProfile",
    label: "Target Member Profile",
    options: ["Mass Market", "Balanced", "Upmarket"],
    defaultValue: "Balanced",
    tooltip: (
      <>
        <p className="mb-2">
          Applies a bundle of economics assumptions about who you're acquiring:
          average deposit and loan balances, loan penetration rate, first-year and
          steady-state attrition, and the SAM as a percentage of TAM. Milestone
          targets are re-suggested when you change this, since attrition rates
          directly affect Bass curve calibration.
        </p>
        <p className="font-medium mb-0.5">Controls</p>
        <p className="mb-2">Avg deposit balance, avg loan balance, loan penetration rate, Year 1 attrition, steady-state attrition, SAM%.</p>
        <p className="font-medium mb-0.5">Doesn't control</p>
        <p>Rate incentives, servicing costs, or platform costs — fine-tune those individually in Advanced Settings.</p>
      </>
    ),
  },
  {
    id: "marketOpportunity",
    label: "Market Opportunity",
    options: ["150k", "500k", "2M"],
    defaultValue: "500k",
    unit: "potential members",
    tooltip: (
      <>
        <p className="mb-2">
          Sets the Total Addressable Market — the full population of potential
          members in your target geography. Changing this re-suggests milestone
          targets to stay proportional to the new market size.
        </p>
        <p className="font-medium mb-0.5">Controls</p>
        <p className="mb-2">TAM; triggers milestone re-suggestion.</p>
        <p className="font-medium mb-0.5">Doesn't control</p>
        <p>
          SAM%, Bass diffusion parameters (p and q), or the milestone targets
          themselves — override any of those directly in Advanced Settings.
        </p>
      </>
    ),
  },
];

// TAM values wired to each Market Opportunity option — exported for use in page.jsx
export const MARKET_OPPORTUNITY_TAM = {
  "150k":  150_000,
  "500k":  500_000,
  "2M":  2_000_000,
};

// ── Segmented lever ───────────────────────────────────────────────────────────

function SegmentedLever({ id, label, options, value, onChange, unit, tooltip }) {
  return (
    <fieldset>
      <legend className="text-sm font-medium text-zinc-700 mb-2 flex items-center">
        {label}
        {tooltip && <InfoTip>{tooltip}</InfoTip>}
      </legend>
      <div className="flex rounded-lg border border-zinc-300 overflow-hidden">
        {options.map((option, i) => {
          const selected = value === option;
          return (
            <button
              key={option}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(id, option)}
              className={[
                "flex-1 py-2 px-3 text-sm font-medium transition-colors min-h-[44px]",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-500",
                i > 0 ? "border-l border-zinc-300" : "",
                selected
                  ? "bg-zinc-800 text-white"
                  : "bg-white text-zinc-700 hover:bg-zinc-50",
              ].join(" ")}
            >
              {option}
            </button>
          );
        })}
      </div>
      {unit && (
        <p className="text-xs text-zinc-500 mt-1">{unit}</p>
      )}
    </fieldset>
  );
}

// ── Top-level component ───────────────────────────────────────────────────────

export default function ModelInputs({ levers, onChange }) {
  return (
    <div>
      <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-600 mb-3">
        Strategy Levers
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {LEVERS.map(({ id, label, options, defaultValue, unit, tooltip }) => (
          <SegmentedLever
            key={id}
            id={id}
            label={label}
            options={options}
            value={levers[id] ?? defaultValue}
            onChange={onChange}
            unit={unit}
            tooltip={tooltip}
          />
        ))}
      </div>
    </div>
  );
}

export { LEVERS };
