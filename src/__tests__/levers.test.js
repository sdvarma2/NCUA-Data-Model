import { DEFAULT_INPUTS } from "@/lib/model";
import { resolveInputs, LEVER_PRESETS, LEVER_DEFAULTS } from "@/lib/levers";

// ─── LEVER_PRESETS shape ─────────────────────────────────────────────────────

describe("LEVER_PRESETS", () => {
  it("defines presets for all four levers", () => {
    expect(LEVER_PRESETS).toHaveProperty("acquisitionAggression");
    expect(LEVER_PRESETS).toHaveProperty("rateCompetitiveness");
    expect(LEVER_PRESETS).toHaveProperty("memberProfile");
    expect(LEVER_PRESETS).toHaveProperty("marketOpportunity");
  });

  it("each lever has exactly three positions", () => {
    for (const presets of Object.values(LEVER_PRESETS)) {
      expect(Object.keys(presets)).toHaveLength(3);
    }
  });

  it("acquisitionAggression positions are Conservative / Moderate / Aggressive", () => {
    expect(LEVER_PRESETS.acquisitionAggression).toHaveProperty("Conservative");
    expect(LEVER_PRESETS.acquisitionAggression).toHaveProperty("Moderate");
    expect(LEVER_PRESETS.acquisitionAggression).toHaveProperty("Aggressive");
  });

  it("memberProfile positions are Mass Market / Balanced / Upmarket", () => {
    expect(LEVER_PRESETS.memberProfile).toHaveProperty("Mass Market");
    expect(LEVER_PRESETS.memberProfile).toHaveProperty("Balanced");
    expect(LEVER_PRESETS.memberProfile).toHaveProperty("Upmarket");
  });

  it("marketOpportunity positions are Single Metro / Multi-Metro / Multi-State", () => {
    expect(LEVER_PRESETS.marketOpportunity).toHaveProperty("Single Metro");
    expect(LEVER_PRESETS.marketOpportunity).toHaveProperty("Multi-Metro");
    expect(LEVER_PRESETS.marketOpportunity).toHaveProperty("Multi-State");
  });

  it("Aggressive acquisition has higher monthlyMemberTarget than Conservative", () => {
    const aggressive = LEVER_PRESETS.acquisitionAggression.Aggressive;
    const conservative = LEVER_PRESETS.acquisitionAggression.Conservative;
    expect(aggressive.monthlyMemberTarget).toBeGreaterThan(conservative.monthlyMemberTarget);
  });

  it("Aggressive rate has higher rateBump than Conservative", () => {
    const aggressive = LEVER_PRESETS.rateCompetitiveness.Aggressive;
    const conservative = LEVER_PRESETS.rateCompetitiveness.Conservative;
    expect(aggressive.rateBump).toBeGreaterThan(conservative.rateBump);
  });

  it("Upmarket member profile has higher avgDepositBalance than Mass Market", () => {
    const upmarket = LEVER_PRESETS.memberProfile.Upmarket;
    const massMarket = LEVER_PRESETS.memberProfile["Mass Market"];
    expect(upmarket.avgDepositBalance).toBeGreaterThan(massMarket.avgDepositBalance);
  });

  it("Multi-State has larger addressableMarket than Single Metro", () => {
    const multiState = LEVER_PRESETS.marketOpportunity["Multi-State"];
    const single = LEVER_PRESETS.marketOpportunity["Single Metro"];
    expect(multiState.addressableMarket).toBeGreaterThan(single.addressableMarket);
  });
});

// ─── LEVER_DEFAULTS ──────────────────────────────────────────────────────────

