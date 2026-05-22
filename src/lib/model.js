// Calculation engine — pure functions, no UI dependencies.
// Returns a 36-element array (one object per month). See PROJECT_BRIEF.md §Calculation Engine.

export const DEFAULT_INPUTS = {
  // Acquisition
  launchCPA: 400,          // $400 for new-market entry; Cornerstone puts existing-market CU CAC at $200–400, new markets are at or above the top of that range
  launchDuration: 12,
  steadyStateCPA: 75,
  monthlyMemberTarget: 500,
  addressableMarket: 500000,
  difficultyMultiplier: 1.0,

  // Deposits
  avgDepositBalance: 18000,
  rateBump: 50,           // basis points above standard rate offered to digital members
  ratePremiumDecay: 10,   // bps/year the premium erodes as competitors catch up

  // Loans
  loanPenetrationRate: 0.40,
  avgLoanBalance: 22000,
  rateCut: 25,            // bps below standard rate offered to digital members

  // Cannibalization (applied to institution's existing balance sheet)
  depositCannibRateA: 0.005,  // 0.5% of existing deposits migrate in Scenario A
  depositCannibRateB: 0.05,   // 5.0% in Scenario B
  loanCannibRateA: 0.003,     // 0.3% of existing loans re-price in Scenario A
  loanCannibRateB: 0.03,      // 3.0% in Scenario B

  // Servicing costs (per member per year unless noted)
  maintenanceTrad: 250,          // fully-loaded: direct ops ~$70 + allocated branch staff ~$100 + customer service ~$80; anchored to NCUA hybrid-vs-branch-heavy gap of $148/member/yr
  maintenanceDigital: 95,
  transactionCostTrad: 4.50,     // per teller transaction; ABA Cost Study / Celent: $4–6
  transactionCostDigital: 0.20,  // per digital transaction; published range $0.08–0.25
  avgTellerTransactionsPerMonth: 1 / 3,  // Fed "How America Banks" (2021): avg consumer visits branch ~4×/yr
  avgDigitalTransactionsPerMonth: 18,    // total digital channel volume (ACH, bill pay, mobile, debit)
  platformCost: 35,
  fraudCost: 15,
  costPerBranchVisit: 5,
  freeVisits: 4,                 // annual branch visit allowance for digital members

  // Retention
  digitalAttritionYear1: 0.18,         // 18%/yr during first 12 months
  digitalAttritionSteadyState: 0.07,   // 7%/yr after month 12
};

/**
 * Monthly acquisition — per PROJECT_BRIEF.md §computeMonthlyAcquisition
 * @param {number} month        1-based month index
 * @param {object} inputs
 * @param {number} remainingMarket  addressableMarket minus cumulative acquired so far
 */
export function computeMonthlyAcquisition(month, inputs, remainingMarket) {
  const baseCPA = month <= inputs.launchDuration ? inputs.launchCPA : inputs.steadyStateCPA;
  const effectiveCPA = baseCPA * inputs.difficultyMultiplier;
  const newMembers = Math.max(0, Math.min(inputs.monthlyMemberTarget, remainingMarket));
  const acquisitionSpend = newMembers * effectiveCPA;
  return { newMembers, acquisitionSpend, effectiveCPA };
}

/**
 * Monthly servicing cost delta — per PROJECT_BRIEF.md §computeServicingDelta
 * Returns the net monthly dollar savings from having totalDigitalMembers on digital vs traditional.
 */
export function computeServicingDelta(totalDigitalMembers, inputs) {
  const tellerPerYear   = inputs.avgTellerTransactionsPerMonth * 12;
  const digitalPerYear  = inputs.avgDigitalTransactionsPerMonth * 12;

  // Traditional member incurs both teller and digital transaction costs
  const traditionalCostPerMemberPerYear =
    inputs.maintenanceTrad +
    tellerPerYear  * inputs.transactionCostTrad +
    digitalPerYear * inputs.transactionCostDigital;

  // Digital member eliminates teller transactions; gains platform/fraud/subsidy costs
  const branchVisitSubsidy = Math.min(inputs.freeVisits, 4) * inputs.costPerBranchVisit;
  const digitalCostPerMemberPerYear =
    inputs.maintenanceDigital +
    digitalPerYear * inputs.transactionCostDigital +
    inputs.platformCost +
    inputs.fraudCost +
    branchVisitSubsidy;

  const savingsPerMemberPerYear = traditionalCostPerMemberPerYear - digitalCostPerMemberPerYear;
  return (totalDigitalMembers * savingsPerMemberPerYear) / 12;
}

/**
 * Monthly rate premium cost — per PROJECT_BRIEF.md §computeRatePremiumCost
 * Covers both the deposit rate bump offered to digital members and the loan rate discount.
 */
export function computeRatePremiumCost(totalDigitalMembers, inputs, month) {
  const decayPerMonth = inputs.ratePremiumDecay / 12;
  const effectiveBump = Math.max(0, inputs.rateBump - (month - 1) * decayPerMonth);

  const depositPremiumPerMemberPerMonth =
    inputs.avgDepositBalance * (effectiveBump / 10000) / 12;
  const loanSubsidyPerMemberPerMonth =
    inputs.avgLoanBalance * inputs.loanPenetrationRate * (inputs.rateCut / 10000) / 12;

  return totalDigitalMembers * (depositPremiumPerMemberPerMonth + loanSubsidyPerMemberPerMonth);
}

