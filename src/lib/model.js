// Calculation engine — pure functions, no UI dependencies.
// Returns { months, calibration } from runSimulation. See PROJECT_BRIEF.md §Calculation Engine.

export const DEFAULT_INPUTS = {
  // Acquisition — Market Definition
  marketName: "Expansion Market",  // label only — chart headers, summary outputs
  tam: 500000,                     // Total Addressable Market (households)
  samPct: 40,                      // SAM as % of TAM

  // Acquisition — Membership Milestones (net active members)
  m12Target: 3000,    // Target active members at month 12
  m36Target: 12000,   // Target active members at month 36
  m60Target: 22000,   // Target active members at month 60

  // Acquisition — CPA Economics (logistic decay curve)
  initialCPA: 450,           // $/active member, early market; Cornerstone: new-market CU CAC $200–400; expansion at/above top of range
  steadyStateCPA: 75,        // $/active member, mature market (organic + referral)
  monthsToSteadyState: 24,   // Months for CPA to reach ~steady-state; typical regional brand-building horizon

  // Deposits
  avgDepositBalance: 18000,
  rateBump: 50,          // bps above standard rate offered to digital members
  ratePremiumDecay: 10,  // bps/year the premium erodes as competitors catch up
  rateBumpFloor: 25,     // bps — decay stops here; rate advantage persists at this floor

  // Loans
  loanPenetrationRate: 0.10,
  avgLoanBalance: 10000,
  rateCut: 25,           // bps below standard rate offered to digital members

  // Cannibalization (applied to institution's existing balance sheet)
  depositCannibRateA: 0.005,  // 0.5%/yr of existing deposits in Scenario A
  depositCannibRateB: 0.05,   // 5.0%/yr in Scenario B
  loanCannibRateA: 0.003,     // 0.3%/yr of existing loans in Scenario A
  loanCannibRateB: 0.03,      // 3.0%/yr in Scenario B

  // Servicing costs (per member per year unless noted)
  maintenanceTrad: 250,           // fully-loaded: direct ops ~$70 + branch staff ~$100 + CS ~$80
  maintenanceDigital: 95,
  transactionCostTrad: 4.50,      // per teller transaction; ABA Cost Study / Celent: $4–6
  transactionCostDigital: 0.20,   // per digital transaction; published range $0.08–0.25
  avgTellerTransactionsPerMonth: 1 / 3,  // Fed "How America Banks" (2021): ~4 branch visits/yr
  avgDigitalTransactionsPerMonth: 18,    // total digital channel volume (ACH, bill pay, mobile, debit)
  platformCost: 35,
  fraudCost: 15,
  costPerBranchVisit: 5,
  freeVisits: 4,   // annual branch visit allowance for digital members

  // Retention
  digitalAttritionYear1: 0.18,        // 18%/yr during first 12 program months
  digitalAttritionSteadyState: 0.07,  // 7%/yr after month 12
};

/** Market Competitiveness presets — applied immediately when the toggle changes. */
export const MARKET_COMPETITIVENESS_PRESETS = {
  Low:    { initialCPA: 300, steadyStateCPA: 50,  monthsToSteadyState: 18 },
  Medium: { initialCPA: 450, steadyStateCPA: 75,  monthsToSteadyState: 24 },
  High:   { initialCPA: 650, steadyStateCPA: 110, monthsToSteadyState: 36 },
};

// ── Bass diffusion helpers ────────────────────────────────────────────────────

/**
 * Bass cumulative adoption fraction at time t (t in years, annual parameter convention).
 * F(t) = (1 − e^(−(p+q)t)) / (1 + (q/p)·e^(−(p+q)t))
 */
function bassF(t, p, q) {
  if (t <= 0) return 0;
  const epq = Math.exp(-(p + q) * t);
  return (1 - epq) / (1 + (q / p) * epq);
}

/**
 * Returns a 60-element array of gross new members per month (index 0 = month 1).
 * Each element = (F(m/12) − F((m−1)/12)) × sam, clamped to ≥ 0.
 */
