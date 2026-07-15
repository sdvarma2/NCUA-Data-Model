"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  suggestMilestones,
  deriveMilestonesForM60Target,
  MARKET_COMPETITIVENESS_PRESETS,
  computeCumulativeAcquisitionSpend,
} from "@/lib/model";
import { LEVER_PRESETS } from "@/lib/levers";

// ── Formatting helpers ────────────────────────────────────────────────────────
// Matches the compact $/k/M convention used in SimulationTable.jsx and
// SimulationStage.jsx for large aggregate dollar totals.

function fmtDollars(n) {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000)     return `$${Math.round(abs / 1_000)}k`;
  return `$${Math.round(abs)}`;
}

// ── Inline tooltip ────────────────────────────────────────────────────────────

function InfoTip({ children, className = "w-72 max-w-[calc(100vw-2rem)]" }) {
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

// ── Segmented lever ───────────────────────────────────────────────────────────

function SegmentedLever({ id, label, options, value, onChange, unit, tooltip, footer }) {
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
      {unit && <p className="text-xs text-zinc-500 mt-1">{unit}</p>}
      {footer}
    </fieldset>
  );
}

// ── Bass Fit indicator ────────────────────────────────────────────────────────

function BassFitIndicator({
  realismIndicator,
  label: title = "Bass Fit",
  tensionMessage = "milestone targets exceed what this market can reach",
}) {
  const { overall, pStatus, qStatus, tensionStatus } = realismIndicator;

  const color = { green: "text-emerald-700", yellow: "text-amber-700", red: "text-red-700" };
  const statusLabel = { green: "Plausible", yellow: "Ambitious", red: "Implausible" };

  const issues = [];
  if (pStatus !== "green")       issues.push("innovation rate (p) is outside a typical range");
  if (qStatus !== "green")       issues.push("word-of-mouth rate (q) is elevated");
  if (tensionStatus !== "green") issues.push(tensionMessage);

  return (
    <div className="flex items-start gap-1.5 text-xs">
      <span className={`mt-px shrink-0 ${color[overall]}`} aria-hidden="true">●</span>
      <span className="text-zinc-600">
        {title}:{" "}
        <span className={`font-medium ${color[overall]}`}>{statusLabel[overall]}</span>
        {issues.length > 0 && (
          <span className="text-zinc-500"> — {issues.join("; ")}</span>
        )}
      </span>
    </div>
  );
}

// ── Required Acquisition Intensity readout ────────────────────────────────────
// Rate Incentives no longer lets the Month 60 goal drift — p is solved to hold
// it fixed (see calibrateAcquisition in model.js). This shows what that costs:
// how much more or less paid/outbound acquisition intensity is required
// relative to the Moderate baseline, since p is the one lever more marketing
// spend can actually move (q and attrition are fixed behavioral consequences
// of the rate story, not something spend compensates for).

function AcquisitionIntensityReadout({ calibration }) {
  const { p, pBaseline } = calibration;
  if (!pBaseline) return null;

  const pct    = Math.round(((p / pBaseline) - 1) * 100);
  const absPct = Math.abs(pct);

  let colorClass, suffix;
  if (absPct <= 5) {
    colorClass = "text-emerald-700";
    suffix = "on par with Moderate";
  } else if (pct > 0) {
    colorClass = absPct > 75 ? "text-red-700" : "text-amber-700";
    suffix = "more outbound push needed";
  } else {
    colorClass = "text-emerald-700";
    suffix = "less outbound push needed";
  }

  return (
    <div className="space-y-0.5">
      <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-xs">
        <span className="text-zinc-500">Required Acquisition Intensity:</span>
        <span className={`font-medium ${colorClass}`}>
          {pct > 0 ? `+${pct}%` : `${pct}%`}
        </span>
        <span className={colorClass}>({suffix})</span>
      </div>
      {pct > 10 && (
        <p className="text-xs text-zinc-500">
          Weaker rate-driven discovery means hitting your goal takes meaningfully more outbound
          marketing push — model that added spend in Card 2&rsquo;s CPA assumptions if you plan to fund it.
        </p>
      )}
      {pct < -10 && (
        <p className="text-xs text-zinc-500">
          Stronger word-of-mouth carries more of the load here — but watch the attrition
          consequence below and the cumulative net contribution once you run the simulation.
        </p>
      )}
    </div>
  );
}