describe("LEVER_DEFAULTS", () => {
  it("defaults acquisitionAggression to Moderate", () => {
    expect(LEVER_DEFAULTS.acquisitionAggression).toBe("Moderate");
  });

  it("defaults rateCompetitiveness to Moderate", () => {
    expect(LEVER_DEFAULTS.rateCompetitiveness).toBe("Moderate");
  });

  it("defaults memberProfile to Balanced", () => {
    expect(LEVER_DEFAULTS.memberProfile).toBe("Balanced");
  });

  it("defaults marketOpportunity to Multi-Metro", () => {
    expect(LEVER_DEFAULTS.marketOpportunity).toBe("Multi-Metro");
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

  it("with empty levers, returns Moderate/Balanced/Multi-Metro preset values", () => {
    const inputs = resolveInputs({});
    const mod = LEVER_PRESETS.acquisitionAggression.Moderate;
    expect(inputs.launchCPA).toBe(mod.launchCPA);
    expect(inputs.monthlyMemberTarget).toBe(mod.monthlyMemberTarget);
  });

  it("overrides acquisitionAggression when set to Aggressive", () => {
    const inputs = resolveInputs({ acquisitionAggression: "Aggressive" });
    const preset = LEVER_PRESETS.acquisitionAggression.Aggressive;
    expect(inputs.launchCPA).toBe(preset.launchCPA);
    expect(inputs.monthlyMemberTarget).toBe(preset.monthlyMemberTarget);
  });

  it("overrides rateCompetitiveness when set to Conservative", () => {
    const inputs = resolveInputs({ rateCompetitiveness: "Conservative" });
    const preset = LEVER_PRESETS.rateCompetitiveness.Conservative;
    expect(inputs.rateBump).toBe(preset.rateBump);
    expect(inputs.rateCut).toBe(preset.rateCut);
  });

  it("overrides memberProfile when set to Upmarket", () => {
    const inputs = resolveInputs({ memberProfile: "Upmarket" });
    const preset = LEVER_PRESETS.memberProfile.Upmarket;
    expect(inputs.avgDepositBalance).toBe(preset.avgDepositBalance);
    expect(inputs.loanPenetrationRate).toBe(preset.loanPenetrationRate);
  });

  it("overrides marketOpportunity when set to Single Metro", () => {
    const inputs = resolveInputs({ marketOpportunity: "Single Metro" });
    const preset = LEVER_PRESETS.marketOpportunity["Single Metro"];
    expect(inputs.addressableMarket).toBe(preset.addressableMarket);
    expect(inputs.difficultyMultiplier).toBe(preset.difficultyMultiplier);
  });

  it("does not mutate DEFAULT_INPUTS", () => {
    const before = { ...DEFAULT_INPUTS };
    resolveInputs({ acquisitionAggression: "Aggressive", rateCompetitiveness: "Aggressive" });
    expect(DEFAULT_INPUTS).toEqual(before);
  });

  it("non-lever inputs (e.g. maintenanceDigital) are preserved unchanged", () => {
    const inputs = resolveInputs({ acquisitionAggression: "Aggressive" });
    expect(inputs.maintenanceDigital).toBe(DEFAULT_INPUTS.maintenanceDigital);
    expect(inputs.fraudCost).toBe(DEFAULT_INPUTS.fraudCost);
    expect(inputs.digitalAttritionYear1).toBe(DEFAULT_INPUTS.digitalAttritionYear1);
  });

  it("multiple levers can be combined independently", () => {
    const inputs = resolveInputs({
      acquisitionAggression: "Conservative",
      rateCompetitiveness:   "Aggressive",
      memberProfile:         "Upmarket",
      marketOpportunity:     "Multi-State",
    });
    expect(inputs.launchCPA).toBe(LEVER_PRESETS.acquisitionAggression.Conservative.launchCPA);
    expect(inputs.rateBump).toBe(LEVER_PRESETS.rateCompetitiveness.Aggressive.rateBump);
    expect(inputs.avgDepositBalance).toBe(LEVER_PRESETS.memberProfile.Upmarket.avgDepositBalance);
    expect(inputs.addressableMarket).toBe(LEVER_PRESETS.marketOpportunity["Multi-State"].addressableMarket);
  });
});
