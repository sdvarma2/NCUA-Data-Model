import { DEFAULT_INPUTS } from "@/lib/model";
import { resolveInputs, LEVER_PRESETS, LEVER_DEFAULTS } from "@/lib/levers";

// ─── LEVER_PRESETS shape ─────────────────────────────────────────────────────

describe("LEVER_PRESETS", () => {
  it("defines presets for acquisitionAggression, rateCompetitiveness, and memberProfile", () => {
    expect(LEVER_PRESETS).toHaveProperty("acquisitionAggression");
    expect(LEVER_PRESETS).toHaveProperty("rateCompetitiveness");
    expect(LEVER_PRESETS).toHaveProperty("memberProfile");
  });

  it("does not include marketOpportunity (TAM handled via Advanced Settings field)", () => {
    expect(LEVER_PRESETS).not.toHaveProperty("marketOpportunity");
  });

  it("each lever has exactly three positions", () => {
    for (const presets of Object.values(LEVER_PRESETS)) {
      expect(Object.keys(presets)).toHaveLength(3);
    }
  });

  // ─── acquisitionAggression ──────────────────────────────────────────────────

  describe("acquisitionAggression", () => {
    it("has Conservative / Moderate / Aggressive positions", () => {
      expect(LEVER_PRESETS.acquisitionAggression).toHaveProperty("Conservative");
      expect(LEVER_PRESETS.acquisitionAggression).toHaveProperty("Moderate");
      expect(LEVER_PRESETS.acquisitionAggression).toHaveProperty("Aggressive");
    });

    it("each position specifies initialCPA, steadyStateCPA, monthsToSteadyState", () => {
      for (const preset of Object.values(LEVER_PRESETS.acquisitionAggression)) {
        expect(preset).toHaveProperty("initialCPA");
        expect(preset).toHaveProperty("steadyStateCPA");
        expect(preset).toHaveProperty("monthsToSteadyState");
      }
    });

    it("Conservative is a flat-CPA strategy — initialCPA equals steadyStateCPA", () => {
      const c = LEVER_PRESETS.acquisitionAggression.Conservative;
      expect(c.initialCPA).toBe(c.steadyStateCPA);
    });

    it("Aggressive has a higher initialCPA than Conservative (heavier up-front spend)", () => {
      expect(LEVER_PRESETS.acquisitionAggression.Aggressive.initialCPA).toBeGreaterThan(
        LEVER_PRESETS.acquisitionAggression.Conservative.initialCPA
      );
    });

    it("Aggressive has a lower steadyStateCPA than Conservative (stronger network effects at scale)", () => {
      expect(LEVER_PRESETS.acquisitionAggression.Aggressive.steadyStateCPA).toBeLessThan(
        LEVER_PRESETS.acquisitionAggression.Conservative.steadyStateCPA
      );
    });

    it("correct calibrated values", () => {
      const { Conservative, Moderate, Aggressive } = LEVER_PRESETS.acquisitionAggression;
      expect(Conservative).toEqual({ initialCPA: 250, steadyStateCPA: 250, monthsToSteadyState: 60 });
      expect(Moderate).toEqual({     initialCPA: 450, steadyStateCPA: 225, monthsToSteadyState: 60 });
      expect(Aggressive).toEqual({   initialCPA: 800, steadyStateCPA: 200, monthsToSteadyState: 54 });
    });
  });

  // ─── rateCompetitiveness ────────────────────────────────────────────────────

  describe("rateCompetitiveness", () => {
    it("has Conservative / Moderate / Aggressive positions", () => {
      expect(LEVER_PRESETS.rateCompetitiveness).toHaveProperty("Conservative");
      expect(LEVER_PRESETS.rateCompetitiveness).toHaveProperty("Moderate");
      expect(LEVER_PRESETS.rateCompetitiveness).toHaveProperty("Aggressive");
    });

    it("each position specifies rateBump, ratePremiumDecay, rateBumpFloor, and rateCut", () => {
      for (const preset of Object.values(LEVER_PRESETS.rateCompetitiveness)) {
        expect(preset).toHaveProperty("rateBump");
        expect(preset).toHaveProperty("ratePremiumDecay");
        expect(preset).toHaveProperty("rateBumpFloor");
        expect(preset).toHaveProperty("rateCut");
      }
    });

    it("Conservative is a flat-rate strategy — ratePremiumDecay is 0", () => {
      expect(LEVER_PRESETS.rateCompetitiveness.Conservative.ratePremiumDecay).toBe(0);
    });

    it("Conservative rateBump equals rateBumpFloor (premium locked in permanently)", () => {
      const c = LEVER_PRESETS.rateCompetitiveness.Conservative;
      expect(c.rateBump).toBe(c.rateBumpFloor);
    });

    it("Aggressive has a higher rateBump than Conservative", () => {
      expect(LEVER_PRESETS.rateCompetitiveness.Aggressive.rateBump).toBeGreaterThan(
        LEVER_PRESETS.rateCompetitiveness.Conservative.rateBump
      );
    });

    it("Aggressive has a higher rateCut than Conservative (more competitive loan pricing)", () => {
      expect(LEVER_PRESETS.rateCompetitiveness.Aggressive.rateCut).toBeGreaterThan(
        LEVER_PRESETS.rateCompetitiveness.Conservative.rateCut
      );
    });

    it("correct calibrated values", () => {
      const { Conservative, Moderate, Aggressive } = LEVER_PRESETS.rateCompetitiveness;
      expect(Conservative).toEqual({ rateBump: 25,  ratePremiumDecay: 0,  rateBumpFloor: 25, rateCut: 10 });
      expect(Moderate).toEqual({     rateBump: 50,  ratePremiumDecay: 10, rateBumpFloor: 10, rateCut: 25 });
      expect(Aggressive).toEqual({   rateBump: 100, ratePremiumDecay: 5,  rateBumpFloor: 25, rateCut: 50 });
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
  it("defaults rateCompetitiveness to Moderate", () => {
    expect(LEVER_DEFAULTS.rateCompetitiveness).toBe("Moderate");
  });

  it("defaults memberProfile to Balanced", () => {
    expect(LEVER_DEFAULTS.memberProfile).toBe("Balanced");
  });

  it("does not include acquisitionAggression (wired directly in page.jsx, not via LEVER_DEFAULTS)", () => {
    expect(LEVER_DEFAULTS).not.toHaveProperty("acquisitionAggression");
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

  it("non-lever inputs are preserved unchanged", () => {
    const inputs = resolveInputs({});
    expect(inputs.maintenanceDigital).toBe(DEFAULT_INPUTS.maintenanceDigital);
    expect(inputs.fraudCost).toBe(DEFAULT_INPUTS.fraudCost);
    expect(inputs.digitalAttritionYear1).toBe(DEFAULT_INPUTS.digitalAttritionYear1);
  });

  it("does not mutate DEFAULT_INPUTS", () => {
    const before = { ...DEFAULT_INPUTS };
    resolveInputs({ rateCompetitiveness: "Aggressive", memberProfile: "Upmarket" });
    expect(DEFAULT_INPUTS).toEqual(before);
  });

  it("returns a new object distinct from DEFAULT_INPUTS", () => {
    const inputs = resolveInputs({});
    expect(inputs).not.toBe(DEFAULT_INPUTS);
  });
});