function computeBassCurve(p, q, sam) {
  const result = [];
  for (let m = 1; m <= 60; m++) {
    result.push(Math.max(0, (bassF(m / 12, p, q) - bassF((m - 1) / 12, p, q)) * sam));
  }
  return result;
}

/**
 * Forward-simulates attrition from the Bass curve and returns net active members
 * at months 12, 36, and 60 in a single O(60) pass.
 *
 * Uses the same accumulation logic as runSimulation to keep calibration consistent
 * with the live simulation: attrition is applied to the entire pool each month,
 * switching from year-1 to steady-state rate at program month 13.
 */
function simulateNetActiveAll(curve, inputs) {
  let total = 0;
  let a12 = 0, a36 = 0;
  for (let m = 1; m <= 60; m++) {
    const attrition =
      (m <= 12 ? inputs.digitalAttritionYear1 : inputs.digitalAttritionSteadyState) / 12;
    total = total * (1 - attrition) + curve[m - 1];
    if (m === 12) a12 = total;
    if (m === 36) a36 = total;
  }
  return { a12, a36, a60: total };
}

// ── Nelder-Mead 2D minimizer ──────────────────────────────────────────────────

/**
 * Minimizes f(x[0], x[1]) using the Nelder-Mead simplex method with box bounds.
 * Derivative-free; suitable for the Bass WLS calibration loss function.
 *
 * @param {function} f        Scalar objective: (p: number, q: number) => number
 * @param {number[]} x0       Starting point [p0, q0]
 * @param {number[][]} bounds [[pMin, pMax], [qMin, qMax]]
 * @param {number} maxIter    Maximum iterations (default 500)
 * @returns {number[]}        [p, q] at approximate minimum
 */
function nelderMead2D(f, x0, bounds, maxIter = 500) {
  const alpha = 1.0, gamma = 2.0, rho = 0.5, sigma = 0.5;

  const clamp = (pt) => [
    Math.max(bounds[0][0], Math.min(bounds[0][1], pt[0])),
    Math.max(bounds[1][0], Math.min(bounds[1][1], pt[1])),
  ];

  // Initial simplex: starting point + two perturbed vertices
  let simplex = [
    clamp([...x0]),
    clamp([x0[0] + 0.01, x0[1]]),
    clamp([x0[0], x0[1] + 0.15]),
  ];
  let vals = simplex.map((pt) => f(pt[0], pt[1]));

  for (let iter = 0; iter < maxIter; iter++) {
    // Sort: best (lowest) first
    const ord = [0, 1, 2].sort((a, b) => vals[a] - vals[b]);
    simplex = ord.map((i) => simplex[i]);
    vals    = ord.map((i) => vals[i]);

    if (Math.abs(vals[2] - vals[0]) < 1e-8) break;

    // Centroid of the two best vertices
    const cx = (simplex[0][0] + simplex[1][0]) / 2;
    const cy = (simplex[0][1] + simplex[1][1]) / 2;

    // Reflection
    const refl  = clamp([cx + alpha * (cx - simplex[2][0]), cy + alpha * (cy - simplex[2][1])]);
    const fRefl = f(refl[0], refl[1]);

    if (fRefl < vals[0]) {
      // Expansion
      const exp  = clamp([cx + gamma * (refl[0] - cx), cy + gamma * (refl[1] - cy)]);
      const fExp = f(exp[0], exp[1]);
      [simplex[2], vals[2]] = fExp < fRefl ? [exp, fExp] : [refl, fRefl];
    } else if (fRefl < vals[1]) {
      simplex[2] = refl;
      vals[2]    = fRefl;
    } else {
      // Contraction
      const con  = clamp([cx + rho * (simplex[2][0] - cx), cy + rho * (simplex[2][1] - cy)]);
      const fCon = f(con[0], con[1]);
      if (fCon < vals[2]) {
        simplex[2] = con;
        vals[2]    = fCon;
      } else {
        // Shrink around best point
        for (let i = 1; i <= 2; i++) {
          simplex[i] = clamp([
            simplex[0][0] + sigma * (simplex[i][0] - simplex[0][0]),
            simplex[0][1] + sigma * (simplex[i][1] - simplex[0][1]),
          ]);
          vals[i] = f(simplex[i][0], simplex[i][1]);
        }
      }
    }
  }

  return simplex[0]; // [p, q] at best found point
}

