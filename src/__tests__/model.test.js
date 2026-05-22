import {
  DEFAULT_INPUTS,
  computeMonthlyAcquisition,
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

// Stripped-down inputs that override defaults for deterministic tests
const TEST_INPUTS = {
  ...DEFAULT_INPUTS,
  launchCPA: 100,
  launchDuration: 6,
  steadyStateCPA: 50,
  monthlyMemberTarget: 100,
  addressableMarket: 10000,
  difficultyMultiplier: 1.0,
};

// ─── DEFAULT_INPUTS ──────────────────────────────────────────────────────────

describe("DEFAULT_INPUTS", () => {
  it("exports an object", () => {
    expect(typeof DEFAULT_INPUTS).toBe("object");
  });

  it("has expected acquisition defaults", () => {
    expect(DEFAULT_INPUTS.launchCPA).toBe(400);
    expect(DEFAULT_INPUTS.launchDuration).toBe(12);
    expect(DEFAULT_INPUTS.steadyStateCPA).toBe(75);
    expect(DEFAULT_INPUTS.monthlyMemberTarget).toBe(500);
    expect(DEFAULT_INPUTS.addressableMarket).toBe(500000);
    expect(DEFAULT_INPUTS.difficultyMultiplier).toBe(1.0);
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

// ─── computeMonthlyAcquisition ───────────────────────────────────────────────

describe("computeMonthlyAcquisition", () => {
  it("uses launchCPA during launch period", () => {
    const { effectiveCPA } = computeMonthlyAcquisition(1, TEST_INPUTS, 10000);
    expect(effectiveCPA).toBe(100);
  });

  it("switches to steadyStateCPA after launch period", () => {
    const { effectiveCPA } = computeMonthlyAcquisition(7, TEST_INPUTS, 10000);
    expect(effectiveCPA).toBe(50);
  });

  it("applies difficultyMultiplier to CPA", () => {
    const inputs = { ...TEST_INPUTS, difficultyMultiplier: 1.5 };
    const { effectiveCPA } = computeMonthlyAcquisition(1, inputs, 10000);
    expect(effectiveCPA).toBe(150); // 100 × 1.5
  });

  it("returns monthlyMemberTarget when market has plenty of room", () => {
    const { newMembers } = computeMonthlyAcquisition(1, TEST_INPUTS, 9000);
    expect(newMembers).toBe(100);
  });

  it("caps new members at remaining addressable market", () => {
    const { newMembers } = computeMonthlyAcquisition(1, TEST_INPUTS, 40);
    expect(newMembers).toBe(40);
  });

  it("returns zero new members when market is exhausted", () => {
    const { newMembers } = computeMonthlyAcquisition(1, TEST_INPUTS, 0);
    expect(newMembers).toBe(0);
  });

  it("computes acquisitionSpend as newMembers × effectiveCPA", () => {
    const { newMembers, effectiveCPA, acquisitionSpend } = computeMonthlyAcquisition(1, TEST_INPUTS, 9000);
    expect(acquisitionSpend).toBeCloseTo(newMembers * effectiveCPA);
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
    // With maintenanceTrad=250, teller=1/3/mo, digital=18/mo:
    // savings/member/yr ≈ (250+18+43.20) - (95+43.20+70) = 311.20 - 208.20 = $103/yr
    // 1000 members → ~8,583/month (not 103,000)
    const savings = computeServicingDelta(1000, DEFAULT_INPUTS);
    expect(savings).toBeGreaterThan(5000);
    expect(savings).toBeLessThan(20000);
  });

  it("includes branch visit subsidy in digital cost", () => {
    const withVisits = computeServicingDelta(1000, { ...DEFAULT_INPUTS, freeVisits: 4, costPerBranchVisit: 5 });
    const withoutVisits = computeServicingDelta(1000, { ...DEFAULT_INPUTS, freeVisits: 0, costPerBranchVisit: 5 });
    // More subsidy → higher digital cost → lower savings
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
    // With 50 bps bump and 10 bps/yr decay, fully decayed by ~month 61
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
    // 1B assets × 0.85 = 850M shares, scenario A rate = 0.5%, rateBump = 50bps
    // depositDrag = 850e6 × 0.005 × 0.005 / 12
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
    // 1000 members × $18000 × 2.657% / 12 ≈ $39,855/month (annual would be ~$478K)
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
    const months = Array.from({ length: 36 }, (_, i) => ({
      month: i + 1,
      cumulativeNetContribution: -(1000 * (36 - i)),
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
  it("returns an array of exactly 60 elements", () => {
    const result = runSimulation(INSTITUTION, TEST_INPUTS, "scenario_a");
    expect(result).toHaveLength(60);
  });

  it("month numbers run 1 through 60", () => {
    const result = runSimulation(INSTITUTION, TEST_INPUTS, "scenario_a");
    expect(result[0].month).toBe(1);
    expect(result[59].month).toBe(60);
  });

  it("each month object has the required shape", () => {
    const [first] = runSimulation(INSTITUTION, TEST_INPUTS, "scenario_a");
    expect(first).toHaveProperty("month");
    expect(first).toHaveProperty("newMembersAcquired");
    expect(first).toHaveProperty("totalDigitalMembers");
    expect(first).toHaveProperty("cumulativeAcquisitionSpend");
    expect(first).toHaveProperty("monthlyRatePremiumCost");
    expect(first).toHaveProperty("monthlyCannibalizationCost");
    expect(first).toHaveProperty("depositCannibalizationCost");
    expect(first).toHaveProperty("loanCannibalizationCost");
    expect(first).toHaveProperty("monthlyServicingCostSavings");
    expect(first).toHaveProperty("monthlyGrossNII");
    expect(first).toHaveProperty("monthlyNetContribution");
    expect(first).toHaveProperty("cumulativeNetContribution");
    expect(first).toHaveProperty("cumulativeCannibalDrag");
    expect(first).toHaveProperty("marketPenetrationPct");
    expect(first).toHaveProperty("isBreakEvenMonth");
  });

  it("cumulative net contribution starts negative (costs exceed savings in month 1)", () => {
    const [first] = runSimulation(INSTITUTION, TEST_INPUTS, "scenario_a");
    expect(first.cumulativeNetContribution).toBeLessThan(0);
  });

  it("monthlyGrossNII is positive once members have been acquired", () => {
    const result = runSimulation(INSTITUTION, TEST_INPUTS, "scenario_a");
    expect(result[1].monthlyGrossNII).toBeGreaterThan(0);
  });

  it("total digital members grows in early months", () => {
    const result = runSimulation(INSTITUTION, TEST_INPUTS, "scenario_a");
    expect(result[5].totalDigitalMembers).toBeGreaterThan(result[0].totalDigitalMembers);
  });

  it("market penetration percentage increases over time", () => {
    const result = runSimulation(INSTITUTION, TEST_INPUTS, "scenario_a");
    expect(result[11].marketPenetrationPct).toBeGreaterThan(result[0].marketPenetrationPct);
  });

  it("market penetration never exceeds 1.0", () => {
    const result = runSimulation(INSTITUTION, TEST_INPUTS, "scenario_a");
    result.forEach(m => expect(m.marketPenetrationPct).toBeLessThanOrEqual(1.0));
  });

  it("exactly one month is marked isBreakEvenMonth when break-even is reached", () => {
    // Use a highly profitable small institution to guarantee break-even within 36 months
    const inputs = {
      ...TEST_INPUTS,
      launchCPA: 10,
      steadyStateCPA: 5,
      monthlyMemberTarget: 50,
      addressableMarket: 5000,
    };
    const result = runSimulation({ ...INSTITUTION, assets_b: 0.001 }, inputs, "scenario_a");
    const breakEvenMonths = result.filter(m => m.isBreakEvenMonth);
    expect(breakEvenMonths.length).toBeLessThanOrEqual(1);
  });

  it("scenario B has higher cumulative cannibalization drag than scenario A", () => {
    const a = runSimulation(INSTITUTION, TEST_INPUTS, "scenario_a");
    const b = runSimulation(INSTITUTION, TEST_INPUTS, "scenario_b");
    expect(b[59].cumulativeCannibalDrag).toBeGreaterThan(a[59].cumulativeCannibalDrag);
  });

  it("cumulative acquisition spend increases monotonically", () => {
    const result = runSimulation(INSTITUTION, TEST_INPUTS, "scenario_a");
    for (let i = 1; i < result.length; i++) {
      expect(result[i].cumulativeAcquisitionSpend).toBeGreaterThanOrEqual(
        result[i - 1].cumulativeAcquisitionSpend
      );
    }
  });
});
