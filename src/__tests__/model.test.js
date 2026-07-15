import {
  DEFAULT_INPUTS,
  DEFAULT_FOOTPRINT_INPUTS,
  MARKET_COMPETITIVENESS_PRESETS,
  calibrateAcquisition,
  computeCPA,
  computeCumulativeAcquisitionSpend,
  computeServicingDelta,
  computeRatePremiumCost,
  computeCannibalCost,
  computeNIIContribution,
  computeModelHealth,
  findBreakEven,
  runSimulation,
  suggestMilestones,
  deriveMilestonesForM60Target,
} from "@/lib/model";

// Minimal institution fixture — 1B in assets for easy math
const INSTITUTION = {
  CU_NUMBER: 1,
  assets_b: 1.0,
  members: 50000,
  branch_count: 10,
  hybrid_nim_p50: 2.657,
};

// Stripped-down inputs that override defaults for deterministic, fast-converging tests.
// Small market + small targets → optimizer converges quickly; math remains checkable.
const TEST_INPUTS = {
  ...DEFAULT_INPUTS,
  tam: 50000,       // SAM = 50000 × 40% = 20000 households
  samPct: 40,
  m12Target: 400,   // 2% of SAM — plausible first-year penetration
  m36Target: 1500,  // 7.5% of SAM
  m60Target: 2500,  // 12.5% of SAM
};

// ─── DEFAULT_INPUTS ──────────────────────────────────────────────────────────

describe("DEFAULT_INPUTS", () => {
  it("exports an object", () => {
    expect(typeof DEFAULT_INPUTS).toBe("object");
  });

  it("has expected acquisition defaults", () => {
    expect(DEFAULT_INPUTS.marketName).toBe("Expansion Market");
    expect(DEFAULT_INPUTS.tam).toBe(500000);
    expect(DEFAULT_INPUTS.samPct).toBe(40);
    // Pre-computed from suggestMilestones(DEFAULT_INPUTS, p=0.008, q=0.30)
    // with magnitude-based rounding: SAM 200k × mid-green Bass × 18%/7% attrition
    expect(DEFAULT_INPUTS.m12Target).toBe(1700);
    expect(DEFAULT_INPUTS.m36Target).toBe(6900);
    expect(DEFAULT_INPUTS.m60Target).toBe(15000);
    expect(DEFAULT_INPUTS.initialCPA).toBe(450);
    expect(DEFAULT_INPUTS.steadyStateCPA).toBe(225);   // updated: floor rarely reached in 5yr window
    expect(DEFAULT_INPUTS.monthsToSteadyState).toBe(60); // updated: full planning horizon
  });

  it("has expected deposit defaults", () => {
    expect(DEFAULT_INPUTS.avgDepositBalance).toBe(18000);
    expect(DEFAULT_INPUTS.rateBump).toBe(50);
    expect(DEFAULT_INPUTS.ratePremiumDecay).toBe(10);
    expect(DEFAULT_INPUTS.rateBumpFloor).toBe(25);
  });

  it("has expected loan defaults", () => {
    expect(DEFAULT_INPUTS.loanPenetrationRate).toBe(0.10);
    expect(DEFAULT_INPUTS.avgLoanBalance).toBe(10000);
    expect(DEFAULT_INPUTS.rateCut).toBe(25);
  });

  it("has expected servicing defaults", () => {
    expect(DEFAULT_INPUTS.maintenanceTrad).toBe(250);
    expect(DEFAULT_INPUTS.maintenanceDigital).toBe(95);
    expect(DEFAULT_INPUTS.transactionCostTrad).toBe(4.50);
    expect(DEFAULT_INPUTS.transactionCostDigital).toBe(0.20);
    expect(DEFAULT_INPUTS.avgTellerTransactionsPerMonth).toBeCloseTo(1 / 3, 5);
    expect(DEFAULT_INPUTS.avgDigitalTransactionsPerMonth).toBe(18);
    expect(DEFAULT_INPUTS.platformCost).toBe(35);
    expect(DEFAULT_INPUTS.fraudCost).toBe(15);
    expect(DEFAULT_INPUTS.costPerBranchVisit).toBe(5);
    expect(DEFAULT_INPUTS.freeVisits).toBe(4);
  });

  it("has expected attrition defaults", () => {
    expect(DEFAULT_INPUTS.digitalAttritionYear1).toBe(0.18);
    expect(DEFAULT_INPUTS.digitalAttritionSteadyState).toBe(0.07);
  });
});

// ─── MARKET_COMPETITIVENESS_PRESETS ─────────────────────────────────────────

describe("MARKET_COMPETITIVENESS_PRESETS", () => {
  it("has Low, Medium, High positions", () => {
    expect(MARKET_COMPETITIVENESS_PRESETS).toHaveProperty("Low");
    expect(MARKET_COMPETITIVENESS_PRESETS).toHaveProperty("Medium");
    expect(MARKET_COMPETITIVENESS_PRESETS).toHaveProperty("High");
  });

  it("each position specifies initialCPA, steadyStateCPA, monthsToSteadyState", () => {
    for (const preset of Object.values(MARKET_COMPETITIVENESS_PRESETS)) {
      expect(preset).toHaveProperty("initialCPA");
      expect(preset).toHaveProperty("steadyStateCPA");
      expect(preset).toHaveProperty("monthsToSteadyState");
    }
  });

  it("High competition has higher initialCPA than Low", () => {
    expect(MARKET_COMPETITIVENESS_PRESETS.High.initialCPA).toBeGreaterThan(
      MARKET_COMPETITIVENESS_PRESETS.Low.initialCPA
    );
  });

  it("High competition has a higher steadyStateCPA floor than Low (harder market = weaker network effects)", () => {
    expect(MARKET_COMPETITIVENESS_PRESETS.High.steadyStateCPA).toBeGreaterThan(
      MARKET_COMPETITIVENESS_PRESETS.Low.steadyStateCPA
    );
  });

  it("all presets use monthsToSteadyState of 60 (floor not reached within planning window)", () => {
    for (const preset of Object.values(MARKET_COMPETITIVENESS_PRESETS)) {
      expect(preset.monthsToSteadyState).toBe(60);
    }
  });

  it("Medium preset matches DEFAULT_INPUTS CPA economics", () => {
    const med = MARKET_COMPETITIVENESS_PRESETS.Medium;
    expect(med.initialCPA).toBe(DEFAULT_INPUTS.initialCPA);
    expect(med.steadyStateCPA).toBe(DEFAULT_INPUTS.steadyStateCPA);
    expect(med.monthsToSteadyState).toBe(DEFAULT_INPUTS.monthsToSteadyState);
  });

  it("correct calibrated steady-state floors (higher competition = higher floor)", () => {
    expect(MARKET_COMPETITIVENESS_PRESETS.Low.steadyStateCPA).toBe(175);
    expect(MARKET_COMPETITIVENESS_PRESETS.Medium.steadyStateCPA).toBe(225);
    expect(MARKET_COMPETITIVENESS_PRESETS.High.steadyStateCPA).toBe(275);
  });
});

// ─── calibrateAcquisition ────────────────────────────────────────────────────

