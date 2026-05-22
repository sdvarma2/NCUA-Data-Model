import {
  DEFAULT_INPUTS,
  MARKET_COMPETITIVENESS_PRESETS,
  calibrateAcquisition,
  computeCPA,
  computeServicingDelta,
  computeRatePremiumCost,
  computeCannibalCost,
  computeNIIContribution,
  findBreakEven,
  runSimulation,
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
    expect(DEFAULT_INPUTS.m12Target).toBe(3000);
    expect(DEFAULT_INPUTS.m36Target).toBe(12000);
    expect(DEFAULT_INPUTS.m60Target).toBe(22000);
    expect(DEFAULT_INPUTS.initialCPA).toBe(450);
    expect(DEFAULT_INPUTS.steadyStateCPA).toBe(75);
    expect(DEFAULT_INPUTS.monthsToSteadyState).toBe(24);
  });

  it("has expected deposit defaults", () => {
    expect(DEFAULT_INPUTS.avgDepositBalance).toBe(18000);
    expect(DEFAULT_INPUTS.rateBump).toBe(50);
    expect(DEFAULT_INPUTS.ratePremiumDecay).toBe(10);
  });

  it("has expected loan defaults", () => {
    expect(DEFAULT_INPUTS.loanPenetrationRate).toBe(0.40);
    expect(DEFAULT_INPUTS.avgLoanBalance).toBe(22000);
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

  it("Medium preset matches DEFAULT_INPUTS CPA economics", () => {
    const med = MARKET_COMPETITIVENESS_PRESETS.Medium;
    expect(med.initialCPA).toBe(DEFAULT_INPUTS.initialCPA);
    expect(med.steadyStateCPA).toBe(DEFAULT_INPUTS.steadyStateCPA);
    expect(med.monthsToSteadyState).toBe(DEFAULT_INPUTS.monthsToSteadyState);
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

// ─── computeCPA ──────────────────────────────────────────────────────────────

describe("computeCPA", () => {
  it("at month 1 (well before inflection), CPA is close to initialCPA", () => {
    const cpa = computeCPA(1, DEFAULT_INPUTS);
    // At month 1 with t_mid=12, CPA should be very close to initialCPA
    expect(cpa).toBeGreaterThan(DEFAULT_INPUTS.steadyStateCPA);
    expect(cpa).toBeLessThanOrEqual(DEFAULT_INPUTS.initialCPA);
    expect(cpa).toBeGreaterThan(DEFAULT_INPUTS.initialCPA * 0.9);
  });

  it("at monthsToSteadyState (inflection+half), CPA is close to steadyStateCPA", () => {
    const cpa = computeCPA(DEFAULT_INPUTS.monthsToSteadyState, DEFAULT_INPUTS);
    expect(cpa).toBeLessThan(DEFAULT_INPUTS.initialCPA * 0.5);
    expect(cpa).toBeGreaterThan(DEFAULT_INPUTS.steadyStateCPA);
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
    // 100 members: deposit = 18000 × 0.005 / 12 = 7.5, loan = 22000 × 0.4 × 0.0025 / 12 ≈ 1.833
    const cost = computeRatePremiumCost(100, DEFAULT_INPUTS, 1);
    expect(cost).toBeCloseTo(100 * (7.5 + 1.8333), 0);
  });

  it("reduces effective rate bump over time due to decay", () => {
    const early = computeRatePremiumCost(100, DEFAULT_INPUTS, 1);
    const later = computeRatePremiumCost(100, DEFAULT_INPUTS, 25);
    expect(later).toBeLessThan(early);
  });

  it("effective bump never goes below zero", () => {
    const cost = computeRatePremiumCost(100, DEFAULT_INPUTS, 100);
    expect(cost).toBeGreaterThanOrEqual(0);
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
});
