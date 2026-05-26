# Digital Banking Expansion Model — Project Brief

---

## Project Scope

This project is divided into two phases:

**Phase 1 (this brief):** Build the data model and interactive simulation — institution selection, animated scenario modeling, benchmarking against the hybrid cohort, and scenario outputs.

**Phase 2 (separate brief):** Build out the product strategy layer — specific product line design, segment targeting, and feature differentiation. Product design details are intentionally excluded here as they will evolve through a separate design process.

---

## Purpose

This is a portfolio project demonstrating strategic thinking in financial services product design, combined with data-driven modeling built on real NCUA regulatory data. The deliverable is a publicly accessible web application that allows users to watch an animated simulation of the economics of launching a "digital-only" product line at a credit union — playing out month by month over a 60-month (5-year) horizon.

The intended audience is financial services professionals and potential employers, published via LinkedIn. Usage will be low-volume. The app must be polished, captivating, and reflect product and analytical depth. The primary design goal is that even a busy executive who spends 90 seconds with it walks away having learned something and wanting to try a different variable.

---

## Product Strategy Context

### The Core Concept

A hypothetical regional credit union wants to expand its market share, potentially outside its current geographic branch footprint. The strategy creates two parallel product categories:

**Digital category** — Members bank entirely digitally: mobile deposit, digital statements, app-based service. ATM access is not considered a branch service and is available to all members. In exchange for a digital-first experience, Digital members receive:
- Higher rates on deposit products
- Lower rates on loan products
- Enhanced digital features
- Up to 4 free branch visits per year (bridge for occasional in-person needs or geographic transitions)

**Universal category** — Members have unlimited access to branches and all in-person services, plus full digital access. Standard rates apply.

### Geographic Deployment Model (User-Selectable)

The model supports two deployment scenarios presented as a prominent choice before the simulation runs — two large clickable cards, not a buried setting:

**Scenario A — Expansion Markets Only**
Digital products offered exclusively outside the current branch footprint. Cannibalization is slow-building: only affects members who relocate or discover the product through marketing spillover. Lower early risk, slower path to scale.

**Scenario B — All Markets**
Digital products offered everywhere, including existing branch markets. Cannibalization is immediate and front-loaded — rate-sensitive existing members migrate from day one. Higher early margin pressure, but directly competes to retain members who would otherwise leave for national digital banks.

**The cannibalization difference between these two scenarios is one of the most important things the simulation communicates.** It should be viscerally visible in the animation — see Visualization section.

### The 4 Branch Visits Bridge

Digital members receive up to 4 free branch visits per year. Model as:
```
branch_visit_subsidy = min(avg_actual_visits, 4) × cost_per_branch_visit
```
Default `cost_per_branch_visit`: $5. User-adjustable.

---

## Data Architecture

### Source

NCUA 5300 Call Report, Q4 2025 (December 31, 2025). Publicly available quarterly regulatory filing for all federally insured credit unions.

### Data File

**Filename:** `ncua_model_data.json`
**Size:** ~620KB
**Location:** `/public/ncua_model_data.json` — ships with the app, consumed client-side, no backend needed.

### File Structure

```json
{
  "metadata": { ... },
  "hybrid_benchmark": { ... },
  "target_summary": { ... },
  "institutions": [ ... ]
}
```

#### `metadata`
```json
{
  "source": "NCUA 5300 Call Report Q4 2025",
  "generated": "2025-12-31",
  "total_institutions": 462,
  "target_count": 441,
  "benchmark_count": 17,
  "excluded_count": 4,
  "digital_intensity_thresholds": {
    "very_digital": "100K+ members/branch",
    "digital_leaning": "50K-100K members/branch",
    "hybrid": "20K-50K members/branch (benchmark cohort)",
    "branch_balanced": "10K-20K members/branch",
    "branch_heavy": "under 10K members/branch"
  }
}
```

#### `hybrid_benchmark`
17-institution reference cohort representing credit unions that have achieved a hybrid digital/branch model. Named institutions include Digital FCU, Connexus, Police & Fire, Pennsylvania State Employees, Municipal CU, General Electric CU, and others.

```json
{
  "label": "Hybrid benchmark cohort (20K–50K members/branch)",
  "count": 17,
  "institutions": ["DIGITAL FCU", "CONNEXUS", "POLICE & FIRE", ...],
  "metrics": {
    "opex_per_member":      { "p25": 317,   "median": 430,   "p75": 582   },
    "occupancy_per_member": { "p25": 12,    "median": 17,    "p75": 20    },
    "nim_pct":              { "p25": 2.2,   "median": 2.7,   "p75": 3.8   },
    "roa_pct":              { "p25": 0.3,   "median": 0.6,   "p75": 0.8   },
    "dividend_rate_pct":    { "p25": 1.0,   "median": 1.8,   "p75": 2.4   },
    "members_per_branch":   { "p25": 24153, "median": 26911, "p75": 32303 },
    "members_per_fte":      { "p25": 461,   "median": 578,   "p75": 699   }
  }
}
```

#### `target_summary`
Same distributions across all 441 target institutions (branch-balanced + branch-heavy). Represents today's market baseline.

#### `institutions` array
458 records (441 target + 17 hybrid), 42 fields each.

**Identity fields:** `CU_NUMBER`, `CU_NAME` (title-case for display), `STATE`, `CITY`, `assets_b`, `members`, `branch_count`, `ft_employees`, `pt_employees`, `fte_equiv`

**Per-member operating costs ($/member/yr):** `opex_per_member`, `comp_per_member`, `occupancy_per_member`, `office_ops_per_member`, `loan_svc_per_member`, `professional_per_member`, `marketing_per_member`

**Revenue & profitability:** `interest_yield_pct`, `dividend_rate_pct`, `fee_income_pct`, `nonint_income_pct`, `nim_pct`, `roa_pct`, `net_worth_ratio` ⚠️ divide by 100 for display

