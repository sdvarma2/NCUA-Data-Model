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
  rateCompetitiveness: {
    Conservative: {
      rateBump: 25,
      rateCut: 10,
      ratePremiumDecay: 15,
    },
    Moderate: {
      rateBump: 50,
      rateCut: 25,
      ratePremiumDecay: 10,
    },
    Aggressive: {
      rateBump: 100,
      rateCut: 50,
      ratePremiumDecay: 5,
    },
  },

  memberProfile: {
    "Mass Market": {
      avgDepositBalance: 8000,
      loanPenetrationRate: 0.25,
      avgLoanBalance: 12000,
    },
    Balanced: {
      avgDepositBalance: 18000,
      loanPenetrationRate: 0.40,
      avgLoanBalance: 22000,
    },
    Upmarket: {
      avgDepositBalance: 35000,
      loanPenetrationRate: 0.55,
      avgLoanBalance: 40000,
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