describe("calibrateAcquisition", () => {
  let result;

  beforeAll(() => {
    result = calibrateAcquisition(TEST_INPUTS);
  });

  it("returns p, q, sam, bassGrossCurve, residuals, realismIndicator", () => {
    expect(result).toHaveProperty("p");
    expect(result).toHaveProperty("q");
    expect(result).toHaveProperty("sam");
    expect(result).toHaveProperty("bassGrossCurve");
    expect(result).toHaveProperty("residuals");
    expect(result).toHaveProperty("realismIndicator");
  });

  it("returns SAM = tam × samPct/100", () => {
    expect(result.sam).toBeCloseTo(TEST_INPUTS.tam * TEST_INPUTS.samPct / 100, 1);
  });

  it("fitted p is within the search bounds [0.001, 0.05]", () => {
    expect(result.p).toBeGreaterThanOrEqual(0.001);
    expect(result.p).toBeLessThanOrEqual(0.05);
  });

  it("fitted q is within the search bounds [0.05, 0.80]", () => {
    expect(result.q).toBeGreaterThanOrEqual(0.05);
    expect(result.q).toBeLessThanOrEqual(0.80);
  });

  it("bassGrossCurve is a 60-element array of non-negative numbers", () => {
    expect(result.bassGrossCurve).toHaveLength(60);
    result.bassGrossCurve.forEach((v) => expect(v).toBeGreaterThanOrEqual(0));
  });

  it("residuals object has keys 12, 36, 60", () => {
    expect(result.residuals).toHaveProperty("12");
    expect(result.residuals).toHaveProperty("36");
    expect(result.residuals).toHaveProperty("60");
  });

  it("residuals are reasonable — optimizer gets within 30% of each target", () => {
    expect(Math.abs(result.residuals[12])).toBeLessThan(0.30);
    expect(Math.abs(result.residuals[36])).toBeLessThan(0.30);
    expect(Math.abs(result.residuals[60])).toBeLessThan(0.30);
  });

  it("realismIndicator has overall status and three component statuses", () => {
    const ri = result.realismIndicator;
    expect(["green", "yellow", "red"]).toContain(ri.overall);
    expect(["green", "yellow", "red"]).toContain(ri.paramStatus);
    expect(["green", "yellow", "red"]).toContain(ri.fitStatus);
    expect(["green", "yellow", "red"]).toContain(ri.tensionStatus);
  });

  it("overall status is the worst of the three component statuses", () => {
    const ri = result.realismIndicator;
    const rank = { green: 0, yellow: 1, red: 2 };
    const worst = Math.max(rank[ri.paramStatus], rank[ri.fitStatus], rank[ri.tensionStatus]);
    const overallRank = rank[ri.overall];
    expect(overallRank).toBe(worst);
  });

  it("does not mutate DEFAULT_INPUTS", () => {
    const before = { ...DEFAULT_INPUTS };
    calibrateAcquisition(TEST_INPUTS);
    expect(DEFAULT_INPUTS).toEqual(before);
  });
});

// ─── calibrateAcquisition — Rate Incentives solve-for-p ──────────────────────
// p (paid/outbound acquisition intensity) is solved to hold the Month 60 goal
// fixed under whatever Rate Incentives posture is selected — it is no longer
// a straight multiply. q and attrition are still multiplied directly.

describe("calibrateAcquisition — Rate Incentives solve-for-p", () => {
  it("returns pBaseline, qBaseline, and rateFitIndicator in addition to p/q/realismIndicator", () => {
    const result = calibrateAcquisition(TEST_INPUTS);
    expect(result).toHaveProperty("pBaseline");
    expect(result).toHaveProperty("qBaseline");
    expect(result).toHaveProperty("rateFitIndicator");
  });

  it("at Moderate multipliers (1.0×), p solves back to pBaseline and q equals qBaseline", () => {
    const result = calibrateAcquisition(TEST_INPUTS); // qMultiplier/attritionMultiplier default to 1.0
    expect(result.p).toBeCloseTo(result.pBaseline, 3);
    expect(result.q).toBe(result.qBaseline);
  });

  it("residuals[60] is ~0 whenever the solved p is not pinned at a search bound (goal hit exactly)", () => {
    const result = calibrateAcquisition(TEST_INPUTS);
    expect(result.p).toBeGreaterThan(0.001);
    expect(result.p).toBeLessThan(0.05);
    expect(Math.abs(result.residuals[60])).toBeLessThan(0.01);
  });

  it("higher qMultiplier (more word-of-mouth) requires lower p to hit the same goal", () => {
    const lowQ  = calibrateAcquisition({ ...TEST_INPUTS, qMultiplier: 0.65 });
    const highQ = calibrateAcquisition({ ...TEST_INPUTS, qMultiplier: 1.55 });
    expect(highQ.p).toBeLessThan(lowQ.p);
  });

  it("higher attritionMultiplier (faster churn) requires higher p to hit the same goal", () => {
    const lowAttrition  = calibrateAcquisition({ ...TEST_INPUTS, attritionMultiplier: 0.60 });
    const highAttrition = calibrateAcquisition({ ...TEST_INPUTS, attritionMultiplier: 1.60 });
    expect(highAttrition.p).toBeGreaterThan(lowAttrition.p);
  });

  it("both non-Moderate multipliers still hit the goal almost exactly (Month 60 never drifts)", () => {
    const conservative = calibrateAcquisition({ ...TEST_INPUTS, qMultiplier: 0.65, attritionMultiplier: 0.60 });
    const aggressive   = calibrateAcquisition({ ...TEST_INPUTS, qMultiplier: 1.55, attritionMultiplier: 1.60 });
    expect(Math.abs(conservative.residuals[60])).toBeLessThan(0.02);
    expect(Math.abs(aggressive.residuals[60])).toBeLessThan(0.02);
  });

  it("realismIndicator (baseline, Market & Goal) is unaffected by qMultiplier/attritionMultiplier", () => {
    const moderate   = calibrateAcquisition(TEST_INPUTS);
    const aggressive = calibrateAcquisition({ ...TEST_INPUTS, qMultiplier: 1.55, attritionMultiplier: 1.60 });
    expect(aggressive.pBaseline).toBeCloseTo(moderate.pBaseline, 6);
    expect(aggressive.qBaseline).toBeCloseTo(moderate.qBaseline, 6);
    expect(aggressive.realismIndicator).toEqual(moderate.realismIndicator);
  });

  it("an unreachable goal at a given rate posture pins p at the upper bound and shows a non-trivial residual", () => {
    // SAM is tiny relative to an aggressively large goal — even q boosted by
    // Aggressive rates can't make up the gap without an unrealistic p.
    const tinyMarket = { ...TEST_INPUTS, tam: 2000, samPct: 40, qMultiplier: 1.55, attritionMultiplier: 1.60 };
    const result = calibrateAcquisition(tinyMarket);
    expect(result.p).toBeCloseTo(0.05, 5);
    expect(result.rateFitIndicator.overall).not.toBe("green");
  });

  it("rateFitIndicator reflects the current rate posture and can differ from the baseline realismIndicator", () => {
    const aggressive = calibrateAcquisition({
      ...TEST_INPUTS, tam: 2000, samPct: 40, qMultiplier: 1.55, attritionMultiplier: 1.60,
    });
    expect(aggressive.rateFitIndicator).not.toEqual(aggressive.realismIndicator);
  });

  it("rateFitIndicator is NOT flagged red merely because Aggressive's back-loaded curve undershoots M12/M36, as long as Month 60 is hit (regression: was previously judged against all three milestones)", () => {
    // DEFAULT_INPUTS reproduces the reported bug directly: Aggressive's low
    // p / high q reshapes the curve to be heavily back-loaded (word-of-mouth
    // needs an installed base to compound), which genuinely undershoots M12
    // even while landing exactly on M60.
    const moderate   = calibrateAcquisition(DEFAULT_INPUTS);
    const aggressive = calibrateAcquisition({ ...DEFAULT_INPUTS, qMultiplier: 1.55, attritionMultiplier: 1.60 });

    // Confirm the scenario this regression test targets: p is not saturated,
    // Month 60 is hit almost exactly, but Month 12 is genuinely undershot.
    expect(aggressive.p).toBeLessThan(0.05);
    expect(Math.abs(aggressive.residuals[60])).toBeLessThan(0.02);
    expect(aggressive.residuals[12]).toBeLessThan(-0.10);

    // Despite that M12 shortfall, Rate Fit should still read as achievable —
    // it only judges the milestone p is actually solved against.
    expect(aggressive.rateFitIndicator.tensionStatus).toBe("green");
    expect(moderate.rateFitIndicator.overall).toBe(aggressive.rateFitIndicator.overall);
  });

  it("does not mutate the input object", () => {
    const inputs = { ...TEST_INPUTS, qMultiplier: 1.55, attritionMultiplier: 1.60 };
    const before = { ...inputs };
    calibrateAcquisition(inputs);
    expect(inputs).toEqual(before);
  });
});