**Efficiency:** `members_per_fte`, `members_per_branch`

**Raw totals:** `total_opex`, `total_occupancy`, `total_comp`, `total_net_income`

**Segmentation & gap analysis:** `digital_intensity`, `member_gap_to_hybrid`, `branch_surplus_vs_hybrid`, `opex_gap_vs_hybrid_median`, `occupancy_gap_vs_hybrid_median`

**Hybrid benchmarks (embedded on every row):** `hybrid_opex_p50`, `hybrid_opex_p25`, `hybrid_opex_p75`, `hybrid_occupancy_p50`, `hybrid_nim_p50`, `hybrid_roa_p50`, `hybrid_div_rate_p50`

### Known Data Quirks
- `net_worth_ratio` divide by 100 for display (raw ~1000–1200 = 10–12%)
- SELF-HELP (NC): net worth ratio ~2606 — legitimate CDFI outlier
- GREATER NEVADA: net worth ratio ~456 — possible filing anomaly
- Institution names are all-caps as filed; title-case for display

---

## Model Variables

### Scenario Control

| Variable | Type | Default | Notes |
|----------|------|---------|-------|
| Geographic deployment | Toggle | Expansion only | Large card selection before simulation |
| Free branch visits / yr (digital) | Number | 4 | |
| Cost per branch visit | $ | $5 | |

### Strategy Levers (Primary UI — four segmented controls)

The primary interface exposes four high-level levers. Each maps to underlying variables. Non-technical users interact only with these. Full variable access is available in Advanced Settings.

| Lever | Positions | Controls |
|-------|-----------|---------|
| **Market Competitiveness** | Low / Medium / High | Initial CPA, Steady-State CPA, Months to Reach Steady-State |
| **Rate competitiveness** | Conservative / Moderate / Aggressive | Deposit rate bump, loan rate cut, rate decay |
| **Target member profile** | Mass market / Balanced / Upmarket | Avg deposit balance, loan penetration, avg loan balance |

> **Note:** The Acquisition aggression and Market opportunity levers from the original design have been replaced by the Bass model acquisition inputs. Market Competitiveness is the primary acquisition lever. The Bass model's p and q parameters are fitted automatically from the milestone targets — they are outputs of the calibration, not user inputs.

### Advanced Settings Variables (full detail)

These are all exposed in the Advanced Settings panel with default values, source citations, and help text. The panel groups inputs into five sections. For each input, the UI displays the current numeric value, the source/evidence, and a brief explanation of what changing it does to the model output.

#### Acquisition

The acquisition model uses two **independent curves** that interact only at the monthly spend output:

- **Member growth** — a Bass diffusion model that describes how adoption spreads through the Serviceable Addressable Market over time, calibrated to user-specified milestones.
- **CPA decay** — a logistic sigmoid that describes how cost per acquired member falls from a high early-market level to a stable steady-state as referrals and brand recognition grow.

**Monthly acquisition spend = new members acquired (Bass) × CPA at that month (logistic).**
Keeping the curves independent makes the model easier to audit, explain, and adjust independently.

##### Market Definition

| Variable | Unit | Default | Notes |
|----------|------|---------|-------|
| Market name / geography | text label | "Expansion Market" | Label only — appears in chart headers and summary outputs |
| Total Addressable Market (TAM) | households | 500,000 | All households in the target geography |
| SAM as % of TAM | % | 40% | Serviceable fraction: households that are eligible, reachable, and creditworthy. Derived SAM in households is displayed alongside but not directly editable. |

**Derived and displayed (not editable):** SAM (households) = TAM × (SAM% / 100)

##### Membership Milestones (targets-in, budget-out)

Milestones are expressed as **net active members** — gross members acquired minus attrition to date. This means milestone calibration is coupled to the Retention inputs: changing year-1 attrition affects how many gross members must be acquired to hit a given active target.

| Variable | Unit | Default | Notes |
|----------|------|---------|-------|
| Target active members — Month 12 | members | 3,000 | First-year milestone |
| Target active members — Month 36 | members | 12,000 | Mid-term milestone |
| Target active members — Month 60 | members | 22,000 | Five-year milestone |

**Calibration approach:** Both Bass model parameters — p (innovation / external marketing influence) and q (imitation / word-of-mouth) — are free. The optimizer finds the (p, q) pair that minimizes weighted squared error across all three milestones simultaneously, with M60 weighted most heavily (it is the primary planning horizon), M36 second, M12 third:

```
minimize: 3·(active(60) − M60)² + 2·(active(36) − M36)² + 1·(active(12) − M12)²
over: p ∈ [0.001, 0.05],  q ∈ [0.05, 0.80]
```

The fitted (p, q) values are not user-visible inputs — they are outputs fed into the Realism Indicator. The model makes no promise of hitting all three milestones exactly; the gap between predicted and target at each milestone is reported and interpreted as signal.

**Validation flags displayed inline with each milestone:**

| Condition | Flag | Message |
|-----------|------|---------|
| M12 / SAM > 20% | ⚠ Yellow | Unusually high first-year penetration for a new market entrant |
| M36 / SAM > 40% | ⚠ Yellow | Very aggressive mid-term penetration |
| M60 / SAM > 70% | ⚠ Yellow | Near-saturation implied — consider expanding SAM definition |
| M36 < M12 or M60 < M36 | ✗ Red | Milestones must be non-decreasing |
| Any milestone > SAM | ✗ Red | Target exceeds Serviceable Addressable Market |

##### Acquisition Economics