// ── Realism assessment ────────────────────────────────────────────────────────

/**
 * Assesses Bass parameter plausibility and milestone fit quality.
 * Returns a structured realism indicator with three independent dimensions.
 */
function assessRealism(p, q, residuals) {
  // Parameter plausibility (Bass reference ranges for digital financial products)
  const pStatus = p >= 0.003 && p <= 0.020 ? "green" : p <= 0.040 ? "yellow" : "red";
  const qStatus = q >= 0.15  && q <= 0.45  ? "green" : q <= 0.65  ? "yellow" : "red";
  const paramStatus =
      [pStatus, qStatus].includes("red")    ? "red"
    : [pStatus, qStatus].includes("yellow") ? "yellow"
    : "green";

  // Model fit quality: RMSE of relative residuals across all three milestones
  const { 12: r12, 36: r36, 60: r60 } = residuals;
  const rmse = Math.sqrt((r12 * r12 + r36 * r36 + r60 * r60) / 3);
  const fitStatus = rmse < 0.10 ? "green" : rmse < 0.25 ? "yellow" : "red";

  // Milestone tension: which single milestone is hardest for the Bass curve to hit?
  const absRes = { 12: Math.abs(r12), 36: Math.abs(r36), 60: Math.abs(r60) };
  const maxResidualMonth = parseInt(
    Object.entries(absRes).reduce((best, cur) => (cur[1] > best[1] ? cur : best))[0]
  );
  const maxResidual = absRes[maxResidualMonth];
  const tensionStatus = maxResidual < 0.10 ? "green" : maxResidual < 0.25 ? "yellow" : "red";

  const overall =
      [paramStatus, fitStatus, tensionStatus].includes("red")    ? "red"
    : [paramStatus, fitStatus, tensionStatus].includes("yellow") ? "yellow"
    : "green";

  return {
    overall,
    paramStatus, pStatus, qStatus,
    fitStatus, rmse,
    tensionStatus, maxResidualMonth, maxResidual,
    residuals,
  };
}

// ── Exported acquisition functions ────────────────────────────────────────────

/**
 * Calibrates Bass model parameters (p, q) to the user's milestone targets using
 * weighted least squares optimization (Nelder-Mead).
 *
 * Objective weights: M60 = 3 (primary planning horizon), M36 = 2, M12 = 1.
 * Search space: p ∈ [0.001, 0.05], q ∈ [0.05, 0.80].
 *
 * @param {object} inputs  Merged DEFAULT_INPUTS + user overrides
 * @returns {{ p, q, sam, bassGrossCurve, residuals, realismIndicator }}
 */
export function calibrateAcquisition(inputs) {
  const sam = inputs.tam * (inputs.samPct / 100);

  function loss(p, q) {
    const curve = computeBassCurve(p, q, sam);
    const { a12, a36, a60 } = simulateNetActiveAll(curve, inputs);
    return (
      3 * (a60 - inputs.m60Target) ** 2 +
      2 * (a36 - inputs.m36Target) ** 2 +
      1 * (a12 - inputs.m12Target) ** 2
    );
  }

  const [p, q] = nelderMead2D(loss, [0.01, 0.30], [[0.001, 0.05], [0.05, 0.80]]);
  const bassGrossCurve = computeBassCurve(p, q, sam);
  const { a12, a36, a60 } = simulateNetActiveAll(bassGrossCurve, inputs);

  const residuals = {
    12: inputs.m12Target > 0 ? (a12 - inputs.m12Target) / inputs.m12Target : 0,
    36: inputs.m36Target > 0 ? (a36 - inputs.m36Target) / inputs.m36Target : 0,
    60: inputs.m60Target > 0 ? (a60 - inputs.m60Target) / inputs.m60Target : 0,
  };

  return { p, q, sam, bassGrossCurve, residuals, realismIndicator: assessRealism(p, q, residuals) };
}

