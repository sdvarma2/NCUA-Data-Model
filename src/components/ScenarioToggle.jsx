"use client";

const SCENARIOS = [
  {
    id: "scenario_a",
    title: "Expansion Markets Only",
    subtitle: "Lower risk · Slower scale",
    description:
      "Digital products offered exclusively outside the current branch footprint. Cannibalization is slow-building — only affects members who relocate or discover the product through marketing spillover.",
  },
  {
    id: "scenario_b",
    title: "All Markets",
    subtitle: "Higher early pressure · Faster retention",
    description:
      "Digital products offered everywhere, including existing branch markets. Cannibalization is immediate — rate-sensitive existing members migrate from day one. Directly competes to retain members who would otherwise leave for national digital banks.",
  },
];

export default function ScenarioToggle({ scenario, onChange }) {
  return (
    <div>
      <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-600 mb-3">
        Deployment Scenario
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {SCENARIOS.map(({ id, title, subtitle, description }) => {
          const selected = scenario === id;
          return (
            <button
              key={id}
              data-testid={`card-${id}`}
              aria-pressed={selected}
              onClick={() => onChange(id)}
              className={[
                "text-left rounded-xl border-2 p-5 transition-all",
                "min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500",
                selected
                  ? "border-zinc-800 bg-zinc-900 text-white"
                  : "border-zinc-200 bg-white text-zinc-900 hover:border-zinc-400",
              ].join(" ")}
            >
              <p className={[
                "text-base font-semibold mb-0.5",
                selected ? "text-white" : "text-zinc-900",
              ].join(" ")}>
                {title}
              </p>
              <p className={[
                "text-xs font-medium mb-2",
                selected ? "text-zinc-300" : "text-zinc-500",
              ].join(" ")}>
                {subtitle}
              </p>
              <p className={[
                "text-sm leading-relaxed",
                selected ? "text-zinc-200" : "text-zinc-600",
              ].join(" ")}>
                {description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