| Variable | Unit | Default | Evidence | Notes |
|----------|------|---------|----------|-------|
| Initial CPA | $ / active member | $450 | Cornerstone Advisors: new-market CU CAC $200–400; expansion markets at or above top of range. Digital-first launch overhead and low brand recognition push costs to the high end. | Cost per active member in the early market, before referral networks and brand recognition build. "Active" denominator accounts for early-cohort attrition — acquiring 100 people of whom 20 churn in month 1 means the effective CPA on the 80 who stay is higher than the nominal spend suggests. |
| Steady-State CPA | $ / active member | $75 | Organic and referral-driven acquisition cost once product is established. | Floor CPA in mature market where word-of-mouth reduces marketing dependency. |
| Months to Reach Steady-State | months | 24 | Typical brand-building horizon for a regional digital product launch. | The CPA logistic decay curve reaches ≈ Steady-State CPA at this month. Controls both the inflection point (at half this value) and the steepness of the middle decline. |
| Market Competitiveness | Low / Medium / High | Medium | — | Applies a preset overlay to the three fields above immediately. User can then fine-tune individual fields independently. |

**Market Competitiveness presets** — applied immediately when the toggle changes:

| Setting | Initial CPA | Steady-State CPA | Months to Steady-State | Character |
|---------|------------|-----------------|----------------------|-----------|
| Low | $300 | $50 | 18 | Light competition; brand builds quickly, costs fall fast |
| Medium | $450 | $75 | 24 | Typical regional market |
| High | $650 | $110 | 36 | Heavy competition; costs stay elevated longer, CPA declines slowly |

**CPA decay formula (logistic sigmoid):**
```
CPA(t) = steadyStateCPA + (initialCPA − steadyStateCPA) / (1 + e^(k × (t − t_mid)))

where:
  t_mid = monthsToSteadyState / 2     // inflection point — steepest decline here
  k     = 8 / monthsToSteadyState     // steepness; ~95% of decay occurs within the target window
```

This produces the shape described: CPA lingers high in early months (market is unknown), accelerates downward through the middle period (referrals kick in), and tapers toward Steady-State. The logistic sigmoid is preferred over the Bass model for CPA decay because CPA is a cost phenomenon driven by diminishing marketing returns, not an adoption diffusion phenomenon — the parameterization maps directly to observable inputs (floor, ceiling, inflection timing).

#### Deposits
| Variable | Unit | Default | Evidence | Help text |
|----------|------|---------|----------|-----------|
| Avg deposit balance — digital | $ | $18,000 | FDIC consumer survey / Fed Survey of Consumer Finances: median checking + savings balance for primary banking households ~$15–22K. Upmarket skews to $35K; mass market to $8K. | Average combined deposit balance per digital member. This is the balance that earns NII for the institution and determines the cost of the rate premium. |
| Rate bump — digital deposits | bps | 50 | Competitive analysis: digital-first CUs (Digital FCU, Connexus) and neobanks (SoFi, Ally) typically offer 40–80 bps above local branch rates on savings/money market. | How many basis points above the standard rate digital members earn on deposits. This is the primary lever for attracting rate-sensitive members but costs the institution money. |
| Rate premium decay | bps / year | 10 | As competitors respond, the institution's rate advantage narrows. 10 bps/year is gradual — assumes a 5-year window before parity. | How quickly the rate premium erodes annually. At 10 bps/year, a 50 bps advantage becomes 0 bps at year 5. |
| Deposit cannibalization rate — Scenario A | % of existing deposits / yr | 0.5% | No clean public benchmarks; directionally conservative — only affects members who relocate or encounter the product through marketing spillover. | In Expansion-only scenario, the fraction of the institution's existing deposit book that migrates to digital rates each year. Applied as a fixed annual drag. |
| Deposit cannibalization rate — Scenario B | % of existing deposits / yr | 5.0% | 10× Scenario A; represents rate-sensitive existing members migrating immediately when offered digital rates in their own market. Most assumption-dependent figure in the model. | In All-Markets scenario, the fraction of existing deposits that reprices upward from day one. The dominant driver of early negative cash flow in Scenario B. |

#### Loans
| Variable | Unit | Default | Evidence | Help text |
|----------|------|---------|----------|-----------|
| Loan penetration rate | % of digital members | 40% | Typical CU member loan participation rate is 30–50%. Digital-only members are somewhat self-selected for financial engagement. | Fraction of digital members who carry a loan with the institution. |
| Avg loan balance — digital borrowers | $ | $22,000 | Consistent with NCUA average auto loan + personal loan mix. | Average outstanding loan balance per borrowing digital member. |
| Rate cut — digital loans | bps | 25 | Digital CUs typically offer 20–40 bps below standard personal loan/auto rates as a digital-first member benefit. | How many basis points below standard rates digital members pay on loans. This costs the institution net interest income. |
| Loan cannibalization rate — Scenario A | % of existing loans / yr | 0.3% | Proportional to deposit cannibalization but lower — loan repricing requires active refinancing, which is slower than deposit migration. | In Expansion-only, fraction of existing loan book that reprices downward each year. |
| Loan cannibalization rate — Scenario B | % of existing loans / yr | 3.0% | 10× Scenario A. Existing members with loans who migrate to digital accounts will seek to reprice. | In All-Markets, fraction of existing loans that reprices downward from day one. |

#### Servicing Cost

The key derived output from this section is **effective servicing savings per digital member per year**, which should land in the $90–150 range. The NCUA-observed opex gap between hybrid and branch-heavy institutions is $148/member/year — this is the empirical ceiling.

```
savings_per_member_yr =
  (maintenanceTrad + tellerTxns×transactionCostTrad + digitalTxns×transactionCostDigital)
  − (maintenanceDigital + digitalTxns×transactionCostDigital + platformCost + fraudCost + branchVisitSubsidy)

= maintenanceTrad − maintenanceDigital
  + tellerTxns×transactionCostTrad
  − platformCost − fraudCost − branchVisitSubsidy
```

