import { DEFAULT_INPUTS } from "@/lib/model";

export const LEVER_PRESETS = {
  // ── Rate Incentives ───────────────────────────────────────────────────────
  // Sets deposit/loan rate incentives AND adjusts the Bass diffusion model:
  //   q multiplier — word-of-mouth referrals driven by member satisfaction with rates
  //   attrition multiplier — rate-sensitive members churn more; relationship members churn less
  // There is no p multiplier — p (paid/outbound acquisition intensity) is
  // solved in calibrateAcquisition() to hold the Month 60 goal fixed under
  // whichever posture is selected here, since p is the marketing-spend-elastic
  // lever, not a fixed behavioral consequence of the rate story.
  //
  // Conservative: modest permanent incentive; attracts relationship joiners who stay.
  // Moderate: meaningful premium that erodes over time; baseline assumptions.
  // Aggressive: high-yield-level premium; fast adoption but "hot money" churn risk.
  rateIncentives: {
    Conservative: {
      rateBump: 25, ratePremiumDecay: 0, rateBumpFloor: 25, rateCut: 10,
      qMultiplier: 0.65, attritionMultiplier: 0.60,
    },
    Moderate: {
      rateBump: 50, ratePremiumDecay: 10, rateBumpFloor: 10, rateCut: 25,
      qMultiplier: 1.0, attritionMultiplier: 1.0,
    },
    Aggressive: {
      rateBump: 100, ratePremiumDecay: 5, rateBumpFloor: 25, rateCut: 50,
      qMultiplier: 1.55, attritionMultiplier: 1.60,
    },
  },

  // ── Target Member Profile ─────────────────────────────────────────────────
  // Conservative 5-year-average assumptions for a net-new digital product.
  // Loan penetration ceiling anchored to SoFi (~20%) after years of brand-building
  // — a new CU digital program in a fresh territory is unlikely to match that.
  memberProfile: {
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
      avgDepositBalance: 8000,
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
  rateIncentives: "Moderate",
  memberProfile:  "Balanced",
};

/**
 * Returns a copy of DEFAULT_INPUTS.
 * Lever presets are applied directly in page.jsx via handleLeverChange.
 */
export function resolveInputs(_levers) {
  return { ...DEFAULT_INPUTS };
}