// ── Methodology caption ───────────────────────────────────────────────────────
// Small, always-visible (not hover-gated) disclosures distinguishing what's
// benchmarked from what's a directional estimate — so the honest scope of the
// model is legible at a glance, not something the user has to explain aloud.

function MethodologyNote({ children }) {
  return <p className="text-xs text-zinc-500 leading-relaxed">{children}</p>;
}

// ── Read-only derived-value row ───────────────────────────────────────────────
// Used for any value that is computed or preset-driven rather than directly
// editable — Card 1's Bass-curve milestone projections, Card 2's CPA outputs.

function ReadoutField({ label, value, unit, tooltip, format = (v) => v.toLocaleString() }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-zinc-600 flex items-center shrink-0">
        {label}
        <InfoTip>{tooltip}</InfoTip>
      </span>
      <div className="flex items-center gap-2 shrink-0">
        <div
          role="status"
          className="w-28 min-h-[44px] flex items-center justify-end rounded border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-sm font-medium text-zinc-600 tabular-nums"
        >
          {value != null ? format(value) : "—"}
        </div>
        <span className="text-xs text-zinc-500 w-[4.5rem] leading-tight">{unit}</span>
      </div>
    </div>
  );
}

// ── Card 1: Market & Goal ─────────────────────────────────────────────────────

