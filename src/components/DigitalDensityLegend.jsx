import { formatAssets, formatCurrency, formatPct } from "@/lib/formatters";

const TIERS = [
  { key: "hybrid",          label: "Hybrid",           range: "20K–50K per branch",  colors: "bg-amber-50 border-amber-200 text-amber-700" },
  { key: "branch_balanced", label: "Branch-Balanced",  range: "10K–20K per branch",  colors: "bg-orange-50 border-orange-200 text-orange-700" },
  { key: "branch_heavy",    label: "Branch-Heavy",     range: "Under 10K per branch",colors: "bg-rose-50 border-rose-200 text-rose-700" },
];

function avg(arr, key) {
  if (!arr.length) return null;
  return arr.reduce((s, i) => s + i[key], 0) / arr.length;
}

export default function DigitalDensityLegend({ institutions = [] }) {
  const grouped = Object.fromEntries(
    TIERS.map(({ key }) => [key, institutions.filter(i => i.digital_intensity === key)])
  );

  return (
    <div>
      {/* Tier tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {TIERS.map(({ key, label, range, colors }) => {
          const count = grouped[key].length;
          return (
            <article
              key={key}
              data-testid={`tile-${key}`}
              className={`rounded-xl border p-4 ${colors}`}
            >
              <p className="text-xs font-semibold uppercase tracking-wide mb-1">{label}</p>
              <div className="flex items-baseline gap-1.5 mb-2">
                <p className="text-2xl sm:text-4xl font-bold">{count}</p>
                <p className="text-xs font-semibold uppercase tracking-wide">Institutions</p>
              </div>
              <p className="text-xs">{range}</p>
            </article>
          );
        })}
      </div>

      {/* Metrics table */}
      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100">
              <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500">Metric</th>
              {TIERS.map(({ key, label }) => (
                <th key={key} className="px-4 py-3 text-right text-xs font-semibold text-zinc-500">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              {
                label: "Avg assets ($B)",
                rowKey: "assets",
                render: g => avg(g, "assets_b") !== null ? formatAssets(avg(g, "assets_b")) : "—",
              },
              {
                label: "OpEx per member",
                rowKey: "opex",
                render: g => avg(g, "opex_per_member") !== null ? formatCurrency(avg(g, "opex_per_member")) : "—",
              },
              {
                label: "Occupancy per member",
                rowKey: "occupancy",
                render: g => avg(g, "occupancy_per_member") !== null ? formatCurrency(avg(g, "occupancy_per_member")) : "—",
              },
              {
                label: "Return on assets",
                rowKey: "roa",
                render: g => avg(g, "roa_pct") !== null ? formatPct(avg(g, "roa_pct"), 3) : "—",
              },
            ].map(({ label, rowKey, render }) => (
              <tr key={rowKey} className="border-b border-zinc-50 last:border-0">
                <td className="px-4 py-3 text-zinc-600">{label}</td>
                {TIERS.map(({ key }) => (
                  <td
                    key={key}
                    data-testid={`cell-${key}-${rowKey}`}
                    className="px-4 py-3 text-right font-semibold text-zinc-900"
                  >
                    {grouped[key].length ? render(grouped[key]) : "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-zinc-500 leading-relaxed">
        Fewer than a handful of credit unions have more than 50K members per branch (leaning moderately to strongly digital).
      </p>
    </div>
  );
}
