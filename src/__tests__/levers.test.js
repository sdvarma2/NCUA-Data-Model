import { DEFAULT_INPUTS } from "@/lib/model";
import { resolveInputs, LEVER_PRESETS, LEVER_DEFAULTS } from "@/lib/levers";

// ─── LEVER_PRESETS shape ─────────────────────────────────────────────────────

describe("LEVER_PRESETS", () => {
  it("defines presets for rateIncentives and memberProfile", () => {
    expect(LEVER_PRESETS).toHaveProperty("rateIncentives");
    expect(LEVER_PRESETS).toHaveProperty("memberProfile");
  });

  it("does not include acquisitionCostProfile (consolidated into Market Competitiveness, driven by MARKET_COMPETITIVENESS_PRESETS in model.js)", () => {
    expect(LEVER_PRESETS).not.toHaveProperty("acquisitionCostProfile");
  });

  it("does not include marketOpportunity (TAM handled via Advanced Settings field)", () => {
    expect(LEVER_PRESETS).not.toHaveProperty("marketOpportunity");
  });

  it("each lever has exactly three positions", () => {
    for (const presets of Object.values(LEVER_PRESETS)) {
      expect(Object.keys(presets)).toHaveLength(3);
    }
  });

  // ─── rateIncentives ─────────────────────────────────────────────────────────

  describe("rateIncentives", () => {
    it("has Conservative / Moderate / Aggressive positions", () => {
      expect(LEVER_PRESETS.rateIncentives).toHaveProperty("Conservative");
      expect(LEVER_PRESETS.rateIncentives).toHaveProperty("Moderate");
      expect(LEVER_PRESETS.rateIncentives).toHaveProperty("Aggressive");
    });

    it("each position specifies rateBump, ratePremiumDecay, rateBumpFloor, and rateCut", () => {
      for (const preset of Object.values(LEVER_PRESETS.rateIncentives)) {
        expect(preset).toHaveProperty("rateBump");
        expect(preset).toHaveProperty("ratePremiumDecay");
        expect(preset).toHaveProperty("rateBumpFloor");
        expect(preset).toHaveProperty("rateCut");
      }
    });

    it("each position specifies qMultiplier and attritionMultiplier, but no pMultiplier", () => {
      for (const preset of Object.values(LEVER_PRESETS.rateIncentives)) {
        expect(preset).toHaveProperty("qMultiplier");
        expect(preset).toHaveProperty("attritionMultiplier");
        expect(preset).not.toHaveProperty("pMultiplier");
      }
    });

    it("Conservative is a flat-rate strategy — ratePremiumDecay is 0", () => {
      expect(LEVER_PRESETS.rateIncentives.Conservative.ratePremiumDecay).toBe(0);
    });

    it("Conservative rateBump equals rateBumpFloor (premium locked in permanently)", () => {
      const c = LEVER_PRESETS.rateIncentives.Conservative;
      expect(c.rateBump).toBe(c.rateBumpFloor);
    });

    it("Aggressive has a higher rateBump than Conservative", () => {
      expect(LEVER_PRESETS.rateIncentives.Aggressive.rateBump).toBeGreaterThan(
        LEVER_PRESETS.rateIncentives.Conservative.rateBump
      );
    });

    it("Aggressive has a higher rateCut than Conservative (more competitive loan pricing)", () => {
      expect(LEVER_PRESETS.rateIncentives.Aggressive.rateCut).toBeGreaterThan(
        LEVER_PRESETS.rateIncentives.Conservative.rateCut
      );
    });

    it("correct rate values", () => {
      const { Conservative, Moderate, Aggressive } = LEVER_PRESETS.rateIncentives;
      expect(Conservative).toMatchObject({ rateBump: 25,  ratePremiumDecay: 0,  rateBumpFloor: 25, rateCut: 10 });
      expect(Moderate).toMatchObject({     rateBump: 50,  ratePremiumDecay: 10, rateBumpFloor: 10, rateCut: 25 });
      expect(Aggressive).toMatchObject({   rateBump: 100, ratePremiumDecay: 5,  rateBumpFloor: 25, rateCut: 50 });
    });

    it("Conservative has qMultiplier < 1 (slower word-of-mouth)", () => {
      expect(LEVER_PRESETS.rateIncentives.Conservative.qMultiplier).toBeLessThan(1);
    });

    it("Conservative has attritionMultiplier < 1 (relationship members churn less)", () => {
      expect(LEVER_PRESETS.rateIncentives.Conservative.attritionMultiplier).toBeLessThan(1);
    });

    it("Moderate multipliers are all exactly 1.0 (baseline — no adjustment)", () => {
      const m = LEVER_PRESETS.rateIncentives.Moderate;
      expect(m.qMultiplier).toBe(1.0);
      expect(m.attritionMultiplier).toBe(1.0);
    });

    it("Aggressive has qMultiplier > 1 (stronger word-of-mouth from high rates)", () => {
      expect(LEVER_PRESETS.rateIncentives.Aggressive.qMultiplier).toBeGreaterThan(1);
    });

    it("Aggressive has attritionMultiplier > 1 (hot money members churn more)", () => {
      expect(LEVER_PRESETS.rateIncentives.Aggressive.attritionMultiplier).toBeGreaterThan(1);
    });
  });

  // ─── memberProfile ──────────────────────────────────────────────────────────

  describe("memberProfile", () => {
    it("has Mass Market / Balanced / Upmarket positions", () => {
      expect(LEVER_PRESETS.memberProfile).toHaveProperty("Mass Market");
      expect(LEVER_PRESETS.memberProfile).toHaveProperty("Balanced");
      expect(LEVER_PRESETS.memberProfile).toHaveProperty("Upmarket");
    });

    it("each position specifies all six economic fields including samPct", () => {
      for (const preset of Object.values(LEVER_PRESETS.memberProfile)) {
        expect(preset).toHaveProperty("samPct");
        expect(preset).toHaveProperty("avgDepositBalance");
        expect(preset).toHaveProperty("loanPenetrationRate");
        expect(preset).toHaveProperty("avgLoanBalance");
        expect(preset).toHaveProperty("digitalAttritionYear1");
        expect(preset).toHaveProperty("digitalAttritionSteadyState");
      }
    });

    it("Upmarket has a lower samPct than Mass Market (smaller addressable slice of TAM)", () => {
      expect(LEVER_PRESETS.memberProfile.Upmarket.samPct).toBeLessThan(
        LEVER_PRESETS.memberProfile["Mass Market"].samPct
      );
    });

    it("Upmarket has higher avgDepositBalance than Mass Market", () => {
      expect(LEVER_PRESETS.memberProfile.Upmarket.avgDepositBalance).toBeGreaterThan(
        LEVER_PRESETS.memberProfile["Mass Market"].avgDepositBalance
      );
    });

    it("Upmarket has higher loanPenetrationRate than Mass Market", () => {
      expect(LEVER_PRESETS.memberProfile.Upmarket.loanPenetrationRate).toBeGreaterThan(
        LEVER_PRESETS.memberProfile["Mass Market"].loanPenetrationRate
      );
    });

    it("Upmarket has lower Year 1 attrition than Mass Market (stickier relationship banking)", () => {
      expect(LEVER_PRESETS.memberProfile.Upmarket.digitalAttritionYear1).toBeLessThan(
        LEVER_PRESETS.memberProfile["Mass Market"].digitalAttritionYear1
      );
    });

    it("loanPenetrationRate ceiling is 0.20 (SoFi benchmark) — Upmarket does not exceed it", () => {
      expect(LEVER_PRESETS.memberProfile.Upmarket.loanPenetrationRate).toBeLessThanOrEqual(0.20);
    });
  });
});