At defaults: 250 − 95 + (4 × $4.50) − 35 − 15 − 20 = **$103/yr** per member. This is the "savings engine" of the digital product.

| Variable | Unit | Default | Evidence | Help text |
|----------|------|---------|----------|-----------|
| Account maintenance — traditional | $ / member / yr | $250 | Fully-loaded: direct account ops ~$70 + allocated branch staff time ~$100 + customer service overhead ~$80. ABA/Filene published fully-loaded member cost: $200–340/yr. | The fully-loaded annual cost to serve a traditional member. Increasing this widens the savings opportunity from digital conversion. |
| Account maintenance — digital | $ / member / yr | $95 | Neobank operational benchmarks: digital account ops, compliance, basic self-serve customer service. | The fully-loaded annual cost to serve a digital-only member. |
| Transaction cost — traditional (teller) | $ / transaction | $4.50 | ABA Cost Study / Celent: branch/teller transactions $4–6 each. | Cost to the institution per teller transaction. |
| Transaction cost — digital | $ / transaction | $0.20 | Published range $0.08–0.25 across ACH, bill pay, mobile, debit. | Cost per digital transaction — applies equally to traditional and digital members since both use digital channels. |
| Avg teller transactions / member / month | count | 0.33 (~4/yr) | Fed "How America Banks" (2021): average consumer visits a branch ~3–5 times per year. 1/3 per month = 4/yr. For a member *choosing* a digital product, actual usage is likely lower — this is institution-friendly. | Monthly teller visits per traditional member. This is the cost that disappears when a member goes digital. |
| Avg digital transactions / member / month | count | 18 | Total digital transaction volume (ACH, bill pay, mobile, debit). Consistent with consumer banking frequency data. Note: this cost is the same for both member types — it does NOT create savings by going digital. | Monthly digital transaction volume per member. At $0.20 each, this costs $43.20/yr and applies to both member types equally. |
| Digital platform infrastructure | $ / member / yr | $35 | Core banking platform + mobile app + API layer per digital member. | Per-member annual cost of the digital infrastructure — a new cost for digital-only members with no branch offset. |
| Digital fraud & ID verification | $ / member / yr | $15 | Digital-only members require more robust identity verification and fraud monitoring (no in-person ID checks). | Per-member annual cost of digital identity and fraud systems. |
| Cost per branch visit | $ / visit | $5 | Marginal cost of serving a digital member who uses their annual branch visit allowance. | Cost each time a digital member uses one of their 4 free annual branch visits. |
| Free branch visits / yr | count | 4 | Defined by the product strategy. | How many free branch visits per year digital members receive. Subsidy = min(actual visits, this number) × cost per visit. |

#### Retention
| Variable | Unit | Default | Evidence | Help text |
|----------|------|---------|----------|-----------|
| Traditional member annual attrition | % / yr | 6% | Typical CU member attrition is 4–8%/yr; 6% is mid-range. | Annual attrition for the institution's existing traditional member base. |
| Digital member year-1 attrition | % in yr 1 | 18% | SoFi, Chime, and other neobanks have referenced 15–25% first-year attrition for digital-only accounts in public disclosures. Early members churn before forming habits. | Higher first-year attrition for digital members reflects the acquisition funnel including some shoppers who don't stay. |
| Digital member steady-state attrition | % / yr after yr 1 | 7% | Slightly above traditional CU attrition (~4–6%). Digital-only accounts have less stickiness than primary banking relationships. | Annual attrition for digital members who survive year 1. |

### Input Interplay — Key Derived Values

Before the animation, the Advanced Settings panel should display these "live" derived values so the user can see the model's intermediate math at a glance. They update instantly when any input changes.

| Derived value | Formula | Healthy range |
|---------------|---------|---------------|
| Effective savings/member/yr | See servicing cost formula above | $90–150 (anchored to NCUA $148 gap) |
| Effective NII rate (proxy) | `hybrid_nim_p50` from selected institution | Displayed, not adjustable |
| Monthly NII per 1,000 digital members | `1000 × avgDepositBalance × hybrid_nim_p50/100 / 12` | Depends on institution |
| Monthly rate premium per 1,000 digital members | `1000 × (avgDepositBalance × rateBump/10000 + avgLoanBalance × penetrationRate × rateCut/10000) / 12` | Should be well below monthly NII |
| NII coverage ratio | Monthly NII ÷ Monthly rate premium cost (at 1,000 members) | Should exceed 3× for margin safety |
| Annual cannibalization drag — Scenario B | `assets_b × 1e9 × (0.85 × depositCannibRateB × rateBump/10000 + 0.65 × loanCannibRateB × rateCut/10000)` | Depends heavily on institution size |

### Institutional Context (pre-populated on institution selection)
`members`, `branch_count`, `opex_per_member`, `occupancy_per_member`, `nim_pct`, `digital_intensity`, `opex_gap_vs_hybrid_median`, `branch_surplus_vs_hybrid`

---

## Calculation Engine (`src/lib/model.js`)

**All logic lives in pure functions that return a 60-element array** — one object per month. The UI simply plays through this array. This keeps calculation logic completely independent of animation logic.

### Month object shape
```javascript
{
  month: 1,                           // 1–60

  // Acquisition
  newMembersGross: 512,               // gross new members this month (Bass curve derivative × SAM)
  newMembersActive: 420,              // gross new minus immediate early-cohort attrition
  totalActiveMembers: 420,            // cumulative net active (all cohorts minus attrition)
  cpa: 438,                           // effective CPA this month (logistic decay)
  monthlyAcquisitionSpend: 224256,    // newMembersGross × cpa
  cumulativeAcquisitionSpend: 224256,
  samPenetrationPct: 0.0021,          // totalActiveMembers / SAM

  // Economics (unchanged structure)
  monthlyRatePremiumCost: 14230,
  monthlyCannibalizationCost: 8940,   // deposit + loan combined
  depositCannibalizationCost: 5820,
  loanCannibalizationCost: 3120,
  monthlyServicingCostSavings: 6180,
  monthlyGrossNII: 19928,
  monthlyNetContribution: -238426,    // now includes monthlyAcquisitionSpend
  cumulativeNetContribution: -238426,
  cumulativeCannibalDrag: 8940,

  isBreakEvenMonth: false
}
```