// ─── computeCPA ──────────────────────────────────────────────────────────────

describe("computeCPA", () => {
  it("at month 1 (well before inflection), CPA is close to initialCPA", () => {
    const cpa = computeCPA(1, DEFAULT_INPUTS);
    // At month 1 with t_mid=12, CPA should be very close to initialCPA
    expect(cpa).toBeGreaterThan(DEFAULT_INPUTS.steadyStateCPA);
    expect(cpa).toBeLessThanOrEqual(DEFAULT_INPUTS.initialCPA);
    expect(cpa).toBeGreaterThan(DEFAULT_INPUTS.initialCPA * 0.9);
  });

  it("at monthsToSteadyState, CPA has almost fully decayed to steadyStateCPA (within 5% of range)", () => {
    const cpa   = computeCPA(DEFAULT_INPUTS.monthsToSteadyState, DEFAULT_INPUTS);
    const range = DEFAULT_INPUTS.initialCPA - DEFAULT_INPUTS.steadyStateCPA;
    // logistic at t = monthsToSteadyState is ~98.2% decayed — remaining gap < 5% of full range
    expect(cpa).toBeGreaterThan(DEFAULT_INPUTS.steadyStateCPA);
    expect(cpa - DEFAULT_INPUTS.steadyStateCPA).toBeLessThan(range * 0.05);
  });

  it("CPA decreases monotonically over time", () => {
    let prev = computeCPA(1, DEFAULT_INPUTS);
    for (let m = 2; m <= 60; m++) {
      const curr = computeCPA(m, DEFAULT_INPUTS);
      expect(curr).toBeLessThanOrEqual(prev + 0.001); // allow tiny float noise
      prev = curr;
    }
  });

  it("CPA is always at least steadyStateCPA", () => {
    for (let m = 1; m <= 60; m++) {
      expect(computeCPA(m, DEFAULT_INPUTS)).toBeGreaterThanOrEqual(DEFAULT_INPUTS.steadyStateCPA);
    }
  });

  it("at inflection point (monthsToSteadyState/2) CPA is midway between initial and steady-state", () => {
    const mid = DEFAULT_INPUTS.monthsToSteadyState / 2;
    const cpa = computeCPA(mid, DEFAULT_INPUTS);
    const expectedMid = (DEFAULT_INPUTS.initialCPA + DEFAULT_INPUTS.steadyStateCPA) / 2;
    expect(cpa).toBeCloseTo(expectedMid, 0);
  });
});

// ─── computeCumulativeAcquisitionSpend ───────────────────────────────────────

describe("computeCumulativeAcquisitionSpend", () => {
  it("equals the sum of newMembersGross(m) × computeCPA(m) across all 60 months", () => {
    const calibration = calibrateAcquisition(TEST_INPUTS);
    let expected = 0;
    for (let m = 1; m <= 60; m++) {
      expected += calibration.bassGrossCurve[m - 1] * computeCPA(m, calibration.effectiveInputs);
    }
    expect(computeCumulativeAcquisitionSpend(calibration)).toBeCloseTo(expected, 6);
  });

  it("is positive whenever the Bass curve acquires any members", () => {
    const calibration = calibrateAcquisition(TEST_INPUTS);
    expect(calibration.bassGrossCurve.some((v) => v > 0)).toBe(true);
    expect(computeCumulativeAcquisitionSpend(calibration)).toBeGreaterThan(0);
  });

  it("a higher Market Competitiveness preset (higher CPA) increases total spend, holding the curve fixed", () => {
    const lowCPAInputs  = { ...TEST_INPUTS, initialCPA: 300, steadyStateCPA: 175 };
    const highCPAInputs = { ...TEST_INPUTS, initialCPA: 650, steadyStateCPA: 275 };
    const lowSpend  = computeCumulativeAcquisitionSpend(calibrateAcquisition(lowCPAInputs));
    const highSpend = computeCumulativeAcquisitionSpend(calibrateAcquisition(highCPAInputs));
    expect(highSpend).toBeGreaterThan(lowSpend);
  });

  it("a larger Bass curve (bigger m60Target) increases total spend, holding CPA fixed", () => {
    const smallGoalInputs = { ...TEST_INPUTS, m60Target: 1500, m36Target: 900, m12Target: 250 };
    const bigGoalInputs   = { ...TEST_INPUTS, m60Target: 3000, m36Target: 1800, m12Target: 500 };
    const smallSpend = computeCumulativeAcquisitionSpend(calibrateAcquisition(smallGoalInputs));
    const bigSpend   = computeCumulativeAcquisitionSpend(calibrateAcquisition(bigGoalInputs));
    expect(bigSpend).toBeGreaterThan(smallSpend);
  });

  it("does not mutate the calibration object", () => {
    const calibration = calibrateAcquisition(TEST_INPUTS);
    const before = JSON.parse(JSON.stringify(calibration.bassGrossCurve));
    computeCumulativeAcquisitionSpend(calibration);
    expect(calibration.bassGrossCurve).toEqual(before);
  });
});

// ─── computeServicingDelta ───────────────────────────────────────────────────