/**
 * Monthly cannibalization cost — per PROJECT_BRIEF.md §computeCannibalCost
 * Scenario A: slow ramp, lower rates. Scenario B: immediate, higher rates.
 * Derives existingShares and existingLoans from institution asset size.
 */
export function computeCannibalCost(institution, inputs, scenario) {
  const existingShares = institution.assets_b * 1e9 * 0.85;
  const existingLoans = institution.assets_b * 1e9 * 0.65;

  const depositRate = scenario === "scenario_b" ? inputs.depositCannibRateB : inputs.depositCannibRateA;
  const loanRate = scenario === "scenario_b" ? inputs.loanCannibRateB : inputs.loanCannibRateA;

  const depositCannibalizationCost = existingShares * depositRate * (inputs.rateBump / 10000) / 12;
  const loanCannibalizationCost = existingLoans * loanRate * (inputs.rateCut / 10000) / 12;

  return { depositCannibalizationCost, loanCannibalizationCost };
}

/**
 * Monthly net interest income from digital members — per PROJECT_BRIEF.md §computeNIIContribution
 * Uses hybrid_nim_p50 as the NIM proxy: hybrid institutions have already achieved digital density,
 * so their NIM reflects the economics of a digitally-oriented member base.
 */
export function computeNIIContribution(totalDigitalMembers, inputs, institution) {
  return totalDigitalMembers * inputs.avgDepositBalance * (institution.hybrid_nim_p50 / 100) / 12;
}

/**
 * Returns the first month number where cumulativeNetContribution >= 0, or null.
 */
export function findBreakEven(months) {
  const found = months.find(m => m.cumulativeNetContribution >= 0);
  return found ? found.month : null;
}

/**
 * Run the full 36-month simulation.
 * @param {object} institution   Selected institution record from ncua_model_data.json
 * @param {object} inputs        Merged DEFAULT_INPUTS + any user overrides
 * @param {string} scenario      "scenario_a" | "scenario_b"
 * @returns {object[]}           Array of 36 month objects (see PROJECT_BRIEF.md §Month object shape)
 */
export function runSimulation(institution, inputs, scenario) {
  const months = [];
  let totalDigitalMembers = 0;
  let cumulativeAcquired = 0;
  let cumulativeAcquisitionSpend = 0;
  let cumulativeNetContribution = 0;
  let cumulativeCannibalDrag = 0;

  for (let m = 1; m <= 60; m++) {
    // Acquisition
    const remainingMarket = inputs.addressableMarket - cumulativeAcquired;
    const { newMembers, acquisitionSpend } = computeMonthlyAcquisition(m, inputs, remainingMarket);
    cumulativeAcquired += newMembers;
    cumulativeAcquisitionSpend += acquisitionSpend;

    // Attrition — year-1 rate for first 12 months, steady-state thereafter
    const annualAttrition = m <= 12
      ? inputs.digitalAttritionYear1
      : inputs.digitalAttritionSteadyState;
    const monthlyAttrition = annualAttrition / 12;
    totalDigitalMembers = totalDigitalMembers * (1 - monthlyAttrition) + newMembers;

    // Monthly costs and savings
    const cannibal = computeCannibalCost(institution, inputs, scenario);
    const monthlyCannibalizationCost =
      cannibal.depositCannibalizationCost + cannibal.loanCannibalizationCost;

    const monthlyRatePremiumCost = computeRatePremiumCost(totalDigitalMembers, inputs, m);
    const monthlyServicingCostSavings = computeServicingDelta(totalDigitalMembers, inputs);
    const monthlyGrossNII = computeNIIContribution(totalDigitalMembers, inputs, institution);

    const monthlyNetContribution =
      -acquisitionSpend
      - monthlyRatePremiumCost
      - monthlyCannibalizationCost
      + monthlyServicingCostSavings
      + monthlyGrossNII;

    cumulativeNetContribution += monthlyNetContribution;
    cumulativeCannibalDrag += monthlyCannibalizationCost;

    months.push({
      month: m,
      newMembersAcquired: Math.round(newMembers),
      totalDigitalMembers: Math.round(totalDigitalMembers),
      cumulativeAcquisitionSpend: Math.round(cumulativeAcquisitionSpend),
      monthlyRatePremiumCost: Math.round(monthlyRatePremiumCost),
      monthlyCannibalizationCost: Math.round(monthlyCannibalizationCost),
      depositCannibalizationCost: Math.round(cannibal.depositCannibalizationCost),
      loanCannibalizationCost: Math.round(cannibal.loanCannibalizationCost),
      monthlyServicingCostSavings: Math.round(monthlyServicingCostSavings),
      monthlyGrossNII: Math.round(monthlyGrossNII),
      monthlyNetContribution: Math.round(monthlyNetContribution),
      cumulativeNetContribution: Math.round(cumulativeNetContribution),
      cumulativeCannibalDrag: Math.round(cumulativeCannibalDrag),
      marketPenetrationPct: Math.min(1.0, cumulativeAcquired / inputs.addressableMarket),
      isBreakEvenMonth: false,
    });
  }

  // Mark break-even
  const breakEvenMonth = findBreakEven(months);
  if (breakEvenMonth !== null) {
    months[breakEvenMonth - 1].isBreakEvenMonth = true;
  }

  return months;
}