### Key functions

**`calibrateAcquisition(inputs)`** — called once before the simulation loop; returns calibration results consumed by `runSimulation`
```
// Step 1: compute SAM
sam = inputs.tam * (inputs.samPct / 100)

// Step 2: define the weighted objective function
// active(t, p, q) = Bass gross adoption curve × sam, then apply attrition
// to get net active count at month t
weights = { 60: 3, 36: 2, 12: 1 }
loss(p, q) = sum over t in [12, 36, 60]:
               weights[t] × (simulateNetActive(p, q, sam, inputs, t) − inputs.targets[t])²

// Step 3: minimize loss over the search space using Nelder-Mead (or equivalent
// derivative-free optimizer). Starting point: p=0.01, q=0.30.
// Search bounds: p ∈ [0.001, 0.05],  q ∈ [0.05, 0.80]
{ p, q } = minimize(loss)

// Step 4: pre-compute the full 60-month Bass gross adoption curve
// Closed-form:  F(t) = (1 − e^(−(p+q)t)) / (1 + (q/p)·e^(−(p+q)t))
// newGross(t)   = max(0, (F(t) − F(t−1)) × sam)
bassGrossCurve[1..60] = computeBassCurve(p, q, sam)

// Step 5: compute milestone residuals (predicted − target, as % of target)
residuals = {
  12: (simulateNetActive(p, q, sam, inputs, 12) − inputs.m12Target) / inputs.m12Target,
  36: (simulateNetActive(p, q, sam, inputs, 36) − inputs.m36Target) / inputs.m36Target,
  60: (simulateNetActive(p, q, sam, inputs, 60) − inputs.m60Target) / inputs.m60Target,
}

// Step 6: compute realism indicator (see Realism Indicator spec below)
realismIndicator = assessRealism(p, q, residuals)

return { p, q, sam, bassGrossCurve, residuals, realismIndicator }
```

**Bass model reference ranges for digital financial products** (used by `assessRealism`):

| Parameter | Green (typical) | Yellow (ambitious) | Red (implausible) |
|-----------|----------------|-------------------|-------------------|
| p (innovation) | 0.003 – 0.020 | 0.020 – 0.040 | > 0.040 |
| q (imitation) | 0.15 – 0.45 | 0.45 – 0.65 | > 0.65 |
| Milestone residual | < 10% off | 10 – 25% off | > 25% off |

p reflects external marketing effectiveness; q reflects word-of-mouth strength. A regional CU launching a digital product with no existing brand outside its footprint will have low p. q in the 0.25–0.40 range is typical for consumer financial products with active referral programs.

**`computeCPA(month, inputs)`**
```
t_mid = inputs.monthsToSteadyState / 2
k     = 8 / inputs.monthsToSteadyState
return inputs.steadyStateCPA +
       (inputs.initialCPA − inputs.steadyStateCPA) / (1 + Math.exp(k * (month − t_mid)))
```

**`runSimulation(institution, inputs, scenario)`**
Calls `calibrateAcquisition(inputs)` first. The returned `bassGrossCurve` and `realismIndicator` are passed into the 60-month loop. Both scenarios are computed simultaneously so switching replays instantly without recalculation.

**`computeCannibalCost(month, institution, inputs, scenario)`**
```
// Scenario A: slow ramp, only relocating members
// Scenario B: immediate, applied to full existing member base from month 1
depositDrag = existingShares × cannibRateDeposit × (rateBump / 10000) / 12
loanDrag    = existingLoans  × cannibRateLoan   × (rateCut  / 10000) / 12
return { depositCannibalizationCost: depositDrag, loanCannibalizationCost: loanDrag }
```

**`computeServicingDelta(totalDigitalMembers, inputs)`**
```
// Traditional member incurs both teller and digital transaction costs
traditionalCost = maintenance_trad
                  + (avgTellerTransactionsPerMonth × 12 × transactionCostTrad)
                  + (avgDigitalTransactionsPerMonth × 12 × transactionCostDigital)
// Digital member eliminates teller transactions; gains platform/fraud/subsidy costs
digitalCost     = maintenance_digital
                  + (avgDigitalTransactionsPerMonth × 12 × transactionCostDigital)
                  + platformCost + fraudCost + branchVisitSubsidy
savingsPerMember = traditionalCost - digitalCost   // ~$103/yr; anchored to NCUA $148 gap
totalSavings     = totalDigitalMembers × savingsPerMember / 12  // returns monthly figure
```

**`computeRatePremiumCost(totalDigitalMembers, inputs, month)`**
```
effectiveBump = max(0, rateBump - (month × decayPerMonth))
depositIncome = avgDepositBalance × effectiveBump/10000 / 12
loanCost      = avgLoanBalance × penetrationRate × rateCut/10000 / 12
return (depositIncome + loanCost) × totalDigitalMembers
```

**`computeNIIContribution(totalDigitalMembers, inputs, institution)`**
```
// Proxy: hybrid_nim_p50 from institution record — median NIM of the hybrid cohort,
// reflecting earnings on a digitally-oriented member base. Superior to institution.nim_pct,
// which reflects traditional member economics.
// ratePremiumCost already deducts the incremental rate premium above this base, so no double-count.
monthlyGrossNII = totalDigitalMembers × avgDepositBalance × (institution.hybrid_nim_p50 / 100) / 12
```