describe("computeServicingDelta", () => {
  it("returns positive monthly savings (digital is cheaper than traditional)", () => {
    const savings = computeServicingDelta(1000, DEFAULT_INPUTS);
    expect(savings).toBeGreaterThan(0);
  });

  it("scales linearly with number of digital members", () => {
    const s100 = computeServicingDelta(100, DEFAULT_INPUTS);
    const s200 = computeServicingDelta(200, DEFAULT_INPUTS);
    expect(s200).toBeCloseTo(s100 * 2, 0);
  });

  it("returns a monthly (not annual) figure", () => {
    // savings/member/yr ≈ $103 at defaults; 1000 members → ~$8,583/month
    const savings = computeServicingDelta(1000, DEFAULT_INPUTS);
    expect(savings).toBeGreaterThan(5000);
    expect(savings).toBeLessThan(20000);
  });

  it("includes branch visit subsidy in digital cost", () => {
    const withVisits    = computeServicingDelta(1000, { ...DEFAULT_INPUTS, freeVisits: 4, costPerBranchVisit: 5 });
    const withoutVisits = computeServicingDelta(1000, { ...DEFAULT_INPUTS, freeVisits: 0, costPerBranchVisit: 5 });
    expect(withoutVisits).toBeGreaterThan(withVisits);
  });

  it("respects freeVisits values above 4 (regression: was capped at 4)", () => {
    const four  = computeServicingDelta(1000, { ...DEFAULT_INPUTS, freeVisits: 4,  costPerBranchVisit: 10 });
    const eight = computeServicingDelta(1000, { ...DEFAULT_INPUTS, freeVisits: 8,  costPerBranchVisit: 10 });
    const zero  = computeServicingDelta(1000, { ...DEFAULT_INPUTS, freeVisits: 0,  costPerBranchVisit: 10 });
    // Each extra visit costs $10/yr per member; gap between tiers should be 4 × $10 = $40/yr = ~$3.33/mo per member
    expect(zero).toBeGreaterThan(four);
    expect(four).toBeGreaterThan(eight);
    expect(zero - four).toBeCloseTo(1000 * 4 * 10 / 12, 0);
    expect(four - eight).toBeCloseTo(1000 * 4 * 10 / 12, 0);
  });

  it("returns zero savings when digital and traditional costs are equal", () => {
    const equalInputs = {
      ...DEFAULT_INPUTS,
      maintenanceTrad: 95,
      maintenanceDigital: 95,
      transactionCostTrad: 0.20,
      transactionCostDigital: 0.20,
      avgTellerTransactionsPerMonth: 0,
      avgDigitalTransactionsPerMonth: 0,
      platformCost: 0,
      fraudCost: 0,
      freeVisits: 0,
    };
    expect(computeServicingDelta(1000, equalInputs)).toBeCloseTo(0, 0);
  });
});

// ─── computeRatePremiumCost ──────────────────────────────────────────────────

describe("computeRatePremiumCost", () => {
  it("applies full rateBump at month 1 (no decay yet)", () => {
    // 100 members: deposit = 18000 × 0.005 / 12 = 7.5, loan = 10000 × 0.10 × 0.0025 / 12 ≈ 0.208
    const cost = computeRatePremiumCost(100, DEFAULT_INPUTS, 1);
    expect(cost).toBeCloseTo(100 * (7.5 + 0.2083), 0);
  });

  it("reduces effective rate bump over time due to decay", () => {
    const early = computeRatePremiumCost(100, DEFAULT_INPUTS, 1);
    const later = computeRatePremiumCost(100, DEFAULT_INPUTS, 25);
    expect(later).toBeLessThan(early);
  });

  it("effective bump never goes below rateBumpFloor (default floor = 0)", () => {
    const cost = computeRatePremiumCost(100, DEFAULT_INPUTS, 100);
    expect(cost).toBeGreaterThanOrEqual(0);
  });

  it("rate bump decays to floor and stops — does not go lower", () => {
    // 50 bps initial, 50 bps/yr decay, 20 bps floor → should stabilise at 20 bps, not 0
    const inputs = { ...DEFAULT_INPUTS, rateBump: 50, ratePremiumDecay: 50, rateBumpFloor: 20 };
    const costEarly = computeRatePremiumCost(100, inputs, 1);   // bump ≈ 50 bps
    const costLate  = computeRatePremiumCost(100, inputs, 60);  // fully decayed — should be floor
    // Cost at floor must be positive (floor > 0) and less than early cost
    expect(costLate).toBeGreaterThan(0);
    expect(costLate).toBeLessThan(costEarly);
    // Verify cost stays constant once floor is reached (months 36 vs 60 with 50 bps/yr decay)
    const cost36 = computeRatePremiumCost(100, inputs, 36);
    const cost60 = computeRatePremiumCost(100, inputs, 60);
    expect(cost60).toBeCloseTo(cost36, 0);
  });

  it("scales linearly with total digital members", () => {
    const c100 = computeRatePremiumCost(100, DEFAULT_INPUTS, 1);
    const c200 = computeRatePremiumCost(200, DEFAULT_INPUTS, 1);
    expect(c200).toBeCloseTo(c100 * 2, 0);
  });
});

// ─── computeCannibalCost ─────────────────────────────────────────────────────

describe("computeCannibalCost", () => {
  it("returns deposit and loan components as separate keys", () => {
    const result = computeCannibalCost(INSTITUTION, DEFAULT_INPUTS, "scenario_a");
    expect(result).toHaveProperty("depositCannibalizationCost");
    expect(result).toHaveProperty("loanCannibalizationCost");
  });

  it("scenario B has ~10× higher cannibalization than scenario A", () => {
    const a = computeCannibalCost(INSTITUTION, DEFAULT_INPUTS, "scenario_a");
    const b = computeCannibalCost(INSTITUTION, DEFAULT_INPUTS, "scenario_b");
    const totalA = a.depositCannibalizationCost + a.loanCannibalizationCost;
    const totalB = b.depositCannibalizationCost + b.loanCannibalizationCost;
    expect(totalB / totalA).toBeCloseTo(10, 0);
  });

  it("scales with institution asset size", () => {
    const small = computeCannibalCost({ ...INSTITUTION, assets_b: 1 }, DEFAULT_INPUTS, "scenario_b");
    const large = computeCannibalCost({ ...INSTITUTION, assets_b: 10 }, DEFAULT_INPUTS, "scenario_b");
    const totalSmall = small.depositCannibalizationCost + small.loanCannibalizationCost;
    const totalLarge = large.depositCannibalizationCost + large.loanCannibalizationCost;
    expect(totalLarge).toBeCloseTo(totalSmall * 10, 0);
  });

  it("deposit drag formula: existingShares × cannibRate × (rateBump/10000) / 12", () => {
    const { depositCannibalizationCost } = computeCannibalCost(INSTITUTION, DEFAULT_INPUTS, "scenario_a");
    const expected = (1e9 * 0.85) * 0.005 * (50 / 10000) / 12;
    expect(depositCannibalizationCost).toBeCloseTo(expected, 0);
  });
});

// ─── computeNIIContribution ──────────────────────────────────────────────────

