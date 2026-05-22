import { DEFAULT_INPUTS } from "@/lib/model";
import { resolveInputs, LEVER_PRESETS, LEVER_DEFAULTS } from "@/lib/levers";

// ─── LEVER_PRESETS shape ─────────────────────────────────────────────────────

describe("LEVER_PRESETS", () => {
  it("defines presets for rateCompetitiveness and memberProfile", () => {
    expect(LEVER_PRESETS).toHaveProperty("rateCompetitiveness");
    expect(LEVER_PRESETS).toHaveProperty("memberProfile");
  });

  it("does not include acquisitionAggression (replaced by Bass model inputs)", () => {
    expect(LEVER_PRESETS).not.toHaveProperty("acquisitionAggression");
  });

  it("does not include marketOpportunity (replaced by TAM/SAM in Advanced Settings)", () => {
    expect(LEVER_PRESETS).not.toHaveProperty("marketOpportunity");
  });

  it("each lever has exactly three positions", () => {
    for (const presets of Object.values(LEVER_PRESETS)) {
      expect(Object.keys(presets)).toHaveLength(3);
    }
  });

  it("rateCompetitiveness positions are Conservative / Moderate / Aggressive", () => {
    expect(LEVER_PRESETS.rateCompetitiveness).toHaveProperty("Conservative");
    expect(LEVER_PRESETS.rateCompetitiveness).toHaveProperty("Moderate");
    expect(LEVER_PRESETS.rateCompetitiveness).toHaveProperty("Aggressive");
  });

  it("memberProfile positions are Mass Market / Balanced / Upmarket", () => {
    expect(LEVER_PRESETS.memberProfile).toHaveProperty("Mass Market");
    expect(LEVER_PRESETS.memberProfile).toHaveProperty("Balanced");
    expect(LEVER_PRESETS.memberProfile).toHaveProperty("Upmarket");
  });

  it("Aggressive rate has higher rateBump than Conservative", () => {
    const aggressive  = LEVER_PRESETS.rateCompetitiveness.Aggressive;
    const conservative = LEVER_PRESETS.rateCompetitiveness.Conservative;
    expect(aggressive.rateBump).toBeGreaterThan(conservative.rateBump);
  });

  it("Upmarket member profile has higher avgDepositBalance than Mass Market", () => {
    const upmarket  = LEVER_PRESETS.memberProfile.Upmarket;
    const massMarket = LEVER_PRESETS.memberProfile["Mass Market"];
    expect(upmarket.avgDepositBalance).toBeGreaterThan(massMarket.avgDepositBalance);
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

  it("does not include acquisitionAggression", () => {
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

  it("includes new CPA economics keys (initialCPA, steadyStateCPA, monthsToSteadyState)", () => {
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