**`findBreakEven(monthlyArray)`**
Returns the first month where `cumulativeNetContribution >= 0`, or null if not reached within 60 months.

---

## Acquisition Model Outputs

The following outputs are derived from the acquisition model and displayed in the Advanced Settings panel and summary dashboard alongside the main simulation outputs.

### Member Growth
| Output | Description |
|--------|-------------|
| Month-by-month active member count | `totalActiveMembers` from each month object |
| S-curve chart | Member growth plotted against SAM ceiling; M12/M36/M60 targets shown as markers; Bass model predicted values shown alongside — the gap between marker and curve is visible |
| SAM penetration % at milestones | `samPenetrationPct` at months 12, 36, 60 |
| Milestone residuals | Predicted vs. target at each milestone, shown as ± % |
| Input validation flags | Yellow/red flags if targets are structurally unrealistic (SAM breach, non-monotone) |

### Acquisition Cost
| Output | Description |
|--------|-------------|
| Month-by-month CPA | `cpa` from each month object — shows the logistic decay from Initial to Steady-State |
| Month-by-month marketing spend | `monthlyAcquisitionSpend` = gross members acquired × CPA |
| Annual marketing spend | Sum of monthly spend for Years 1–5 |
| Cumulative acquisition cost at milestones | `cumulativeAcquisitionSpend` at months 12, 36, 60 |

### Realism Indicator

Displayed prominently after calibration runs — this is one of the model's most distinctive outputs. It surfaces what the user's targets require in market-dynamics terms and whether those dynamics are plausible for a regional CU entering a new market.

Three components, each with a Green / Yellow / Red status:

**1. Model fit quality** — how closely does the best-fit Bass curve approximate the targets overall?
- Computed as the root mean squared residual across all three milestones, as % of M60 target
- Green: < 10% RMSE; Yellow: 10–25%; Red: > 25%
- A poor fit (Red) means no single Bass curve can plausibly reconcile the three milestones — the targets imply a growth shape that doesn't match how markets behave

**2. Parameter plausibility** — are the fitted p and q within observed ranges for digital financial product launches?
- p (innovation / external marketing): Green 0.003–0.020; Yellow 0.020–0.040; Red > 0.040
- q (imitation / word-of-mouth): Green 0.15–0.45; Yellow 0.45–0.65; Red > 0.65
- Status is the worse of the two parameter assessments
- Displayed with plain-English interpretation: e.g., "Your targets require word-of-mouth strength (q = 0.58) above typical for a regional financial product — achievable but requires an active referral program"

**3. Milestone tension** — which specific milestone is hardest to reconcile with the Bass curve shape?
- Shows the residual at each milestone: predicted vs. target as ± %
- Highlights the milestone with the largest gap
- Plain-English: e.g., "The Bass model predicts 9,400 active members at Month 36 vs. your target of 12,000 (+28%). Your mid-term target implies faster acceleration than your Year 1 and Year 5 targets suggest."

The overall Realism Indicator status is the worst of the three components. All three are shown — the executive sees the full picture, not just a single traffic light.

### Acquisition Summary (executive view)
| Metric | Source |
|--------|--------|
| Total active members at Month 60 | `totalActiveMembers[59]` |
| Total acquisition spend over 60 months | `cumulativeAcquisitionSpend[59]` |
| Average blended CPA over 60 months | Total spend ÷ total gross members acquired |
| SAM penetration at Month 60 | `samPenetrationPct[59]` |
| Combined chart | Member growth and monthly acquisition spend on dual axes — shows the investment-to-growth relationship as the curves separate when spend efficiency improves |

---

## Visualization

### Design Philosophy
The app is a **simulation that runs**, not a dashboard that displays. The primary interaction is: choose a scenario → adjust levers → hit Play → watch 36 months unfold. The goal is that an executive who spends 90 seconds with it walks away having learned something and wanting to change a variable.

### Layout

**Top section — Institution selector + scenario choice**
- Search/select institution (pre-populates institutional context)
- Two large cards: "Expansion Markets Only" vs "All Markets incl. Existing Branches"
- Brief plain-English description of what each means

**Middle section — Strategy levers**
Four segmented controls (Conservative / Moderate / Aggressive) with the market opportunity selector
"Advanced Settings" disclosure for full variable access

**Main stage — The simulation**
Full-width animated display. Play / Pause / Reset controls. Speed selector (1× / 2× / 4×).

**Bottom section — Post-simulation summary cards**

### The Main Stage Animation

**Hero element: Cumulative P&L curve**
A line that starts negative and curves upward. A traveling dot moves along it as the simulation plays. The moment the line crosses zero: the line turns green, a subtle pulse animation fires, a "Break-even reached — Month X" label appears. This is the moment the simulation is building toward.

**Cannibalization shadow**
A shaded area (muted red/amber) fills the space between the actual P&L curve and a ghosted "without cannibalization" line. This makes the cannibalization drag visible as a shape, not just a number. The shadow is noticeably wider and appears earlier in Scenario B (All Markets) than Scenario A (Expansion Only). When the user switches scenarios and replays, the difference in shadow behavior communicates the strategic tradeoff without words.

**Live counters (updating as simulation plays)**

| Counter | Color | Notes |
|---------|-------|-------|
| Digital members acquired | Neutral | Counting up |
| Cumulative acquisition spend | Red | Counting up |
| Cannibalization drag to date | Amber | Counting up; broken into deposit vs loan on hover |
| Cumulative net contribution | Red → Green | Turns green at break-even |
| Month / Year marker | Neutral | Scrubbing through time |

**Member cohort waterfall (secondary visualization)**
A stacked bar chart that builds month by month alongside the P&L curve. Three layers:
- New members acquired this month (bright)
- Members retained from prior months (mid)
- Members lost to attrition (shown as a downward notch)