describe("computeNIIContribution", () => {
  it("returns a positive monthly NII for non-zero members", () => {
    expect(computeNIIContribution(1000, DEFAULT_INPUTS, INSTITUTION)).toBeGreaterThan(0);
  });

  it("returns zero when there are no digital members", () => {
    expect(computeNIIContribution(0, DEFAULT_INPUTS, INSTITUTION)).toBe(0);
  });

  it("scales linearly with total digital members", () => {
    const nii100 = computeNIIContribution(100, DEFAULT_INPUTS, INSTITUTION);
    const nii200 = computeNIIContribution(200, DEFAULT_INPUTS, INSTITUTION);
    expect(nii200).toBeCloseTo(nii100 * 2, 0);
  });

  it("uses hybrid_nim_p50 not institution nim_pct", () => {
    const highHybrid = computeNIIContribution(1000, DEFAULT_INPUTS, { ...INSTITUTION, hybrid_nim_p50: 4.0, nim_pct: 1.0 });
    const lowHybrid  = computeNIIContribution(1000, DEFAULT_INPUTS, { ...INSTITUTION, hybrid_nim_p50: 1.0, nim_pct: 4.0 });
    expect(highHybrid).toBeGreaterThan(lowHybrid);
  });

  it("formula: members × avgDepositBalance × (hybrid_nim_p50 / 100) / 12", () => {
    const expected = 1000 * DEFAULT_INPUTS.avgDepositBalance * (INSTITUTION.hybrid_nim_p50 / 100) / 12;
    expect(computeNIIContribution(1000, DEFAULT_INPUTS, INSTITUTION)).toBeCloseTo(expected, 0);
  });

  it("returns a monthly (not annual) figure", () => {
    // 1000 × $18000 × 2.657% / 12 ≈ $39,855/month
    const nii = computeNIIContribution(1000, DEFAULT_INPUTS, INSTITUTION);
    expect(nii).toBeGreaterThan(25000);
    expect(nii).toBeLessThan(65000);
  });
});

// ─── computeModelHealth ──────────────────────────────────────────────────────

describe("computeModelHealth", () => {
  // Extend INSTITUTION fixture with nim_pct (2.5%) for % of NII calculations
  const INST = { ...INSTITUTION, nim_pct: 2.5 };

  it("returns all required keys", () => {
    const h = computeModelHealth(DEFAULT_INPUTS, INST);
    expect(h).toHaveProperty("servicingSavingsPerMemberYr");
    expect(h).toHaveProperty("ratePremiumPerMemberYr");
    expect(h).toHaveProperty("netPerMemberYr");
    expect(h).toHaveProperty("monthlyNIIper1000");
    expect(h).toHaveProperty("monthlyRatePremiumPer1000");
    expect(h).toHaveProperty("niiCoverageRatio");
    expect(h).toHaveProperty("annualCannibDragScenarioB");
    expect(h).toHaveProperty("cannibDragAsPctOfNII");
  });

  it("servicing savings match the model brief formula at defaults (~$103/yr)", () => {
    // 250 − 95 + (1/3 × 12 × $4.50) − $35 − $15 − (4 × $5) = $103
    const h = computeModelHealth(DEFAULT_INPUTS, INST);
    expect(h.servicingSavingsPerMemberYr).toBeCloseTo(103, 0);
  });

  it("servicing savings decrease when digital costs rise", () => {
    const higher = computeModelHealth({ ...DEFAULT_INPUTS, platformCost: 100 }, INST);
    const base   = computeModelHealth(DEFAULT_INPUTS, INST);
    expect(higher.servicingSavingsPerMemberYr).toBeLessThan(base.servicingSavingsPerMemberYr);
  });

  it("servicing savings increase when more free branch visits are included", () => {
    // More visits → higher subsidy → lower net savings
    const more = computeModelHealth({ ...DEFAULT_INPUTS, freeVisits: 8 }, INST);
    const base = computeModelHealth(DEFAULT_INPUTS, INST);
    expect(more.servicingSavingsPerMemberYr).toBeLessThan(base.servicingSavingsPerMemberYr);
  });

  it("netPerMemberYr equals servicingSavings minus ratePremium", () => {
    const h = computeModelHealth(DEFAULT_INPUTS, INST);
    expect(h.netPerMemberYr).toBeCloseTo(
      h.servicingSavingsPerMemberYr - h.ratePremiumPerMemberYr, 5
    );
  });

  it("netPerMemberYr is positive at defaults (servicing gains outweigh rate concessions)", () => {
    // At defaults: savings ~$103/yr, rate premium ~$90/yr → net should be > 0
    const h = computeModelHealth(DEFAULT_INPUTS, INST);
    expect(h.netPerMemberYr).toBeGreaterThan(0);
  });

  it("monthly rate premium equals annual premium × 1000 ÷ 12", () => {
    const h = computeModelHealth(DEFAULT_INPUTS, INST);
    expect(h.monthlyRatePremiumPer1000).toBeCloseTo(h.ratePremiumPerMemberYr * 1000 / 12, 2);
  });

  it("monthly NII per 1,000 matches computeNIIContribution at 1,000 members", () => {
    const h      = computeModelHealth(DEFAULT_INPUTS, INST);
    const direct = computeNIIContribution(1000, DEFAULT_INPUTS, INST);
    expect(h.monthlyNIIper1000).toBeCloseTo(direct, 0);
  });

  it("NII coverage ratio equals monthlyNII / monthlyRatePremium", () => {
    const h = computeModelHealth(DEFAULT_INPUTS, INST);
    expect(h.niiCoverageRatio).toBeCloseTo(
      h.monthlyNIIper1000 / h.monthlyRatePremiumPer1000, 5
    );
  });

  it("NII coverage ratio is null when both rate premium fields are zero", () => {
    const h = computeModelHealth({ ...DEFAULT_INPUTS, rateBump: 0, rateCut: 0 }, INST);
    expect(h.niiCoverageRatio).toBeNull();
  });

  it("NII coverage is well above 3× at defaults (NII dwarfs rate premium)", () => {
    const h = computeModelHealth(DEFAULT_INPUTS, INST);
    expect(h.niiCoverageRatio).toBeGreaterThan(3);
  });

  it("annual cannibalization drag scales linearly with institution asset size", () => {
    const small = computeModelHealth(DEFAULT_INPUTS, { ...INST, assets_b: 1 });
    const large = computeModelHealth(DEFAULT_INPUTS, { ...INST, assets_b: 4 });
    expect(large.annualCannibDragScenarioB).toBeCloseTo(
      small.annualCannibDragScenarioB * 4, 0
    );
  });

  it("cannibDragAsPctOfNII is null when nim_pct is missing from institution", () => {
    const h = computeModelHealth(DEFAULT_INPUTS, INSTITUTION); // no nim_pct
    expect(h.cannibDragAsPctOfNII).toBeNull();
  });

  it("cannibDragAsPctOfNII is positive when nim_pct is present", () => {
    const h = computeModelHealth(DEFAULT_INPUTS, INST);
    expect(h.cannibDragAsPctOfNII).toBeGreaterThan(0);
    expect(h.cannibDragAsPctOfNII).toBeLessThan(1); // less than 100% of NII
  });

  it("does not mutate inputs or institution", () => {
    const inputsBefore = { ...DEFAULT_INPUTS };
    const instBefore   = { ...INST };
    computeModelHealth(DEFAULT_INPUTS, INST);
    expect(DEFAULT_INPUTS).toEqual(inputsBefore);
    expect(INST).toEqual(instBefore);
  });
});

// ─── findBreakEven ───────────────────────────────────────────────────────────