// ─── LEVER_DEFAULTS ──────────────────────────────────────────────────────────

describe("LEVER_DEFAULTS", () => {
  it("defaults rateIncentives to Moderate", () => {
    expect(LEVER_DEFAULTS.rateIncentives).toBe("Moderate");
  });

  it("defaults memberProfile to Balanced", () => {
    expect(LEVER_DEFAULTS.memberProfile).toBe("Balanced");
  });

  it("does not include marketOpportunity", () => {
    expect(LEVER_DEFAULTS).not.toHaveProperty("marketOpportunity");
  });
});

// ─── resolveInputs ───────────────────────────────────────────────────────────

describe("resolveInputs", () => {
  it("returns an object with all DEFAULT_INPUTS keys present", () => {
    const inputs = resolveInputs({});
    for (const key of Object.keys(DEFAULT_INPUTS)) {
      expect(inputs).toHaveProperty(key);
    }
  });

  it("includes new acquisition keys (tam, samPct, m12Target, m36Target, m60Target)", () => {
    const inputs = resolveInputs({});
    expect(inputs).toHaveProperty("tam");
    expect(inputs).toHaveProperty("samPct");
    expect(inputs).toHaveProperty("m12Target");
    expect(inputs).toHaveProperty("m36Target");
    expect(inputs).toHaveProperty("m60Target");
  });

  it("includes CPA economics keys (initialCPA, steadyStateCPA, monthsToSteadyState)", () => {
    const inputs = resolveInputs({});
    expect(inputs).toHaveProperty("initialCPA");
    expect(inputs).toHaveProperty("steadyStateCPA");
    expect(inputs).toHaveProperty("monthsToSteadyState");
  });

  it("includes Bass multiplier keys (qMultiplier, attritionMultiplier), but no pMultiplier", () => {
    const inputs = resolveInputs({});
    expect(inputs).toHaveProperty("qMultiplier");
    expect(inputs).toHaveProperty("attritionMultiplier");
    expect(inputs).not.toHaveProperty("pMultiplier");
  });

  it("non-lever inputs are preserved unchanged", () => {
    const inputs = resolveInputs({});
    expect(inputs.maintenanceDigital).toBe(DEFAULT_INPUTS.maintenanceDigital);
    expect(inputs.fraudCost).toBe(DEFAULT_INPUTS.fraudCost);
    expect(inputs.digitalAttritionYear1).toBe(DEFAULT_INPUTS.digitalAttritionYear1);
  });

  it("does not mutate DEFAULT_INPUTS", () => {
    const before = { ...DEFAULT_INPUTS };
    resolveInputs({ rateIncentives: "Aggressive", memberProfile: "Upmarket" });
    expect(DEFAULT_INPUTS).toEqual(before);
  });

  it("returns a new object distinct from DEFAULT_INPUTS", () => {
    const inputs = resolveInputs({});
    expect(inputs).not.toBe(DEFAULT_INPUTS);
  });
});