function MarketGoalCard({ levers, onChange, onInputChange, onBatchInputChange, inputs, calibration }) {
  const m60Value    = inputs.m60Target;
  const [draft, setDraft] = useState(String(m60Value));

  // Sync draft whenever the external value changes — lever changes, Advanced
  // Settings edits, or "Suggest from SAM" all flow through inputs.m60Target.
  useEffect(() => {
    setDraft(String(m60Value));
  }, [m60Value]);

  function commitM60() {
    const n = parseInt(draft, 10);
    if (isNaN(n)) { setDraft(String(m60Value)); return; }
    const clamped = Math.max(0, Math.min(500000, n));
    // Re-derive m12Target/m36Target proportionally so all three milestones stay
    // mutually consistent — otherwise the optimizer fights stale m12/m36 targets
    // against the new m60Target and can produce a non-monotonic curve.
    const batch = deriveMilestonesForM60Target(inputs, clamped);
    if (onBatchInputChange) {
      onBatchInputChange(batch);
    } else {
      onInputChange?.("m60Target", clamped);
    }
    setDraft(String(clamped));
  }

  const suggested       = suggestMilestones(inputs);
  const suggestedM60    = suggested.m60Target;
  const showSuggestDiff = Math.abs(suggestedM60 - m60Value) > 10;

  function applySuggested() {
    if (onBatchInputChange) {
      onBatchInputChange(suggested);
    } else {
      onInputChange?.("m60Target", suggestedM60);
    }
  }

  return (
    <div className="bg-white border border-zinc-200 rounded-xl shadow-sm">

      {/* ── Header ── */}
      <div className="px-5 pt-5 pb-4 sm:px-6 sm:pt-6">
        <div className="flex items-center gap-3">
          <span
            className="flex items-center justify-center w-6 h-6 rounded-full bg-zinc-800 text-white text-[11px] font-bold shrink-0 select-none"
            aria-hidden="true"
          >
            1
          </span>
          <div>
            <h2 className="text-sm font-semibold text-zinc-900 leading-tight">Market &amp; Goal</h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Define your target market and 5-year growth objective
            </p>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="border-t border-zinc-100 px-5 py-5 sm:px-6 space-y-5">

        {/* Market Size */}
        <SegmentedLever
          id="marketOpportunity"
          label="Market Size"
          options={["150k", "500k", "2M"]}
          value={levers.marketOpportunity ?? "500k"}
          onChange={onChange}
          unit="potential members"
          tooltip={
            <>
              <p className="mb-2">
                Sets the Total Addressable Market — the full population of potential members
                in your target geography. Changing this re-suggests your Month 60 goal to
                stay proportional to the new market size.
              </p>
              <p className="font-medium mb-0.5">Controls</p>
              <p className="mb-2">TAM; triggers Month 60 goal re-suggestion.</p>
              <p className="font-medium mb-0.5">Doesn't control</p>
              <p>SAM%, Bass diffusion parameters, or the goal itself — override those in Advanced Settings.</p>
            </>
          }
        />

        {/* Target Member Profile */}
        <SegmentedLever
          id="memberProfile"
          label="Target Member Profile"
          options={["Mass Market", "Balanced", "Upmarket"]}
          value={levers.memberProfile ?? "Balanced"}
          onChange={onChange}
          tooltip={
            <>
              <p className="mb-2">
                Applies a bundle of economics assumptions about who you're acquiring:
                average deposit and loan balances, loan penetration rate, first-year and
                steady-state attrition, and the SAM as a percentage of TAM. Changing this
                re-suggests your Month 60 goal since attrition rates directly affect Bass
                curve calibration.
              </p>
              <p className="font-medium mb-0.5">Controls</p>
              <p className="mb-2">Avg deposit balance, avg loan balance, loan penetration rate, Year 1 attrition, steady-state attrition, SAM%.</p>
              <p className="font-medium mb-0.5">Doesn't control</p>
              <p>Rate incentives, servicing costs, or platform costs — fine-tune those in Advanced Settings.</p>
            </>
          }
        />

        {/* Month 60 Goal */}
        <div>
          <div className="flex items-center justify-between gap-3">
            <label className="text-sm font-medium text-zinc-700 flex items-center shrink-0">
              Month 60 Member Goal
              <InfoTip>
                <p className="mb-2">
                  Your 5-year net active member target — after attrition. The Bass diffusion
                  model calibrates p and q to reach this number. Changing it here also rescales
                  the Month 12 and Month 36 projections below proportionally, so all three stay
                  mutually consistent with a single coherent curve.
                </p>
                <p>
                  This field is synced with Advanced Settings — changes in either place are
                  immediately reflected in the other. Use "Suggest from SAM" to auto-fill a
                  value consistent with realistic Bass parameters for your market and member profile.
                </p>
              </InfoTip>
            </label>
            <div className="flex items-center gap-2 shrink-0">
              <input
                type="number"
                value={draft}
                step={500}
                min={0}
                max={500000}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commitM60}
                onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
                aria-label="Month 60 Member Goal"
                className="w-28 text-right text-sm rounded border border-zinc-400 px-2 py-1.5 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-zinc-500 bg-white text-zinc-900"
              />
              <span className="text-xs text-zinc-500 w-[4.5rem] leading-tight">net active members</span>
            </div>
          </div>

          {/* Suggest from SAM */}
          <div className="flex justify-end mt-1.5">
            <button
              type="button"
              onClick={applySuggested}
              className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-700 transition-colors min-h-[36px] px-0.5"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 shrink-0" aria-hidden="true">
                <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.83-4.401Z" clipRule="evenodd" />
              </svg>
              {showSuggestDiff
                ? `Use suggested (${suggestedM60.toLocaleString()})`
                : "Suggest from SAM"
              }
            </button>
          </div>
        </div>

        {/* Month 12 / Month 36 — read-only, derived from the calibrated Bass curve */}
        {calibration && (
          <div className="space-y-2.5 pt-1">
            <ReadoutField
              label="Month 12 Projection"
              value={calibration.projectedM12}
              unit="net active members"
              tooltip={
                <>
                  <p className="mb-2">
                    Automatically calculated from the Bass diffusion curve that best fits
                    your Month 60 goal — not a separate input.
                  </p>
                  <p>
                    To set an independent Month 12 target that influences the calibration
                    directly, use the Month 12 field in Advanced Settings.
                  </p>
                </>
              }
            />
            <ReadoutField
              label="Month 36 Projection"
              value={calibration.projectedM36}
              unit="net active members"
              tooltip={
                <>
                  <p className="mb-2">
                    Automatically calculated from the Bass diffusion curve that best fits
                    your Month 60 goal — not a separate input.
                  </p>
                  <p>
                    To set an independent Month 36 target that influences the calibration
                    directly, use the Month 36 field in Advanced Settings.
                  </p>
                </>
              }
            />
          </div>
        )}
      </div>

      {/* ── Bass Fit readout ── */}
      {calibration && (
        <div className="border-t border-zinc-100 bg-zinc-50 rounded-b-xl px-5 py-3.5 sm:px-6 space-y-1.5">
          <BassFitIndicator realismIndicator={calibration.realismIndicator} />
          <MethodologyNote>
            Bass Diffusion is a well-established adoption model (Bass, 1969) — but the p and q
            values driving this curve are reasoned estimates, not fitted to credit-union-specific
            launch data. Bass Fit flags when they drift outside the range the broader literature
            considers plausible.
          </MethodologyNote>
        </div>
      )}
    </div>
  );
}

// ── Card 2: Acquisition Economics ─────────────────────────────────────────────

const MARKET_COMPETITIVENESS_OPTIONS = ["Low", "Medium", "High"];

