import { DEFAULT_INPUTS } from "@/lib/model";

/**
 * Maps each lever position to the model inputs it controls.
 * Moderate / Balanced / Multi-Metro positions match DEFAULT_INPUTS exactly.
 */
export const LEVER_PRESETS = {
  acquisitionAggression: {
    Conservative: {
      launchCPA: 250,
      steadyStateCPA: 50,
      monthlyMemberTarget: 250,
      launchDuration: 18,
    },
    Moderate: {
      launchCPA: 400,
      steadyStateCPA: 75,
      monthlyMemberTarget: 500,
      launchDuration: 12,
    },
    Aggressive: {
      launchCPA: 600,
      steadyStateCPA: 100,
      monthlyMemberTarget: 1000,
      launchDuration: 6,
    },
  },

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

  // Per PROJECT_BRIEF.md §Market Opportunity Presets
  marketOpportunity: {
    "Single Metro": {
      addressableMarket: 150000,
      difficultyMultiplier: 1.2,
    },
    "Multi-Metro": {
      addressableMarket: 500000,
      difficultyMultiplier: 1.0,
    },
    "Multi-State": {
      addressableMarket: 1500000,
      difficultyMultiplier: 0.9,
    },
  },
};

export const LEVER_DEFAULTS = {
  acquisitionAggression: "Moderate",
  rateCompetitiveness:   "Moderate",
  memberProfile:         "Balanced",
  marketOpportunity:     "Multi-Metro",
};

/**
 * Returns a copy of DEFAULT_INPUTS.
 * Lever presets are preserved in LEVER_PRESETS for future reconnection
 * once the Advanced Settings calibration phase is complete.
 */
export function resolveInputs(_levers) {
  return { ...DEFAULT_INPUTS };
}