describe("findBreakEven", () => {
  it("returns the first month where cumulativeNetContribution >= 0", () => {
    const months = [
      { month: 1, cumulativeNetContribution: -5000 },
      { month: 2, cumulativeNetContribution: -2000 },
      { month: 3, cumulativeNetContribution: 500 },
      { month: 4, cumulativeNetContribution: 3000 },
    ];
    expect(findBreakEven(months)).toBe(3);
  });

  it("returns null if cumulative net contribution never reaches zero", () => {
    const months = Array.from({ length: 60 }, (_, i) => ({
      month: i + 1,
      cumulativeNetContribution: -(1000 * (60 - i)),
    }));
    expect(findBreakEven(months)).toBeNull();
  });

  it("returns month 1 when first month is already profitable", () => {
    const months = [{ month: 1, cumulativeNetContribution: 100 }];
    expect(findBreakEven(months)).toBe(1);
  });
});

// ─── runSimulation ───────────────────────────────────────────────────────────

describe("runSimulation", () => {
  let resultA;
  let resultB;

  beforeAll(() => {
    resultA = runSimulation(INSTITUTION, TEST_INPUTS, "scenario_a");
    resultB = runSimulation(INSTITUTION, TEST_INPUTS, "scenario_b");
  });

  it("returns an object with months and calibration keys", () => {
    expect(resultA).toHaveProperty("months");
    expect(resultA).toHaveProperty("calibration");
  });

  it("months is an array of exactly 60 elements", () => {
    expect(resultA.months).toHaveLength(60);
  });

  it("month numbers run 1 through 60", () => {
    expect(resultA.months[0].month).toBe(1);
    expect(resultA.months[59].month).toBe(60);
  });

  it("each month object has the required shape", () => {
    const first = resultA.months[0];
    expect(first).toHaveProperty("month");
    expect(first).toHaveProperty("newMembersGross");
    expect(first).toHaveProperty("newMembersActive");
    expect(first).toHaveProperty("totalActiveMembers");
    expect(first).toHaveProperty("cpa");
    expect(first).toHaveProperty("monthlyAcquisitionSpend");
    expect(first).toHaveProperty("cumulativeAcquisitionSpend");
    expect(first).toHaveProperty("samPenetrationPct");
    expect(first).toHaveProperty("monthlyRatePremiumCost");
    expect(first).toHaveProperty("monthlyCannibalizationCost");
    expect(first).toHaveProperty("depositCannibalizationCost");
    expect(first).toHaveProperty("loanCannibalizationCost");
    expect(first).toHaveProperty("monthlyServicingCostSavings");
    expect(first).toHaveProperty("monthlyGrossNII");
    expect(first).toHaveProperty("monthlyNetContribution");
    expect(first).toHaveProperty("cumulativeNetContribution");
    expect(first).toHaveProperty("cumulativeCannibalDrag");
    expect(first).toHaveProperty("isBreakEvenMonth");
  });

  it("calibration exposes p, q, sam, bassGrossCurve, residuals, realismIndicator", () => {
    expect(resultA.calibration).toHaveProperty("p");
    expect(resultA.calibration).toHaveProperty("q");
    expect(resultA.calibration).toHaveProperty("sam");
    expect(resultA.calibration).toHaveProperty("bassGrossCurve");
    expect(resultA.calibration).toHaveProperty("residuals");
    expect(resultA.calibration).toHaveProperty("realismIndicator");
  });

  it("cumulative net contribution starts negative (acquisition spend dominates month 1)", () => {
    expect(resultA.months[0].cumulativeNetContribution).toBeLessThan(0);
  });

  it("monthlyGrossNII is positive once members have been acquired", () => {
    expect(resultA.months[1].monthlyGrossNII).toBeGreaterThan(0);
  });

  it("total active members grows in early months", () => {
    expect(resultA.months[5].totalActiveMembers).toBeGreaterThan(resultA.months[0].totalActiveMembers);
  });

  it("SAM penetration percentage is between 0 and 1", () => {
    resultA.months.forEach((m) => {
      expect(m.samPenetrationPct).toBeGreaterThanOrEqual(0);
      expect(m.samPenetrationPct).toBeLessThanOrEqual(1);
    });
  });

  it("SAM penetration increases over time in early months", () => {
    expect(resultA.months[11].samPenetrationPct).toBeGreaterThan(resultA.months[0].samPenetrationPct);
  });

  it("exactly one or zero months marked isBreakEvenMonth", () => {
    const breakEvenMonths = resultA.months.filter((m) => m.isBreakEvenMonth);
    expect(breakEvenMonths.length).toBeLessThanOrEqual(1);
  });

  it("scenario B has higher cumulative cannibalization drag than scenario A", () => {
    expect(resultB.months[59].cumulativeCannibalDrag).toBeGreaterThan(
      resultA.months[59].cumulativeCannibalDrag
    );
  });

  it("cumulative acquisition spend increases monotonically", () => {
    for (let i = 1; i < resultA.months.length; i++) {
      expect(resultA.months[i].cumulativeAcquisitionSpend).toBeGreaterThanOrEqual(
        resultA.months[i - 1].cumulativeAcquisitionSpend
      );
    }
  });

  it("CPA in month 1 is close to initialCPA and decays toward steadyStateCPA by month 60", () => {
    expect(resultA.months[0].cpa).toBeGreaterThan(TEST_INPUTS.steadyStateCPA);
    expect(resultA.months[59].cpa).toBeLessThan(resultA.months[0].cpa);
  });

  it("both scenarios share the same calibration (scenario-independent)", () => {
    // p and q are fitted only to inputs, not to scenario
    expect(resultA.calibration.p).toBeCloseTo(resultB.calibration.p, 10);
    expect(resultA.calibration.q).toBeCloseTo(resultB.calibration.q, 10);
  });

  it("footprintCalibration is null when no footprintInputs passed", () => {
    expect(resultA.footprintCalibration).toBeNull();
    expect(resultB.footprintCalibration).toBeNull();
  });
});

// ─── DEFAULT_FOOTPRINT_INPUTS ─────────────────────────────────────────────────

