"use client";

const LEVERS = [
  {
    id: "acquisitionAggression",
    label: "Acquisition Aggression",
    options: ["Conservative", "Moderate", "Aggressive"],
    defaultValue: "Moderate",
  },
  {
    id: "rateCompetitiveness",
    label: "Rate Competitiveness",
    options: ["Conservative", "Moderate", "Aggressive"],
    defaultValue: "Moderate",
  },
  {
    id: "memberProfile",
    label: "Target Member Profile",
    options: ["Mass Market", "Balanced", "Upmarket"],
    defaultValue: "Balanced",
  },
  {
    id: "marketOpportunity",
    label: "Market Opportunity",
    options: ["Single Metro", "Multi-Metro", "Multi-State"],
    defaultValue: "Multi-Metro",
  },
];

function SegmentedLever({ id, label, options, value, onChange }) {
  return (
    <fieldset>
      <legend className="text-sm font-medium text-zinc-700 mb-2">{label}</legend>
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
    </fieldset>
  );
}

export default function ModelInputs({ levers, onChange }) {
  return (
    <div>
      <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-600 mb-3">
        Strategy Levers
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {LEVERS.map(({ id, label, options, defaultValue }) => (
          <SegmentedLever
            key={id}
            id={id}
            label={label}
            options={options}
            value={levers[id] ?? defaultValue}
            onChange={onChange}
          />
        ))}
      </div>
    </div>
  );
}

export { LEVERS };