function AcquisitionEconomicsCard({ inputs, onBatchInputChange, calibration }) {
  // Active position is derived directly from inputs.initialCPA — the same
  // source of truth Advanced Settings' Market Competitiveness toggle reads —
  // so both stay in sync without a separate lever state to fall out of date.
  const activePreset = MARKET_COMPETITIVENESS_OPTIONS.find(
    (label) => MARKET_COMPETITIVENESS_PRESETS[label].initialCPA === inputs.initialCPA
  ) ?? null;

  function handlePresetChange(_id, option) {
    onBatchInputChange?.(MARKET_COMPETITIVENESS_PRESETS[option]);
  }

  const cumulativeSpend = calibration ? computeCumulativeAcquisitionSpend(calibration) : null;

  return (
    <div className="bg-white border border-zinc-200 rounded-xl shadow-sm">

      {/* ── Header ── */}
      <div className="px-5 pt-5 pb-4 sm:px-6 sm:pt-6">
        <div className="flex items-center gap-3">
          <span
            className="flex items-center justify-center w-6 h-6 rounded-full bg-zinc-800 text-white text-[11px] font-bold shrink-0 select-none"
            aria-hidden="true"
          >
            2
          </span>
          <div>
            <h2 className="text-sm font-semibold text-zinc-900 leading-tight">Acquisition Economics</h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Set what you'll pay to acquire and retain digital members
            </p>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="border-t border-zinc-100 px-5 py-5 sm:px-6 space-y-5">

        {/* Market Competitiveness */}
        <SegmentedLever
          id="marketCompetitiveness"
          label="Market Competitiveness"
          options={MARKET_COMPETITIVENESS_OPTIONS}
          value={activePreset}
          onChange={handlePresetChange}
          tooltip={
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
          }
        />

        {/* Initial CPA / Steady-State CPA / Months to Reach Steady-State — read-only */}
        <div className="space-y-2.5 pt-1">
          <ReadoutField
            label="Initial CPA"
            value={inputs.initialCPA}
            unit="$ / active member"
            format={(v) => `$${v.toLocaleString()}`}
            tooltip={
              <>
                <p className="mb-2">
                  The cost to acquire an active member at program launch — set by the
                  Market Competitiveness preset above.
                </p>
                <p>
                  To override this value directly, edit Initial CPA under Acquisition
                  Economics in Advanced Settings.
                </p>
              </>
            }
          />
          <ReadoutField
            label="Steady-State CPA"
            value={inputs.steadyStateCPA}
            unit="$ / active member"
            format={(v) => `$${v.toLocaleString()}`}
            tooltip={
              <>
                <p className="mb-2">
                  The theoretical CPA floor once the program reaches full maturity —
                  set by the Market Competitiveness preset above.
                </p>
                <p>
                  To override this value directly, edit Steady-State CPA under
                  Acquisition Economics in Advanced Settings.
                </p>
              </>
            }
          />
          <ReadoutField
            label="Months to Reach Steady-State"
            value={inputs.monthsToSteadyState}
            unit="months"
            tooltip={
              <>
                <p className="mb-2">
                  How long the CPA decay curve takes to travel from Initial CPA to
                  Steady-State CPA — set by the Market Competitiveness preset above.
                </p>
                <p>
                  To override this value directly, edit Months to Reach Steady-State
                  under Acquisition Economics in Advanced Settings.
                </p>
              </>
            }
          />
        </div>
      </div>

      {/* ── 5-Year Cumulative Acquisition Spend ── */}
      {cumulativeSpend != null && (
        <div className="border-t border-zinc-100 bg-zinc-50 rounded-b-xl px-5 py-3.5 sm:px-6 space-y-1.5">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm text-zinc-600 flex items-center">
              5-Year Cumulative Acquisition Spend
              <InfoTip>
                <p className="mb-2">
                  Total marketing and acquisition spend over the full 5-year window —
                  each month's new gross members multiplied by that month's CPA, summed
                  across the Bass curve calibrated to your Month 60 goal and the CPA
                  decay curve set above.
                </p>
                <p>
                  Moving Market Competitiveness shifts this number directly. Market
                  Size, Target Member Profile, and Rate Incentives shift it indirectly
                  by changing how many members are acquired each month.
                </p>
              </InfoTip>
            </span>
            <span className="text-sm font-semibold text-zinc-900 tabular-nums shrink-0">
              {fmtDollars(cumulativeSpend)}
            </span>
          </div>
          <MethodologyNote>
            This spend prices the adoption curve set in Market &amp; Goal — it doesn't drive it.
            Whether this budget actually produces that curve is an assumption to validate against
            your own channel plan, not a claim the model makes for you.
          </MethodologyNote>
        </div>
      )}
    </div>
  );
}

