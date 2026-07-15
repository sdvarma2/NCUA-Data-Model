// Calculation engine — pure functions, no UI dependencies.
// Returns { months, calibration } from runSimulation. See PROJECT_BRIEF.md §Calculation Engine.

export const DEFAULT_INPUTS = {
  // Acquisition — Market Definition
  marketName: "Expansion Market",  // label only — chart headers, summary outputs
  tam: 500000,                     // Total Addressable Market (potential members)
  samPct: 40,                      // SAM as % of TAM

  // Acquisition — Membership Milestones (net active members)
  // Pre-computed from suggestMilestones(DEFAULT_INPUTS, p=0.008, q=0.30):
  // SAM 200,000 × mid-green Bass params × 18%/7% attrition → 1,700 / 6,900 / 15,000
  m12Target: 1700,
  m36Target: 6900,
  m60Target: 15000,

  // Acquisition — CPA Economics (logistic decay curve)
  initialCPA: 450,           // $/active member, early market; Cornerstone: new-market CU CAC $200–400; expansion at/above top of range
  steadyStateCPA: 225,       // $/active member; floor rarely reached in 5yr window — see Acquisition Cost Profile lever
  monthsToSteadyState: 60,   // months; network effects take longer than one planning cycle for new-market CUs

  // Deposits
  avgDepositBalance: 18000,
  rateBump: 50,          // bps above standard rate offered to digital members
  ratePremiumDecay: 10,  // bps/year the premium erodes as competitors catch up
  rateBumpFloor: 25,     // bps — decay stops here; rate advantage persists at this floor

  // Loans
  loanPenetrationRate: 0.10,  // conservative 5-yr avg; SoFi ~20% after years of brand-building sets ceiling
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

  // Rate Incentives — q (word-of-mouth) and attrition are direct behavioral
  // consequences of the rate story and are multiplied against baseline.
  // Conservative (0.65×/0.60×): quieter organic spread, but stickier members
  // Moderate (1.0×): baseline — no adjustment
  // Aggressive (1.55×/1.60×): stronger word-of-mouth, but "hot money" churn
  // p (paid/outbound acquisition intensity) is NOT a multiplier — it is
  // solved in calibrateAcquisition() to hold the Month 60 goal fixed under
  // whatever rate posture is selected. See calibrateAcquisition for why.
  qMultiplier: 1.0,
  attritionMultiplier: 1.0,
};

/**
 * Default inputs for the Existing Footprint sub-model (Scenario B only).
 * Only the fields that differ from DEFAULT_INPUTS are listed here; all shared
 * fields (servicing, cannibalization, branch visits, etc.) are inherited from
 * the user's customized base inputs in page.jsx.
 */
export const DEFAULT_FOOTPRINT_INPUTS = {
  marketName: "Existing Branch Footprint",
  tam: 150000,       // bounded by existing service-area geography
  samPct: 35,        // existing member + near-member universe; slightly lower than cold market
  // Pre-computed from suggestMilestones(DEFAULT_FOOTPRINT_INPUTS, p=0.008, q=0.30):
  // SAM 52,500 × mid-green Bass params × 10%/5% attrition → 450 / 1,850 / 4,100
  m12Target: 450,
  m36Target: 1850,
  m60Target: 4100,

  // CPA: sensible cross-sell defaults shown when marketing toggle is ON.
  // page.jsx enforces CPA→0 when the toggle is OFF, regardless of these values.
  // $75 initial ≈ expansion-market steady-state (existing relationship removes brand-building cost).
  // $20 steady-state ≈ email/app cross-sell at near-marginal cost after launch push.
  initialCPA: 75,
  steadyStateCPA: 20,
  monthsToSteadyState: 24,

  // Deposits — established members need less rate incentive
  avgDepositBalance: 22000,
  rateBump: 25,
  ratePremiumDecay: 10,
  rateBumpFloor: 10,

  // Loans — existing members have higher product awareness
  loanPenetrationRate: 0.20,
  avgLoanBalance: 12000,
  rateCut: 15,

  // Retention — established relationships are stickier
  digitalAttritionYear1: 0.10,
  digitalAttritionSteadyState: 0.05,

  // Rate Incentives multipliers — always 1.0 for the footprint stream; rate
  // incentive dynamics are modelled on the expansion market only.
  qMultiplier: 1.0,
  attritionMultiplier: 1.0,
};