This makes the compounding retention dynamic visible — early cohorts that survive become the stable foundation. It's the visual a financial services executive will recognize from their own board presentations.

**Market penetration indicator**
A simple arc or progress fill showing % of addressable market reached. Caps the growth story visually — the simulation slows as market saturation approaches.

### Post-Simulation Summary Cards
After the simulation completes (or is paused), four summary cards appear below the stage:

1. **Break-even** — Month X of 60 (or "Not reached within 5 years")
2. **10-year NPV per member** — $X,XXX net of acquisition and rate premium
3. **Cannibalization cost** — $X.XM total drag, split deposit vs loan
4. **OpEx savings potential** — $X.XM annually if hybrid benchmark density reached

### Scenario Comparison
After running a simulation, a "Compare Scenarios" button runs the other scenario and shows both P&L curves on the same chart simultaneously — one solid, one dashed. The gap between them across the 36 months is the total cost of the bolder strategy, visible as an area. Break-even points are marked on both lines.

---

## Technical Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | Next.js (React) | Component-based, Vercel-native |
| Styling | Tailwind CSS | Utility-first, fast iteration |
| Hosting | Vercel | Free tier, deploys from GitHub, permanent URL |
| Data | Client-side JSON | `/public/ncua_model_data.json` — no backend |
| Charts | Recharts | Clean React integration, supports animation |
| Animation | React state + requestAnimationFrame | Play through month array at controlled speed |
| State | React useState / useReducer | All in memory, no persistence needed |

### Repository Structure
```
/
├── public/
│   └── ncua_model_data.json
├── src/
│   ├── components/
│   │   ├── InstitutionSelector.jsx
│   │   ├── ScenarioCards.jsx          ← large card scenario toggle
│   │   ├── StrategyLevers.jsx         ← four primary sliders
│   │   ├── AdvancedSettings.jsx       ← full variable access, collapsed by default
│   │   ├── SimulationStage.jsx        ← main animated display
│   │   ├── PLCurve.jsx                ← hero chart with shadow
│   │   ├── CohortWaterfall.jsx        ← member cohort chart
│   │   ├── LiveCounters.jsx           ← animated counter display
│   │   ├── SummaryCards.jsx           ← post-simulation summary
│   │   └── ScenarioComparison.jsx     ← dual-scenario overlay
│   ├── lib/
│   │   └── model.js                   ← ALL calculation logic, pure functions
│   └── app/
│       └── page.jsx
├── PROJECT_BRIEF.md
└── README.md
```

---

## Build Order

### Phase 1 — Completed (Steps 1–8)

1. ✅ **Data foundation** — Load JSON, render institution count. Smoke test.
2. ✅ **Institution selector** — Search, filter, select. Log selected record to console.
3. ✅ **Institution profile card** — Display key metrics with hybrid benchmark alongside each.
4. ✅ **Benchmark comparison panel** — Selected institution vs hybrid p25/median/p75.
5. ✅ **Calculation engine** — Write and test all `model.js` functions. Verify 60-month array.
6. ✅ **Scenario toggle + lever UI** — Two deployment scenario cards, four strategy levers.
7. ✅ **Levers → inputs wiring** — Lever selections resolve to model inputs via `levers.js`, recalculate month array.
8. ✅ **Static simulation preview** — Month-60 final values displayed (members, cumulative net, break-even month).

---

### Phase 2 — Model Transparency & Input Calibration (Steps 9–13)

The outputs from Phase 1 are hard to trust or interpret without seeing the inputs that produced them. This phase builds full input visibility before the animation is layered on top. **Do not proceed to Phase 3 until these steps are complete and the model outputs pass the sanity checks in Step 13.**

**9. ✅ Advanced Settings panel — full input exposure**

Build `AdvancedSettings.jsx` as an expandable section below the strategy levers. When expanded, it shows every `DEFAULT_INPUTS` value as an editable numeric field, grouped into five sections: Acquisition, Deposits, Loans, Servicing Cost, and Retention.

- When a strategy lever is set (e.g., Acquisition Aggression = Aggressive), the inputs that lever controls should be **visually marked** in Advanced Settings (e.g., a subtle colored border or label like "Set by lever") showing the lever's current value. If the user edits that field directly, the field switches to "Custom" mode and the lever no longer controls it.
- Cannibalization inputs show both the Scenario A and Scenario B values side by side, since both are always visible.
- All fields accept numeric input; enforce reasonable min/max bounds without hard errors.
- Inputs wire back into `resolveInputs()` — the simulation recalculates live as the user types.

**10. ✅ Derived values display — "live math" panel**

Inside Advanced Settings (or immediately below the lever section), add a small "Model Health" panel showing the six derived values from the Input Interplay table above, computed from the current inputs:

- Effective servicing savings / member / yr (target: $90–150)
- Rate premium cost / member / yr (should be substantially less than NII)
- Monthly NII per 1,000 digital members
- Monthly rate premium cost per 1,000 digital members
- NII coverage ratio (NII ÷ rate premium; target: > 3×)
- Annual cannibalization drag — Scenario B (shown in $ and as % of institution's current NII)

These are the "instrument panel" — they let the user see whether their inputs produce a plausible model before running the simulation. Color-code them: green if in expected range, amber if borderline, red if implausible.

**11. ✅ Tabular simulation detail**

Replace the current "simulation preview" section with a compact table showing key fields at months 1, 6, 12, 24, 36, and 60:

| Month | Digital Members | Cumul. Acq. Spend | Monthly NII | Monthly Rate Premium | Monthly Cannibal. | Monthly Servicing Savings | Monthly Net | Cumul. Net |
|-------|----------------|-------------------|-------------|---------------------|-------------------|--------------------------|-------------|------------|

This is the primary debugging surface — it lets you trace the monthly math and spot if any component is implausibly large or small. Both scenarios (A and B) shown in separate rows or via a toggle.

**12. ✅ Evidence tooltips on every Advanced Settings input**

Add a `(?)` icon next to each input label. On hover/click, show a tooltip with:
- The source citation (from the evidence column in the Advanced Settings Variables table above)
- The calibration anchor (e.g., "At these defaults, effective savings = $103/yr/member, anchored to NCUA-observed $148 gap")
- What direction moving this input changes the output

This is what makes the model credible to a financial services audience — every number has a footnote.

**13. ✅ Calibration checkpoint — sanity checks before animation**

Verified against Robins Financial CU, GA ($4.79B assets, 271k members, NIM 3.44%, ROA 1.65%):

| Check | Target | Result | Status |
|-------|--------|--------|--------|
| Servicing savings / member | $90–150/yr | $103/yr | ✅ |
| NII coverage ratio | > 3× at 1,000 members | 5.17× | ✅ |
| Break-even month — Scenario A | ~month 18–36 | Month 19 | ✅ |
| Break-even month — Scenario B | Later than A by 6–12+ months | Month 30 (Δ = 11 months) | ✅ |
| Month-60 cumulative net — Scenario B | Positive; trajectory insight below | $13.6M (vs A: $13.85M) | ✅ |
| Cannibalization drag profile | Constant and non-zero monthly | A: $10,430/mo · B: $104,304/mo (flat) | ✅ |
| Attrition effect | Month-60 active < cumulative gross acquired | 15,001 active vs 17,169 gross (2,168 churned, 12.6%) | ✅ |

**Check 5 finding (Scenario A vs B trajectory):** The brief's original expectation of B being "materially lower" than A at month 60 was incorrect. The actual result is more nuanced: Scenario B starts significantly behind A (Month 1: −$94k/mo vs A), due to immediate cannibalization drag hitting before footprint members are acquired. By Month 36, B's monthly net has crossed over A (+$6k/mo) because footprint members arrive at $0 CPA with lower attrition and generate revenue that offsets the higher cannibalization. Over the full 60 months the cumulative nets are nearly equal ($13.6M vs $13.85M). The correct characterization is: **Scenario B has a worse early trajectory and a better late trajectory than Scenario A; the 5-year cumulative is roughly equivalent, not materially worse.**

---

### Phase 3 — Animation & Visualization (Steps 14–21)

These steps build on a model whose inputs and outputs you trust.

**14. Play animation engine**
- Add play / pause / reset controls and a speed selector (1× / 2× / 4×)
- Use `requestAnimationFrame` to step through the 60-month array at controlled speed
- Expose `currentMonth` as state; all visualizations read from `simulation[currentMonth - 1]`
- Both scenarios are already pre-computed; switching scenario replays instantly

**15. Live counters**
Animated number displays that update as `currentMonth` advances:
- Digital members (counting up)
- Cumulative acquisition spend (counting up, red)
- Cannibalization drag to date (counting up, amber; deposit vs loan breakdown on hover)
- Cumulative net contribution (red → green transition at break-even)
- Month / Year label

**16. P&L curve with break-even moment**
- Recharts `LineChart` that draws progressively as the simulation plays (data filtered to `slice(0, currentMonth)`)
- Y-axis spans the full range from min to max cumulative net
- When `isBreakEvenMonth` fires: line color transitions to green, a subtle radial pulse animation, "Break-even — Month X" label appears and stays

**17. Cannibalization shadow**
- Second line on the P&L chart: "without cannibalization" (cumulative net + cumulativeCannibalDrag)
- Fill the area between the two lines with a muted amber/red with low opacity
- Shadow is visibly wider and appears immediately in Scenario B vs. Scenario A — this is the key visual the brief is built around

**18. Cohort waterfall**
- Recharts `BarChart` (stacked) that builds alongside the P&L curve
- Three layers per month: new members acquired (bright), retained from prior months (mid), attrition (downward notch or negative stack)
- Advances month by month in sync with the P&L curve

**19. Market penetration indicator**
- Simple arc or radial progress showing `marketPenetrationPct`
- Updates as simulation plays; visually communicates market saturation approaching

**20. Post-simulation summary cards**
After the simulation completes (or at any point after it's been run), four cards appear below the stage:
1. Break-even — Month X of 60 (or "Not reached within 5 years")
2. 5-year cumulative net contribution — $X.XM
3. Cannibalization cost — $X.XM total drag, split deposit vs loan
4. OpEx savings potential — $X.XM annually if hybrid benchmark density reached (from institution's `opex_gap_vs_hybrid_median`)

**21. Scenario comparison**
A "Compare Scenarios" button that runs the other scenario (already pre-computed) and shows both P&L curves on the same chart simultaneously — one solid, one dashed. The shaded gap area between them is the total cost of the bolder strategy. Break-even months marked on both lines.

**22. Polish + deploy**
- Responsive layout verification at 375px (iPhone SE) per CLAUDE.md requirements
- Contrast audit against WCAG 2.1 AA per CLAUDE.md requirements
- Tooltips on all chart elements
- Edge cases: institution with very large assets (cannibalization dominates), institution already near hybrid density, market saturation within 5 years
- Vercel deployment from GitHub

---

## What This Project Demonstrates

1. **Strategic product thinking** — two-tier product strategy with segment analysis, gap identification, and risk assessment grounded in industry data
2. **Regulatory data fluency** — sourcing, processing, and extracting insight from NCUA 5300 call report data
3. **Financial modeling** — multi-variable customer economics model with real institutional benchmarks
4. **Technical execution** — production-quality animated web application deployed publicly
5. **Communication** — translating complex financial concepts into an experience accessible to non-technical stakeholders

---

*Data source: NCUA 5300 Call Report, Q4 2025. All figures reflect publicly available regulatory filings.*