describe("DEFAULT_FOOTPRINT_INPUTS", () => {
  it("has all required acquisition keys", () => {
    expect(DEFAULT_FOOTPRINT_INPUTS).toHaveProperty("marketName");
    expect(DEFAULT_FOOTPRINT_INPUTS).toHaveProperty("tam");
    expect(DEFAULT_FOOTPRINT_INPUTS).toHaveProperty("samPct");
    expect(DEFAULT_FOOTPRINT_INPUTS).toHaveProperty("m12Target");
    expect(DEFAULT_FOOTPRINT_INPUTS).toHaveProperty("m36Target");
    expect(DEFAULT_FOOTPRINT_INPUTS).toHaveProperty("m60Target");
    expect(DEFAULT_FOOTPRINT_INPUTS).toHaveProperty("initialCPA");
    expect(DEFAULT_FOOTPRINT_INPUTS).toHaveProperty("steadyStateCPA");
    expect(DEFAULT_FOOTPRINT_INPUTS).toHaveProperty("monthsToSteadyState");
  });

  it("CPA has sensible cross-sell defaults when marketing is enabled ($75 initial, $20 steady-state)", () => {
    // Marketing OFF: page.jsx memo forces CPA→0 regardless of these values.
    // Marketing ON:  these are the pre-filled starting points for the CPA fields.
    // $75 initial ≈ expansion-market steady-state (existing relationship removes brand-building cost).
    // $20 steady-state ≈ email/app cross-sell at near-marginal cost.
    expect(DEFAULT_FOOTPRINT_INPUTS.initialCPA).toBe(75);
    expect(DEFAULT_FOOTPRINT_INPUTS.steadyStateCPA).toBe(20);
  });

  it("has higher avgDepositBalance than DEFAULT_INPUTS (established members)", () => {
    expect(DEFAULT_FOOTPRINT_INPUTS.avgDepositBalance).toBeGreaterThan(DEFAULT_INPUTS.avgDepositBalance);
  });

  it("has higher loanPenetrationRate than DEFAULT_INPUTS (existing product awareness)", () => {
    expect(DEFAULT_FOOTPRINT_INPUTS.loanPenetrationRate).toBeGreaterThan(DEFAULT_INPUTS.loanPenetrationRate);
  });

  it("has lower attrition than DEFAULT_INPUTS (established relationship stickiness)", () => {
    expect(DEFAULT_FOOTPRINT_INPUTS.digitalAttritionYear1).toBeLessThan(DEFAULT_INPUTS.digitalAttritionYear1);
    expect(DEFAULT_FOOTPRINT_INPUTS.digitalAttritionSteadyState).toBeLessThan(DEFAULT_INPUTS.digitalAttritionSteadyState);
  });

  it("has lower rateBump than DEFAULT_INPUTS (less incentive needed inside footprint)", () => {
    expect(DEFAULT_FOOTPRINT_INPUTS.rateBump).toBeLessThan(DEFAULT_INPUTS.rateBump);
  });

  it("has conservative membership milestones (organic/cross-sell adoption is slower)", () => {
    expect(DEFAULT_FOOTPRINT_INPUTS.m12Target).toBeLessThan(DEFAULT_INPUTS.m12Target);
    expect(DEFAULT_FOOTPRINT_INPUTS.m60Target).toBeLessThan(DEFAULT_INPUTS.m60Target);
  });
});

// ─── suggestMilestones ────────────────────────────────────────────────────────

describe("suggestMilestones", () => {
  it("returns all three milestone keys", () => {
    const result = suggestMilestones(TEST_INPUTS);
    expect(result).toHaveProperty("m12Target");
    expect(result).toHaveProperty("m36Target");
    expect(result).toHaveProperty("m60Target");
  });

  it("milestones are strictly increasing (m12 < m36 < m60)", () => {
    const { m12Target, m36Target, m60Target } = suggestMilestones(TEST_INPUTS);
    expect(m12Target).toBeGreaterThan(0);
    expect(m36Target).toBeGreaterThan(m12Target);
    expect(m60Target).toBeGreaterThan(m36Target);
  });

  it("milestones are all positive integers", () => {
    const { m12Target, m36Target, m60Target } = suggestMilestones(TEST_INPUTS);
    expect(Number.isInteger(m12Target)).toBe(true);
    expect(Number.isInteger(m36Target)).toBe(true);
    expect(Number.isInteger(m60Target)).toBe(true);
    expect(m12Target).toBeGreaterThan(0);
  });

  it("all milestones are well below SAM (< 40% penetration with reference p/q)", () => {
    const sam = TEST_INPUTS.tam * (TEST_INPUTS.samPct / 100); // 20,000
    const { m12Target, m36Target, m60Target } = suggestMilestones(TEST_INPUTS);
    expect(m12Target).toBeLessThan(sam * 0.40);
    expect(m36Target).toBeLessThan(sam * 0.40);
    expect(m60Target).toBeLessThan(sam * 0.40);
  });

  it("scales with SAM — doubling TAM roughly doubles all three milestones", () => {
    const double = { ...TEST_INPUTS, tam: TEST_INPUTS.tam * 2 };
    const base   = suggestMilestones(TEST_INPUTS);
    const big    = suggestMilestones(double);
    // Allow ±30% around 2× due to rounding increments on different SAM tiers
    expect(big.m12Target / base.m12Target).toBeGreaterThan(1.4);
    expect(big.m12Target / base.m12Target).toBeLessThan(2.6);
    expect(big.m60Target / base.m60Target).toBeGreaterThan(1.4);
    expect(big.m60Target / base.m60Target).toBeLessThan(2.6);
  });

  it("higher attrition produces lower milestones", () => {
    const lowAttrition  = { ...TEST_INPUTS, digitalAttritionYear1: 0.05, digitalAttritionSteadyState: 0.03 };
    const highAttrition = { ...TEST_INPUTS, digitalAttritionYear1: 0.30, digitalAttritionSteadyState: 0.15 };
    const low  = suggestMilestones(lowAttrition);
    const high = suggestMilestones(highAttrition);
    expect(low.m12Target).toBeGreaterThan(high.m12Target);
    expect(low.m60Target).toBeGreaterThan(high.m60Target);
  });

  it("higher reference q (word-of-mouth) produces higher milestones", () => {
    const slow = suggestMilestones(TEST_INPUTS, 0.008, 0.15);
    const fast = suggestMilestones(TEST_INPUTS, 0.008, 0.50);
    expect(fast.m60Target).toBeGreaterThan(slow.m60Target);
  });

  it("results are rounded to a scale-appropriate increment (no odd single-digit remainders)", () => {
    // SAM = 20,000 (> 5,000, ≤ 25,000) → round to 50
    const sam = TEST_INPUTS.tam * (TEST_INPUTS.samPct / 100);
    expect(sam).toBeGreaterThan(5000);
    expect(sam).toBeLessThanOrEqual(25000);
    const { m12Target, m36Target, m60Target } = suggestMilestones(TEST_INPUTS);
    expect(m12Target % 50).toBe(0);
    expect(m36Target % 50).toBe(0);
    expect(m60Target % 50).toBe(0);
  });

  it("does not mutate inputs", () => {
    const before = { ...TEST_INPUTS };
    suggestMilestones(TEST_INPUTS);
    expect(TEST_INPUTS).toEqual(before);
  });
});

// ─── deriveMilestonesForM60Target ────────────────────────────────────────────