/**
 * CPA logistic decay — per PROJECT_BRIEF.md §computeCPA
 * CPA(t) = steadyStateCPA + (initialCPA − steadyStateCPA) / (1 + e^(k·(t − t_mid)))
 */
export function computeCPA(month, inputs) {
  const tMid = inputs.monthsToSteadyState / 2;
  const k    = 8 / inputs.monthsToSteadyState;
  return (
    inputs.steadyStateCPA +
    (inputs.initialCPA - inputs.steadyStateCPA) / (1 + Math.exp(k * (month - tMid)))
  );
}

// ── Economics functions (unchanged) ──────────────────────────────────────────

/**
 * Monthly servicing cost delta — net monthly dollar savings from having
 * totalDigitalMembers on digital vs traditional.
 */
export function computeServicingDelta(totalDigitalMembers, inputs) {
  const tellerPerYear  = inputs.avgTellerTransactionsPerMonth * 12;
  const digitalPerYear = inputs.avgDigitalTransactionsPerMonth * 12;

  const traditionalCostPerMemberPerYear =
    inputs.maintenanceTrad +
    tellerPerYear  * inputs.transactionCostTrad +
    digitalPerYear * inputs.transactionCostDigital;

  const branchVisitSubsidy = inputs.freeVisits * inputs.costPerBranchVisit;
  const digitalCostPerMemberPerYear =
    inputs.maintenanceDigital +
    digitalPerYear * inputs.transactionCostDigital +
    inputs.platformCost +
    inputs.fraudCost +
    branchVisitSubsidy;

  return (totalDigitalMembers * (traditionalCostPerMemberPerYear - digitalCostPerMemberPerYear)) / 12;
}

/**
 * Monthly rate premium cost — deposit rate bump + loan rate discount paid on
 * the entire active digital member base.
 */
export function computeRatePremiumCost(totalDigitalMembers, inputs, month) {
  const decayPerMonth = inputs.ratePremiumDecay / 12;
  const floor = inputs.rateBumpFloor ?? 0;
  const effectiveBump = Math.max(floor, inputs.rateBump - (month - 1) * decayPerMonth);

  const depositPremiumPerMemberPerMonth =
    inputs.avgDepositBalance * (effectiveBump / 10000) / 12;
  const loanSubsidyPerMemberPerMonth =
    inputs.avgLoanBalance * inputs.loanPenetrationRate * (inputs.rateCut / 10000) / 12;

  return totalDigitalMembers * (depositPremiumPerMemberPerMonth + loanSubsidyPerMemberPerMonth);
}

/**
 * Monthly cannibalization cost — applied to institution's existing balance sheet.
 * Scenario A: slow ramp (relocation / marketing spillover only).
 * Scenario B: immediate full-book repricing.
 */
export function computeCannibalCost(institution, inputs, scenario) {
  const existingShares = institution.assets_b * 1e9 * 0.85;
  const existingLoans  = institution.assets_b * 1e9 * 0.65;
  const depositRate = scenario === "scenario_b" ? inputs.depositCannibRateB : inputs.depositCannibRateA;
  const loanRate    = scenario === "scenario_b" ? inputs.loanCannibRateB    : inputs.loanCannibRateA;
  const depositCannibalizationCost = existingShares * depositRate * (inputs.rateBump / 10000) / 12;
  const loanCannibalizationCost    = existingLoans  * loanRate    * (inputs.rateCut  / 10000) / 12;
  return { depositCannibalizationCost, loanCannibalizationCost };
}

/**
 * Monthly net interest income from digital members.
 * Uses hybrid_nim_p50 as the NIM proxy — hybrid institutions have already achieved
 * digital density, so their NIM reflects the economics of a digitally-oriented member base.
 */
export function computeNIIContribution(totalDigitalMembers, inputs, institution) {
  return totalDigitalMembers * inputs.avgDepositBalance * (institution.hybrid_nim_p50 / 100) / 12;
}

/**
 * Returns the first month number where cumulativeNetContribution >= 0, or null.
 */
export function findBreakEven(months) {
  const found = months.find((m) => m.cumulativeNetContribution >= 0);
  return found ? found.month : null;
}

