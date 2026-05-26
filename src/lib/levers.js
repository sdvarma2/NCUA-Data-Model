import { DEFAULT_INPUTS } from "@/lib/model";

/**
 * Strategy lever presets.
 *
 * NOTE: acquisitionAggression and marketOpportunity were removed — replaced by the
 * Bass model acquisition inputs (milestones, TAM/SAM, CPA economics) and the
 * Market Competitiveness preset toggle in Advanced Settings.
 *
 * rateCompetitiveness and memberProfile are preserved but currently hollowed out —
 * resolveInputs returns DEFAULT_INPUTS unchanged. Reconnection deferred until
 * post-calibration phase.
 */
export const LEVER_PRESETS = {
  // 5-year window is insufficient for network effects in a new expansion market.
  // Steady-state CPA is a theoretical floor rarely approached by Month 60.
  // Conservative = flat (no efficiency gains); Aggressive = heavy invest, slight decay.
  acquisitionAggression: {
    Conservative: { initialCPA: 250, steadyStateCPA: 250, monthsToSteadyState: 60 },
    Moderate:     { initialCPA: 450, steadyStateCPA: 225, monthsToSteadyState: 60 },
    Aggressive:   { initialCPA: 800, steadyStateCPA: 200, monthsToSteadyState: 54 },
  },

  rateCompetitiveness: {
    // Conservative: "set it and forget it" — modest persistent incentive, no decay.
    // Moderate: meaningful premium that erodes slowly to a small persistent edge.
    // Aggressive: rate leadership; premium held through most of the planning window.
    Conservative: {
      rateBump: 25,
      ratePremiumDecay: 0,
      rateBumpFloor: 25,
      rateCut: 10,
    },
    Moderate: {
      rateBump: 50,
      ratePremiumDecay: 10,
      rateBumpFloor: 10,
      rateCut: 25,
    },
    Aggressive: {
      rateBump: 100,
      ratePremiumDecay: 5,
      rateBumpFloor: 25,
      rateCut: 50,
    },
  },

  memberProfile: {
    // Conservative 5-year-average assumptions for a net-new digital product.
    // Loan penetration ceiling anchored to SoFi (~20%) after years of brand-building
    // — a new CU digital program in a fresh territory is unlikely to match that.
    "Mass Market": {
      samPct: 50,
      avgDepositBalance: 6000,
      loanPenetrationRate: 0.08,
      avgLoanBalance: 10000,
      digitalAttritionYear1: 0.25,
      digitalAttritionSteadyState: 0.12,
    },
    Balanced: {
      samPct: 40,
      avgDepositBalance: 18000,
      loanPenetrationRate: 0.12,
      avgLoanBalance: 22000,
      digitalAttritionYear1: 0.18,
      digitalAttritionSteadyState: 0.07,
    },
    Upmarket: {
      samPct: 20,
      avgDepositBalance: 42000,
      loanPenetrationRate: 0.20,
      avgLoanBalance: 48000,
      digitalAttritionYear1: 0.12,
      digitalAttritionSteadyState: 0.04,
    },
  },
};

export const LEVER_DEFAULTS = {
  rateCompetitiveness: "Moderate",
  memberProfile:       "Balanced",
};

/**
 * Returns a copy of DEFAULT_INPUTS.
 * Lever presets are preserved in LEVER_PRESETS for future reconnection
 * once the Advanced Settings calibration phase is complete.
 */
export function resolveInputs(_levers) {
  return { ...DEFAULT_INPUTS };
}