describe("deriveMilestonesForM60Target", () => {
  it("returns the exact m60Target passed in, unmodified", () => {
    const result = deriveMilestonesForM60Target(TEST_INPUTS, 30000);
    expect(result.m60Target).toBe(30000);
  });

  it("m12Target and m36Target increase when m60Target increases", () => {
    const low  = deriveMilestonesForM60Target(TEST_INPUTS, 15000);
    const high = deriveMilestonesForM60Target(TEST_INPUTS, 30000);
    expect(high.m12Target).toBeGreaterThan(low.m12Target);
    expect(high.m36Target).toBeGreaterThan(low.m36Target);
  });

  it("m12Target and m36Target scale roughly proportionally with m60Target", () => {
    // Doubling m60Target should roughly double m12/m36 too (same reference shape)
    const base   = deriveMilestonesForM60Target(TEST_INPUTS, 15000);
    const double = deriveMilestonesForM60Target(TEST_INPUTS, 30000);
    expect(double.m12Target / base.m12Target).toBeGreaterThan(1.6);
    expect(double.m12Target / base.m12Target).toBeLessThan(2.4);
    expect(double.m36Target / base.m36Target).toBeGreaterThan(1.6);
    expect(double.m36Target / base.m36Target).toBeLessThan(2.4);
  });

  it("milestones are strictly increasing (m12 < m36 < m60)", () => {
    const { m12Target, m36Target, m60Target } = deriveMilestonesForM60Target(TEST_INPUTS, 20000);
    expect(m12Target).toBeGreaterThan(0);
    expect(m36Target).toBeGreaterThan(m12Target);
    expect(m60Target).toBeGreaterThan(m36Target);
  });

  it("feeding the derived milestones back into calibrateAcquisition produces a monotonic, consistent fit", () => {
    // This is the regression case for the reported bug: bumping m60Target should
    // never cause projectedM12 to move in the opposite direction. Targets stay
    // well within TEST_INPUTS' SAM (20,000) so the optimizer isn't saturated at
    // its p/q bounds for both cases, which would mask a real regression.
    const lowInputs  = { ...TEST_INPUTS, ...deriveMilestonesForM60Target(TEST_INPUTS, 2000) };
    const highInputs = { ...TEST_INPUTS, ...deriveMilestonesForM60Target(TEST_INPUTS, 4000) };
    const low  = calibrateAcquisition(lowInputs);
    const high = calibrateAcquisition(highInputs);
    expect(high.projectedM12).toBeGreaterThan(low.projectedM12);
    expect(high.projectedM36).toBeGreaterThan(low.projectedM36);
    expect(high.projectedM60).toBeGreaterThan(low.projectedM60);
  });

  it("returns zeroed milestones when SAM-derived reference curve produces no adoption", () => {
    const zeroSam = { ...TEST_INPUTS, tam: 0 };
    const result = deriveMilestonesForM60Target(zeroSam, 10000);
    expect(result.m12Target).toBe(0);
    expect(result.m36Target).toBe(0);
    expect(result.m60Target).toBe(10000);
  });

  it("does not mutate inputs", () => {
    const before = { ...TEST_INPUTS };
    deriveMilestonesForM60Target(TEST_INPUTS, 30000);
    expect(TEST_INPUTS).toEqual(before);
  });
});

// ─── runSimulation — blended Scenario B ──────────────────────────────────────

describe("runSimulation — blended footprint (Scenario B)", () => {
  const FOOTPRINT_INPUTS = {
    ...DEFAULT_INPUTS,
    ...DEFAULT_FOOTPRINT_INPUTS,
    tam: 30000,
    samPct: 35,
    m12Target: 100,
    m36Target: 400,
    m60Target: 800,
  };

  let blended;
  let singleB;

  beforeAll(() => {
    blended = runSimulation(INSTITUTION, TEST_INPUTS, "scenario_b", FOOTPRINT_INPUTS);
    singleB = runSimulation(INSTITUTION, TEST_INPUTS, "scenario_b");
  });

  it("returns footprintCalibration when footprintInputs provided", () => {
    expect(blended.footprintCalibration).not.toBeNull();
    expect(blended.footprintCalibration).toHaveProperty("p");
    expect(blended.footprintCalibration).toHaveProperty("q");
    expect(blended.footprintCalibration).toHaveProperty("sam");
  });

  it("blended totalActiveMembers exceeds single-stream Scenario B at month 60", () => {
    expect(blended.months[59].totalActiveMembers).toBeGreaterThan(
      singleB.months[59].totalActiveMembers
    );
  });

  it("exposes per-stream member breakdown on each month", () => {
    const m = blended.months[30];
    expect(m).toHaveProperty("totalActiveMembersExpansion");
    expect(m).toHaveProperty("totalActiveMembersFootprint");
    expect(m.totalActiveMembersExpansion + m.totalActiveMembersFootprint)
      .toBeCloseTo(m.totalActiveMembers, -1);
  });

  it("footprint stream contributes positive members by month 12", () => {
    expect(blended.months[11].totalActiveMembersFootprint).toBeGreaterThan(0);
  });

  it("cannibalization is applied once (not doubled vs single-stream Scenario B)", () => {
    // Cannibalization is institution-level and should be identical between single and blended
    expect(blended.months[0].monthlyCannibalizationCost).toBeCloseTo(
      singleB.months[0].monthlyCannibalizationCost, 0
    );
  });

  it("footprintSamPenetrationPct is between 0 and 1", () => {
    blended.months.forEach((m) => {
      expect(m.footprintSamPenetrationPct).toBeGreaterThanOrEqual(0);
      expect(m.footprintSamPenetrationPct).toBeLessThanOrEqual(1);
    });
  });

  it("footprint stream with CPA=0 contributes zero acquisition spend to totals", () => {
    // Verify the no-marketing path at the model layer, not just the UI memo.
    const zeroCpaFootprint = { ...FOOTPRINT_INPUTS, initialCPA: 0, steadyStateCPA: 0 };
    const noMarketing = runSimulation(INSTITUTION, TEST_INPUTS, "scenario_b", zeroCpaFootprint);
    // Expansion-only spend = runSimulation with no footprint
    const expansionOnly = runSimulation(INSTITUTION, TEST_INPUTS, "scenario_b");
    // Each month's acquisition spend in the blended run should equal the expansion-only spend
    for (let i = 0; i < 60; i++) {
      expect(noMarketing.months[i].monthlyAcquisitionSpend).toBe(
        expansionOnly.months[i].monthlyAcquisitionSpend
      );
    }
  });

  it("footprint stream with CPA>0 increases total acquisition spend vs CPA=0", () => {
    const withMarketing    = runSimulation(INSTITUTION, TEST_INPUTS, "scenario_b", {
      ...FOOTPRINT_INPUTS, initialCPA: 75, steadyStateCPA: 20,
    });
    const withoutMarketing = runSimulation(INSTITUTION, TEST_INPUTS, "scenario_b", {
      ...FOOTPRINT_INPUTS, initialCPA: 0, steadyStateCPA: 0,
    });
    const spendWith    = withMarketing.months.reduce((s, m) => s + m.monthlyAcquisitionSpend, 0);
    const spendWithout = withoutMarketing.months.reduce((s, m) => s + m.monthlyAcquisitionSpend, 0);
    expect(spendWith).toBeGreaterThan(spendWithout);
  });

  it("totalActiveMembers equals sum of both streams for all 60 months", () => {
    // Math.round() on each stream independently can introduce ±1 — allow that tolerance.
    blended.months.forEach((m) => {
      const reconstructed = m.totalActiveMembersExpansion + m.totalActiveMembersFootprint;
      expect(Math.abs(m.totalActiveMembers - reconstructed)).toBeLessThanOrEqual(1);
    });
  });

  it("blended months have the same required shape as single-stream months", () => {
    const REQUIRED_KEYS = [
      "month", "newMembersGross", "newMembersActive", "totalActiveMembers",
      "cpa", "monthlyAcquisitionSpend", "cumulativeAcquisitionSpend",
      "samPenetrationPct", "monthlyRatePremiumCost", "monthlyCannibalizationCost",
      "depositCannibalizationCost", "loanCannibalizationCost",
      "monthlyServicingCostSavings", "monthlyGrossNII",
      "monthlyNetContribution", "cumulativeNetContribution",
      "cumulativeCannibalDrag", "isBreakEvenMonth",
    ];
    blended.months.forEach((m) => {
      REQUIRED_KEYS.forEach((key) => {
        expect(m).toHaveProperty(key);
      });
    });
  });
});