/**
 * Run the full 60-month simulation.
 *
 * @param {object} institution  Selected institution from ncua_model_data.json
 * @param {object} inputs       Merged DEFAULT_INPUTS + any user overrides
 * @param {string} scenario     "scenario_a" | "scenario_b"
 * @returns {{ months: object[], calibration: object }}
 *   months[0..59] — one object per month (see PROJECT_BRIEF.md §Month object shape)
 *   calibration   — Bass parameters, SAM, residuals, realism indicator
 */
export function runSimulation(institution, inputs, scenario) {
  // Calibration is scenario-independent; runs once per inputs change.
  const calibration = calibrateAcquisition(inputs);
  const { bassGrossCurve, sam } = calibration;

  const months = [];
  let totalActiveMembers      = 0;
  let cumulativeAcquisitionSpend = 0;
  let cumulativeNetContribution  = 0;
  let cumulativeCannibalDrag     = 0;

  for (let m = 1; m <= 60; m++) {
    // Attrition: year-1 rate for first 12 program months, steady-state thereafter
    const attrition   = (m <= 12 ? inputs.digitalAttritionYear1 : inputs.digitalAttritionSteadyState) / 12;
    const newMembersGross = bassGrossCurve[m - 1];
    totalActiveMembers = totalActiveMembers * (1 - attrition) + newMembersGross;

    // Acquisition economics
    const cpa                   = computeCPA(m, inputs);
    const monthlyAcquisitionSpend = newMembersGross * cpa;
    cumulativeAcquisitionSpend += monthlyAcquisitionSpend;

    // Downstream economics
    const cannibal = computeCannibalCost(institution, inputs, scenario);
    const monthlyCannibalizationCost = cannibal.depositCannibalizationCost + cannibal.loanCannibalizationCost;
    const monthlyRatePremiumCost     = computeRatePremiumCost(totalActiveMembers, inputs, m);
    const monthlyServicingCostSavings = computeServicingDelta(totalActiveMembers, inputs);
    const monthlyGrossNII            = computeNIIContribution(totalActiveMembers, inputs, institution);

    const monthlyNetContribution =
      -monthlyAcquisitionSpend
      - monthlyRatePremiumCost
      - monthlyCannibalizationCost
      + monthlyServicingCostSavings
      + monthlyGrossNII;

    cumulativeNetContribution += monthlyNetContribution;
    cumulativeCannibalDrag    += monthlyCannibalizationCost;

    months.push({
      month: m,

      // Acquisition
      newMembersGross: Math.round(newMembersGross),
      newMembersActive: Math.round(newMembersGross * (1 - inputs.digitalAttritionYear1)),
      totalActiveMembers: Math.round(totalActiveMembers),
      cpa: Math.round(cpa),
      monthlyAcquisitionSpend: Math.round(monthlyAcquisitionSpend),
      cumulativeAcquisitionSpend: Math.round(cumulativeAcquisitionSpend),
      samPenetrationPct: sam > 0 ? Math.min(1, totalActiveMembers / sam) : 0,

      // Economics
      monthlyRatePremiumCost: Math.round(monthlyRatePremiumCost),
      monthlyCannibalizationCost: Math.round(monthlyCannibalizationCost),
      depositCannibalizationCost: Math.round(cannibal.depositCannibalizationCost),
      loanCannibalizationCost: Math.round(cannibal.loanCannibalizationCost),
      monthlyServicingCostSavings: Math.round(monthlyServicingCostSavings),
      monthlyGrossNII: Math.round(monthlyGrossNII),
      monthlyNetContribution: Math.round(monthlyNetContribution),
      cumulativeNetContribution: Math.round(cumulativeNetContribution),
      cumulativeCannibalDrag: Math.round(cumulativeCannibalDrag),
      isBreakEvenMonth: false,
    });
  }

  const breakEvenMonth = findBreakEven(months);
  if (breakEvenMonth !== null) {
    months[breakEvenMonth - 1].isBreakEvenMonth = true;
  }

  return { months, calibration };
}