// ── Card 3: Rate Incentives ────────────────────────────────────────────────────

const RATE_INCENTIVES_OPTIONS = ["Conservative", "Moderate", "Aggressive"];

function RateIncentivesCard({ inputs, onBatchInputChange, calibration }) {
  // Active position derived from inputs.rateBump — same pattern as Card 2's
  // Market Competitiveness — so a manual Advanced Settings override correctly
  // shows no preset selected instead of a stale highlighted button.
  const activePreset = RATE_INCENTIVES_OPTIONS.find(
    (label) => LEVER_PRESETS.rateIncentives[label].rateBump === inputs.rateBump
  ) ?? null;

  function handlePresetChange(_id, option) {
    onBatchInputChange?.(LEVER_PRESETS.rateIncentives[option]);
  }

  return (
    <div className="bg-white border border-zinc-200 rounded-xl shadow-sm">

      {/* ── Header ── */}
      <div className="px-5 pt-5 pb-4 sm:px-6 sm:pt-6">
        <div className="flex items-center gap-3">
          <span
            className="flex items-center justify-center w-6 h-6 rounded-full bg-zinc-800 text-white text-[11px] font-bold shrink-0 select-none"
            aria-hidden="true"
          >
            3
          </span>
          <div>
            <h2 className="text-sm font-semibold text-zinc-900 leading-tight">Rate Incentives</h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Set your deposit and loan pricing strategy
            </p>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="border-t border-zinc-100 px-5 py-5 sm:px-6 space-y-5">

        {/* Rate Incentives */}
        <SegmentedLever
          id="rateIncentives"
          label="Rate Incentives"
          options={RATE_INCENTIVES_OPTIONS}
          value={activePreset}
          onChange={handlePresetChange}
          tooltip={
            <>
              <p className="mb-2">
                Sets deposit and loan rate incentives and how quickly they decay over time.
                This lever also shapes the Bass diffusion model — rates affect who joins and
                how long they stay:
              </p>
              <ul className="list-disc list-outside pl-3.5 space-y-1 mb-2">
                <li><strong>Conservative:</strong> modest flat premium attracts relationship members — quieter organic growth, lower attrition.</li>
                <li><strong>Moderate:</strong> meaningful premium that erodes over time; baseline assumptions.</li>
                <li><strong>Aggressive:</strong> high-yield-level premium drives fast word-of-mouth discovery, but attracts rate-sensitive "hot money" members who churn when a better rate appears.</li>
              </ul>
              <p className="font-medium mb-0.5">Controls</p>
              <p className="mb-2">Initial Rate Bump, Rate Bump Decay, Rate Bump Floor, Rate Cut on Digital Loans, the word-of-mouth (q) multiplier, and the attrition multiplier.</p>
              <p className="font-medium mb-0.5">Doesn't control</p>
              <p>Cannibalization rates (adjust in Advanced Settings if choosing Aggressive, as existing members may reprice deposits to capture the higher rate).</p>
            </>
          }
        />

        {/* Read-only mechanism fields — Rate Incentives sets these directly */}
        <div className="space-y-2.5 pt-1">
          <ReadoutField
            label="Initial Rate Bump"
            value={inputs.rateBump}
            unit="bps"
            tooltip={
              <>
                <p className="mb-2">
                  The premium paid on deposits above standard rates at launch — set by the
                  Rate Incentives preset above.
                </p>
                <p>
                  To override this value directly, edit Initial Rate Bump under Deposits in
                  Advanced Settings.
                </p>
              </>
            }
          />
          <ReadoutField
            label="Rate Bump Decay"
            value={inputs.ratePremiumDecay}
            unit="bps / yr"
            tooltip={
              <>
                <p className="mb-2">
                  How many basis points per year the deposit rate premium erodes — set by the
                  Rate Incentives preset above.
                </p>
                <p>
                  To override this value directly, edit Rate Bump Decay under Deposits in
                  Advanced Settings.
                </p>
              </>
            }
          />
          <ReadoutField
            label="Rate Bump Floor"
            value={inputs.rateBumpFloor}
            unit="bps"
            tooltip={
              <>
                <p className="mb-2">
                  The lowest value the deposit rate premium decays to — set by the Rate
                  Incentives preset above.
                </p>
                <p>
                  To override this value directly, edit Rate Bump Floor under Deposits in
                  Advanced Settings.
                </p>
              </>
            }
          />
          <ReadoutField
            label="Rate Cut on Digital Loans"
            value={inputs.rateCut}
            unit="bps"
            tooltip={
              <>
                <p className="mb-2">
                  The reduction in loan interest rate offered to digital members — set by the
                  Rate Incentives preset above.
                </p>
                <p>
                  To override this value directly, edit Rate Cut — Digital Loans under Loans
                  in Advanced Settings.
                </p>
              </>
            }
          />
          <ReadoutField
            label="Word-of-Mouth Multiplier (q)"
            value={inputs.qMultiplier}
            unit="× baseline"
            format={(v) => `${v.toFixed(2)}×`}
            tooltip={
              <>
                <p className="mb-2">
                  Scales how fast existing members refer others — set by the Rate Incentives
                  preset above. Aggressive rates generate a stronger social signal; Conservative
                  rates spread more quietly through relationship channels.
                </p>
                <p>
                  To override this value directly, edit Word-of-Mouth Rate Multiplier (q) under
                  Acquisition Economics in Advanced Settings.
                </p>
              </>
            }
          />
          <ReadoutField
            label="Attrition Multiplier"
            value={inputs.attritionMultiplier}
            unit="× baseline"
            format={(v) => `${v.toFixed(2)}×`}
            tooltip={
              <>
                <p className="mb-2">
                  Scales Digital Attrition — Year 1 and Steady State (set under Retention in
                  Advanced Settings) to reflect how rate-sensitive members behave: Conservative
                  rates keep more of who you get; Aggressive rates churn faster once a better
                  offer appears elsewhere.
                </p>
                {calibration && (
                  <p>
                    At {inputs.attritionMultiplier.toFixed(2)}×, effective attrition is{" "}
                    {(calibration.effectiveInputs.digitalAttritionYear1 * 100).toFixed(0)}% in
                    Year 1 (baseline {(inputs.digitalAttritionYear1 * 100).toFixed(0)}%) and{" "}
                    {(calibration.effectiveInputs.digitalAttritionSteadyState * 100).toFixed(0)}%
                    at steady state (baseline{" "}
                    {(inputs.digitalAttritionSteadyState * 100).toFixed(0)}%).
                  </p>
                )}
              </>
            }
          />
        </div>
      </div>

      {/* ── Required Acquisition Intensity + Rate Fit ── */}
      <div className="border-t border-zinc-100 bg-zinc-50 rounded-b-xl px-5 py-3.5 sm:px-6 space-y-2">
        {calibration && (
          <>
            <AcquisitionIntensityReadout calibration={calibration} />
            <BassFitIndicator
              realismIndicator={calibration.rateFitIndicator}
              label="Rate Fit"
              tensionMessage="your Month 60 goal isn't reachable at this rate posture, even at maximum realistic outbound acquisition intensity"
            />
          </>
        )}
        <MethodologyNote>
          Directionally grounded, not measured — better rates pull members in faster, worse
          rates require more outbound push to hit the same goal. The multipliers themselves
          are illustrative estimates, not fitted to observed rate-sensitivity data.
        </MethodologyNote>
      </div>
    </div>
  );
}

// ── Top-level component ───────────────────────────────────────────────────────

export default function ModelInputs({ levers, onChange, onInputChange, onBatchInputChange, inputs, calibration }) {
  return (
    <div className="space-y-6">

      {/* Step 1 — Market & Goal */}
      <MarketGoalCard
        levers={levers}
        onChange={onChange}
        onInputChange={onInputChange}
        onBatchInputChange={onBatchInputChange}
        inputs={inputs}
        calibration={calibration}
      />

      {/* Step 2 — Acquisition Economics */}
      <AcquisitionEconomicsCard
        inputs={inputs}
        onBatchInputChange={onBatchInputChange}
        calibration={calibration}
      />

      {/* Step 3 — Rate Incentives */}
      <RateIncentivesCard
        inputs={inputs}
        onBatchInputChange={onBatchInputChange}
        calibration={calibration}
      />

    </div>
  );
}

// TAM values wired to each Market Size option — exported for use in page.jsx
export const MARKET_OPPORTUNITY_TAM = {
  "150k":  150_000,
  "500k":  500_000,
  "2M":  2_000_000,
};