/** Market Competitiveness presets — applied immediately when the toggle changes. */
export const MARKET_COMPETITIVENESS_PRESETS = {
  // Steady-state floors updated to reflect realistic 5-year CPA decay in new-market CU expansion.
  // Higher competition → higher CPA floor (weaker network effects, crowded acquisition channels).
  Low:    { initialCPA: 300, steadyStateCPA: 175, monthsToSteadyState: 60 },
  Medium: { initialCPA: 450, steadyStateCPA: 225, monthsToSteadyState: 60 },
  High:   { initialCPA: 650, steadyStateCPA: 275, monthsToSteadyState: 60 },
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

// ── Bounded 1-D solve for p ───────────────────────────────────────────────────

/**
 * Solves for the innovation coefficient p that makes the Bass curve's Month 60
 * net-active total hit m60Target exactly, holding q, sam, and attrition fixed.
 *
 * a60(p) is monotonically increasing in p for fixed q (more outbound reach
 * never decreases adoption), so bisection is well-behaved. If the target is
 * unreachable within [pMin, pMax] the search clamps to the nearer bound —
 * the caller's residual-vs-target check is what surfaces that as "implausible."
 *
 * @param {number} q               Fixed imitation coefficient
 * @param {number} sam             Serviceable addressable market
 * @param {object} effectiveInputs Rate-incentive-adjusted attrition inputs
 * @param {number} m60Target       Month 60 net-active goal to solve for
 * @param {number[]} [bounds]      [pMin, pMax] search bounds
 * @returns {number} p
 */
function solvePForTarget(q, sam, effectiveInputs, m60Target, bounds = [0.001, 0.05]) {
  const [pMin, pMax] = bounds;
  const a60At = (p) => simulateNetActiveAll(computeBassCurve(p, q, sam), effectiveInputs).a60;

  const aAtMin = a60At(pMin);
  const aAtMax = a60At(pMax);
  if (m60Target <= aAtMin) return pMin; // even minimum outbound reach meets or exceeds the goal
  if (m60Target >= aAtMax) return pMax; // even maximum outbound reach can't reach the goal

  let lo = pMin, hi = pMax;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (a60At(mid) < m60Target) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
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

  // Milestone tension: how hard is it for the Bass curve to reach the targets?
  // Only NEGATIVE residuals (model under-predicts) count as tension — a positive
  // residual means the Bass curve naturally exceeds the target, which indicates
  // the target is conservative, not ambitious. Labelling over-achievable targets
  // as "Ambitious" is a false positive that confuses the calibration story.
  const underPredictions = { 12: Math.max(0, -r12), 36: Math.max(0, -r36), 60: Math.max(0, -r60) };
  const maxResidualMonth = parseInt(
    Object.entries(underPredictions).reduce((best, cur) => (cur[1] > best[1] ? cur : best))[0]
  );
  const maxResidual = underPredictions[maxResidualMonth];
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

/**
 * Assesses whether the CURRENT rate posture can still reach the Month 60 goal.
 *
 * Unlike assessRealism (which fits p AND q to all three milestones via the
 * WLS optimizer), Rate Incentives only solves p against the Month 60 target —
 * q is a direct multiplier and M12/M36 are whatever the resulting curve shape
 * happens to produce, not independently targeted. Judging Rate Fit against
 * M12/M36 residuals therefore measures the wrong thing: a rate posture that
 * reshapes the curve (e.g. Aggressive's back-loaded, word-of-mouth-heavy
 * shape) can undershoot M12 substantially while still landing exactly on the
 * Month 60 goal — that's a genuine trajectory difference, not evidence the
 * goal is unreachable, and shouldn't read as "Implausible."
 *
 * Tension here is scoped to the Month 60 residual alone, since that's the
 * only thing p is solved against. A meaningful underprediction only happens
 * when p saturates at its search bound and still falls short — the correct
 * "this rate posture can't reach the goal" signal.
 */
function assessRateFit(p, q, m60Residual) {
  const pStatus = p >= 0.003 && p <= 0.020 ? "green" : p <= 0.040 ? "yellow" : "red";
  const qStatus = q >= 0.15  && q <= 0.45  ? "green" : q <= 0.65  ? "yellow" : "red";
  const paramStatus =
      [pStatus, qStatus].includes("red")    ? "red"
    : [pStatus, qStatus].includes("yellow") ? "yellow"
    : "green";

  const underPrediction = Math.max(0, -m60Residual);
  const tensionStatus = underPrediction < 0.02 ? "green" : underPrediction < 0.10 ? "yellow" : "red";

  const overall =
      [paramStatus, tensionStatus].includes("red")    ? "red"
    : [paramStatus, tensionStatus].includes("yellow") ? "yellow"
    : "green";

  return { overall, paramStatus, pStatus, qStatus, tensionStatus, m60Residual };
}

/**
 * Rounds a milestone value to a scale-appropriate increment so it reads as a
 * plausible planning number rather than raw simulation output. Finer rounding
 * for small numbers (m12 is always small) prevents artificial inflation.
 */
function roundByMagnitude(n) {
  if (n <  2_000) return Math.max( 50, Math.round(n /  50) *  50);
  if (n < 10_000) return Math.max(100, Math.round(n / 100) * 100);
  if (n < 50_000) return Math.max(500, Math.round(n / 500) * 500);
  return Math.max(1_000, Math.round(n / 1_000) * 1_000);
}

// ── Exported acquisition functions ────────────────────────────────────────────

/**
 * Calibrates Bass model parameters (p, q) to the user's milestone targets, then
 * applies Rate Incentives.
 *
 * Two-stage design:
 *
 * 1. Baseline fit (Nelder-Mead WLS, weights M60=3/M36=2/M12=1, search space
 *    p ∈ [0.001, 0.05], q ∈ [0.05, 0.80]) at Moderate rate assumptions — this
 *    is the "Market & Goal" achievability signal (realismIndicator below),
 *    stable regardless of whatever Rate Incentives posture is later selected.
 *
 * 2. Rate Incentives are applied by holding the Month 60 goal FIXED and
 *    solving for the acquisition mix that reaches it under that rate story:
 *      - q (word-of-mouth) and attrition are direct behavioral consequences
 *        of the rate story — multiplied directly against baseline.
 *      - p (paid/outbound acquisition intensity) is SOLVED (see
 *        solvePForTarget) rather than multiplied, because p is the one
 *        marketing-spend-elastic lever: a worse rate story means p has to
 *        rise to compensate, a better one means it can fall. This keeps the
 *        stated goal from silently drifting just because a pricing lever
 *        moved — a worse rate story costs more effort to reach the same
 *        goal, it doesn't just produce fewer members.
 *    rateFitIndicator assesses achievability at THIS specific rate posture —
 *    e.g. p pinned at its upper bound and still short signals the goal isn't
 *    reachable at that rate story without unrealistic acquisition intensity.
 *
 * @param {object} inputs  Merged DEFAULT_INPUTS + user overrides
 * @returns {{ p, q, pBaseline, qBaseline, sam, bassGrossCurve, effectiveInputs,
 *   projectedM12, projectedM36, projectedM60, residuals, realismIndicator,
 *   rateFitIndicator }}
 */
export function calibrateAcquisition(inputs) {
  const sam      = inputs.tam * (inputs.samPct / 100);
  const qMult    = inputs.qMultiplier          ?? 1.0;
  const attrMult = inputs.attritionMultiplier  ?? 1.0;

  // ── Step 1: calibrate baseline p/q to hit stated milestones at Moderate
  // rate assumptions — the Market & Goal achievability baseline.
  function loss(p, q) {
    const curve = computeBassCurve(p, q, sam);
    const { a12, a36, a60 } = simulateNetActiveAll(curve, inputs);
    return (
      3 * (a60 - inputs.m60Target) ** 2 +
      2 * (a36 - inputs.m36Target) ** 2 +
      1 * (a12 - inputs.m12Target) ** 2
    );
  }

  const [pBaseline, qBaseline] = nelderMead2D(loss, [0.01, 0.30], [[0.001, 0.05], [0.05, 0.80]]);

  const baselineCurve = computeBassCurve(pBaseline, qBaseline, sam);
  const { a12: baseA12, a36: baseA36, a60: baseA60 } = simulateNetActiveAll(baselineCurve, inputs);
  const baselineResiduals = {
    12: inputs.m12Target > 0 ? (baseA12 - inputs.m12Target) / inputs.m12Target : 0,
    36: inputs.m36Target > 0 ? (baseA36 - inputs.m36Target) / inputs.m36Target : 0,
    60: inputs.m60Target > 0 ? (baseA60 - inputs.m60Target) / inputs.m60Target : 0,
  };
  const realismIndicator = assessRealism(pBaseline, qBaseline, baselineResiduals);

  // ── Step 2: apply Rate Incentives — q/attrition multiplied directly,
  // p solved to hold the Month 60 goal fixed.
  const q = Math.min(0.80, Math.max(0.05, qBaseline * qMult));
  const effectiveInputs = {
    ...inputs,
    digitalAttritionYear1:       Math.min(0.99, inputs.digitalAttritionYear1       * attrMult),
    digitalAttritionSteadyState: Math.min(0.99, inputs.digitalAttritionSteadyState * attrMult),
  };
  const p = solvePForTarget(q, sam, effectiveInputs, inputs.m60Target);

  const bassGrossCurve = computeBassCurve(p, q, sam);
  const { a12: projM12, a36: projM36, a60: projM60 } =
    simulateNetActiveAll(bassGrossCurve, effectiveInputs);

  const residuals = {
    12: inputs.m12Target > 0 ? (projM12 - inputs.m12Target) / inputs.m12Target : 0,
    36: inputs.m36Target > 0 ? (projM36 - inputs.m36Target) / inputs.m36Target : 0,
    60: inputs.m60Target > 0 ? (projM60 - inputs.m60Target) / inputs.m60Target : 0,
  };

  return {
    pBaseline, qBaseline,
    p, q,
    sam,
    bassGrossCurve,
    effectiveInputs,
    projectedM12: Math.round(projM12),
    projectedM36: Math.round(projM36),
    projectedM60: Math.round(projM60),
    residuals,
    realismIndicator,                                        // Market & Goal — achievability at Moderate rates
    rateFitIndicator: assessRateFit(p, q, residuals[60]),     // Rate Incentives — Month 60 achievability at the current rate posture
  };
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

/**
 * Total acquisition spend across the 60-month planning window — the sum of
 * newMembersGross(m) × computeCPA(m) for m = 1..60, using the calibrated Bass
 * curve and CPA settings. Mirrors the per-month spend calculation in
 * runStream()/runSimulation() so this total matches what the simulation
 * actually spends, without needing to run the full 60-month simulation loop.
 *
 * @param {object} calibration  Result of calibrateAcquisition() — reads
 *                               bassGrossCurve and effectiveInputs
 * @returns {number} Total acquisition spend in dollars over 60 months
 */
export function computeCumulativeAcquisitionSpend(calibration) {
  const { bassGrossCurve, effectiveInputs } = calibration;
  let total = 0;
  for (let m = 1; m <= 60; m++) {
    total += bassGrossCurve[m - 1] * computeCPA(m, effectiveInputs);
  }
  return total;
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
 * Suggests milestone targets using a reference Bass run at fixed parameters.
 * Runs computeBassCurve → simulateNetActiveAll with the inputs' own attrition
 * settings so the suggested values reflect net active members, not gross
 * adoption. Results are rounded to a scale-appropriate increment so they read
 * as plausible planning numbers rather than raw simulation output.
 *
 * Reference parameters p = 0.008, q = 0.30 represent a realistic mid-green
 * digital financial product: moderate paid/owned awareness pull (p) and
 * moderate credit-union-community word-of-mouth (q). These sit comfortably
 * within the realism-indicator green zone for both dimensions.
 *
 * @param {object} inputs   Merged inputs — uses tam, samPct, digitalAttrition*
 * @param {number} [p=0.008]  Reference innovation coefficient
 * @param {number} [q=0.30]   Reference imitation coefficient
 * @returns {{ m12Target: number, m36Target: number, m60Target: number }}
 */
export function suggestMilestones(inputs, p = 0.008, q = 0.30) {
  const sam = inputs.tam * (inputs.samPct / 100);
  const bassGrossCurve = computeBassCurve(p, q, sam);
  const { a12, a36, a60 } = simulateNetActiveAll(bassGrossCurve, inputs);

  // Round each milestone based on its own magnitude so that m12 (which is always
  // a small number) gets finer rounding than m36/m60. A uniform SAM-based increment
  // would round m12 to the nearest 500, inflating it by 15–25% and creating
  // artificial tension in the realism indicator.
  return {
    m12Target: roundByMagnitude(a12),
    m36Target: roundByMagnitude(a36),
    m60Target: roundByMagnitude(a60),
  };
}

/**
 * Derives Month 12 and Month 36 targets that are proportionally consistent
 * with a user-specified Month 60 goal, using the same reference Bass shape as
 * suggestMilestones (p = 0.008, q = 0.30 by default).
 *
 * calibrateAcquisition's optimizer fits p/q against all three milestone
 * targets simultaneously (weighted 3/2/1). If m12Target and m36Target are
 * left at stale, unrelated values while only m60Target changes, the optimizer
 * is forced to compromise between mutually inconsistent objectives — this can
 * produce a curve where m12/m36 projections move in the OPPOSITE direction of
 * an increased m60Target. Scaling m12/m36 proportionally to the new m60Target
 * (same reference-curve shape, just rescaled) keeps all three objectives
 * mutually consistent, so the optimizer converges on a single coherent curve.
 *
 * @param {object} inputs      Merged inputs — uses tam, samPct, digitalAttrition*
 * @param {number} m60Target   The user's new Month 60 goal
 * @param {number} [p=0.008]   Reference innovation coefficient
 * @param {number} [q=0.30]    Reference imitation coefficient
 * @returns {{ m12Target: number, m36Target: number, m60Target: number }}
 */
export function deriveMilestonesForM60Target(inputs, m60Target, p = 0.008, q = 0.30) {
  const sam = inputs.tam * (inputs.samPct / 100);
  const bassGrossCurve = computeBassCurve(p, q, sam);
  const { a12, a36, a60 } = simulateNetActiveAll(bassGrossCurve, inputs);

  if (a60 <= 0) {
    return { m12Target: 0, m36Target: 0, m60Target };
  }

  return {
    m12Target: roundByMagnitude(m60Target * (a12 / a60)),
    m36Target: roundByMagnitude(m60Target * (a36 / a60)),
    m60Target,
  };
}

/**
 * Computes the six "Model Health" instrument values — derived from current
 * inputs and the selected institution. Used by ModelHealthPanel to let the
 * user verify inputs are producing a plausible model before running the
 * simulation.
 *
 * All values are returned as raw numbers (not formatted). Callers are
 * responsible for display formatting and color-coding thresholds.
 *
 * @param {object} inputs       Merged DEFAULT_INPUTS + user overrides
 * @param {object} institution  Selected institution from ncua_model_data.json
 * @returns {{
 *   servicingSavingsPerMemberYr: number,   // $/member/yr — target $90–150
 *   ratePremiumPerMemberYr: number,        // $/member/yr — reference value
 *   monthlyNIIper1000: number,             // $/mo at 1,000 members
 *   monthlyRatePremiumPer1000: number,     // $/mo at 1,000 members
 *   niiCoverageRatio: number|null,         // null when rate premium is zero
 *   annualCannibDragScenarioB: number,     // $/yr institution-level Scenario B drag
 *   cannibDragAsPctOfNII: number|null,     // null when institution nim_pct missing
 * }}
 */
export function computeModelHealth(inputs, institution) {
  // 1. Effective servicing savings per member per year.
  //    Formula from PROJECT_BRIEF §Servicing Cost:
  //    savings = maintenanceTrad − maintenanceDigital
  //              + tellerTxns/yr × transactionCostTrad
  //              − platformCost − fraudCost − branchVisitSubsidy
  //    At defaults: 250 − 95 + (4 × $4.50) − $35 − $15 − $20 = $103/yr
  const branchVisitSubsidy = inputs.freeVisits * inputs.costPerBranchVisit;
  const servicingSavingsPerMemberYr =
    inputs.maintenanceTrad - inputs.maintenanceDigital
    + inputs.avgTellerTransactionsPerMonth * 12 * inputs.transactionCostTrad
    - inputs.platformCost
    - inputs.fraudCost
    - branchVisitSubsidy;

  // 2. Rate premium cost per member per year (deposit rate bump + loan rate cut).
  const ratePremiumPerMemberYr =
    inputs.avgDepositBalance * (inputs.rateBump / 10000)
    + inputs.avgLoanBalance * inputs.loanPenetrationRate * (inputs.rateCut / 10000);

  // 3. Monthly gross NII per 1,000 digital members.
  //    Uses hybrid_nim_p50 — same proxy as computeNIIContribution.
  const monthlyNIIper1000 =
    1000 * inputs.avgDepositBalance * (institution.hybrid_nim_p50 / 100) / 12;

  // 4. Monthly rate premium cost per 1,000 digital members (annualised ÷ 12).
  const monthlyRatePremiumPer1000 = ratePremiumPerMemberYr * 1000 / 12;

  // 5. NII coverage ratio: how many times does NII cover the rate premium?
  //    Null when rate premium is zero (infinite coverage — not useful to display).
  //    Target > 3×; below 1.5× is a red flag.
  const niiCoverageRatio =
    monthlyRatePremiumPer1000 > 0
      ? monthlyNIIper1000 / monthlyRatePremiumPer1000
      : null;

  // 6. Annual cannibalization drag — Scenario B.
  //    Mirrors computeCannibalCost × 12 (annual, not monthly).
  //    Also expressed as a fraction of the institution's current annual NII.
  const existingShares = institution.assets_b * 1e9 * 0.85;
  const existingLoans  = institution.assets_b * 1e9 * 0.65;
  const annualCannibDragScenarioB =
    existingShares * inputs.depositCannibRateB * (inputs.rateBump / 10000)
    + existingLoans  * inputs.loanCannibRateB   * (inputs.rateCut  / 10000);

  const institutionAnnualNII =
    institution.nim_pct != null
      ? institution.assets_b * 1e9 * (institution.nim_pct / 100)
      : null;

  const cannibDragAsPctOfNII =
    institutionAnnualNII != null && institutionAnnualNII > 0
      ? annualCannibDragScenarioB / institutionAnnualNII
      : null;

  // 7. Net per-member economics (savings − rate premium).
  //    Positive = the servicing efficiency gains outweigh the rate concessions
  //    before NII is counted. Target > $0; sustained negative is a red flag.
  const netPerMemberYr = servicingSavingsPerMemberYr - ratePremiumPerMemberYr;

  return {
    servicingSavingsPerMemberYr,
    ratePremiumPerMemberYr,
    netPerMemberYr,
    monthlyNIIper1000,
    monthlyRatePremiumPer1000,
    niiCoverageRatio,
    annualCannibDragScenarioB,
    cannibDragAsPctOfNII,
  };
}

/**
 * Returns the first month number where cumulativeNetContribution >= 0, or null.
 */
export function findBreakEven(months) {
  const found = months.find((m) => m.cumulativeNetContribution >= 0);
  return found ? found.month : null;
}

/**
 * Runs the 60-month member accumulation loop for a single market stream.
 * Does NOT apply cannibalization — that is applied once at the combined level
 * in runSimulation so it is never double-counted across streams.
 *
 * @param {object} institution   Selected institution
 * @param {object} inputs        Stream-specific inputs (expansion or footprint)
 * @param {number[]} bassGrossCurve  60-element array from computeBassCurve
 * @returns {object[]}  60-element array of per-month stream economics
 */
function runStream(institution, inputs, bassGrossCurve) {
  const months = [];
  let totalActiveMembers = 0;

  for (let m = 1; m <= 60; m++) {
    const attrition = (m <= 12 ? inputs.digitalAttritionYear1 : inputs.digitalAttritionSteadyState) / 12;
    const newMembersGross = bassGrossCurve[m - 1];
    totalActiveMembers = totalActiveMembers * (1 - attrition) + newMembersGross;

    const cpa = computeCPA(m, inputs);
    months.push({
      newMembersGross,
      totalActiveMembers,
      cpa,
      monthlyAcquisitionSpend:    newMembersGross * cpa,
      monthlyRatePremiumCost:     computeRatePremiumCost(totalActiveMembers, inputs, m),
      monthlyServicingCostSavings: computeServicingDelta(totalActiveMembers, inputs),
      monthlyGrossNII:            computeNIIContribution(totalActiveMembers, inputs, institution),
    });
  }

  return months;
}

/**
 * Run the full 60-month simulation, optionally blending a second inside-footprint
 * stream for Scenario B.
 *
 * @param {object} institution      Selected institution from ncua_model_data.json
 * @param {object} inputs           Merged DEFAULT_INPUTS + user overrides (expansion market)
 * @param {string} scenario         "scenario_a" | "scenario_b"
 * @param {object|null} footprintInputs  Merged footprint inputs; only used when
 *                                       scenario === "scenario_b". Pass null to run
 *                                       single-stream (current behaviour for Scenario A).
 * @returns {{ months, calibration, footprintCalibration }}
 *   footprintCalibration is null when footprintInputs is not provided.
 */
export function runSimulation(institution, inputs, scenario, footprintInputs = null) {
  // ── Expansion market stream ──────────────────────────────────────────────────
  const calibration    = calibrateAcquisition(inputs);
  // Use effectiveInputs so runStream applies rate-incentive-adjusted attrition
  const expansionStream = runStream(institution, calibration.effectiveInputs, calibration.bassGrossCurve);

  // ── Optional inside-footprint stream (Scenario B only) ──────────────────────
  const hasFootprint = footprintInputs !== null && scenario === "scenario_b";
  let footprintCalibration = null;
  let footprintStream      = null;

  if (hasFootprint) {
    footprintCalibration = calibrateAcquisition(footprintInputs);
    footprintStream      = runStream(institution, footprintCalibration.effectiveInputs, footprintCalibration.bassGrossCurve);
  }

  // ── Blend streams + apply cannibalization once ───────────────────────────────
  const months = [];
  let cumulativeAcquisitionSpend = 0;
  let cumulativeNetContribution  = 0;
  let cumulativeCannibalDrag     = 0;

  for (let m = 1; m <= 60; m++) {
    const exp  = expansionStream[m - 1];
    const foot = hasFootprint ? footprintStream[m - 1] : null;

    const totalActiveMembers      = exp.totalActiveMembers      + (foot ? foot.totalActiveMembers      : 0);
    const monthlyAcquisitionSpend = exp.monthlyAcquisitionSpend + (foot ? foot.monthlyAcquisitionSpend : 0);
    const monthlyRatePremiumCost  = exp.monthlyRatePremiumCost  + (foot ? foot.monthlyRatePremiumCost  : 0);
    const monthlyServicingCostSavings = exp.monthlyServicingCostSavings + (foot ? foot.monthlyServicingCostSavings : 0);
    const monthlyGrossNII         = exp.monthlyGrossNII          + (foot ? foot.monthlyGrossNII          : 0);

    // Cannibalization is institution-level, applied once regardless of stream count
    const cannibal = computeCannibalCost(institution, inputs, scenario);
    const monthlyCannibalizationCost = cannibal.depositCannibalizationCost + cannibal.loanCannibalizationCost;

    cumulativeAcquisitionSpend += monthlyAcquisitionSpend;

    const monthlyNetContribution =
      - monthlyAcquisitionSpend
      - monthlyRatePremiumCost
      - monthlyCannibalizationCost
      + monthlyServicingCostSavings
      + monthlyGrossNII;

    cumulativeNetContribution += monthlyNetContribution;
    cumulativeCannibalDrag    += monthlyCannibalizationCost;

    months.push({
      month: m,

      // Acquisition — combined totals + per-stream breakdown
      newMembersGross: Math.round(exp.newMembersGross + (foot ? foot.newMembersGross : 0)),
      newMembersActive: Math.round(
        exp.newMembersGross * (1 - inputs.digitalAttritionYear1) +
        (foot ? foot.newMembersGross * (1 - footprintInputs.digitalAttritionYear1) : 0)
      ),
      totalActiveMembers:           Math.round(totalActiveMembers),
      totalActiveMembersExpansion:  Math.round(exp.totalActiveMembers),
      totalActiveMembersFootprint:  foot ? Math.round(foot.totalActiveMembers) : 0,
      cpa: Math.round(exp.cpa),   // expansion CPA shown as primary
      monthlyAcquisitionSpend:      Math.round(monthlyAcquisitionSpend),
      cumulativeAcquisitionSpend:   Math.round(cumulativeAcquisitionSpend),
      samPenetrationPct: calibration.sam > 0
        ? Math.min(1, exp.totalActiveMembers / calibration.sam) : 0,
      footprintSamPenetrationPct: footprintCalibration?.sam > 0
        ? Math.min(1, (foot?.totalActiveMembers ?? 0) / footprintCalibration.sam) : 0,

      // Economics
      monthlyRatePremiumCost:       Math.round(monthlyRatePremiumCost),
      monthlyCannibalizationCost:   Math.round(monthlyCannibalizationCost),
      depositCannibalizationCost:   Math.round(cannibal.depositCannibalizationCost),
      loanCannibalizationCost:      Math.round(cannibal.loanCannibalizationCost),
      monthlyServicingCostSavings:  Math.round(monthlyServicingCostSavings),
      monthlyGrossNII:              Math.round(monthlyGrossNII),
      monthlyNetContribution:       Math.round(monthlyNetContribution),
      cumulativeNetContribution:    Math.round(cumulativeNetContribution),
      cumulativeCannibalDrag:       Math.round(cumulativeCannibalDrag),
      isBreakEvenMonth: false,
    });
  }

  const breakEvenMonth = findBreakEven(months);
  if (breakEvenMonth !== null) {
    months[breakEvenMonth - 1].isBreakEvenMonth = true;
  }

  return { months, calibration, footprintCalibration };
}
