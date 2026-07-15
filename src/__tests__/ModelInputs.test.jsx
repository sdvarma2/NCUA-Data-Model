import { render, screen, fireEvent, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ModelInputs from "@/components/ModelInputs";
import {
  DEFAULT_INPUTS,
  MARKET_COMPETITIVENESS_PRESETS,
  calibrateAcquisition,
  computeCumulativeAcquisitionSpend,
} from "@/lib/model";
import { LEVER_PRESETS } from "@/lib/levers";

// Mirrors the local fmtDollars() convention used across the app's
// aggregate-dollar displays (SimulationTable.jsx, SimulationStage.jsx).
function fmtDollars(n) {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000)     return `$${Math.round(abs / 1_000)}k`;
  return `$${Math.round(abs)}`;
}

// Minimal inputs object so Card 1 can render without errors
const baseInputs = { ...DEFAULT_INPUTS };

// Schema-correct calibration mock, built on a real calibrateAcquisition()
// result (so bassGrossCurve/effectiveInputs stay valid for
// computeCumulativeAcquisitionSpend) with specific fields overridden where a
// test needs to force a particular projectedM60 / realismIndicator.overall.
function mockCalibration(overrides = {}) {
  const base = calibrateAcquisition(baseInputs);
  return {
    ...base,
    projectedM12: 1000,
    projectedM36: 5000,
    projectedM60: 15000,
    realismIndicator: {
      overall: "green",
      pStatus: "green",
      qStatus: "green",
      tensionStatus: "green",
      ...overrides.realismIndicator,
    },
    ...overrides,
  };
}

describe("ModelInputs", () => {
  describe("lever labels", () => {
    it("renders the Market Competitiveness lever", () => {
      render(<ModelInputs levers={{}} onChange={() => {}} inputs={baseInputs} />);
      expect(screen.getByText(/Market Competitiveness/i)).toBeInTheDocument();
    });

    it("renders the Rate Incentives lever", () => {
      render(<ModelInputs levers={{}} onChange={() => {}} inputs={baseInputs} />);
      expect(screen.getByRole("group", { name: /Rate Incentives/i })).toBeInTheDocument();
    });

    it("renders the Card 3 heading 'Rate Incentives'", () => {
      render(<ModelInputs levers={{}} onChange={() => {}} inputs={baseInputs} />);
      expect(screen.getByRole("heading", { name: /Rate Incentives/i })).toBeInTheDocument();
    });

    it("renders the Target Member Profile lever", () => {
      render(<ModelInputs levers={{}} onChange={() => {}} inputs={baseInputs} />);
      expect(screen.getByText(/Target Member Profile/i)).toBeInTheDocument();
    });

    it("renders the Market Size lever", () => {
      render(<ModelInputs levers={{}} onChange={() => {}} inputs={baseInputs} />);
      expect(screen.getByText(/Market Size/i)).toBeInTheDocument();
    });

    it("renders the Month 60 Member Goal input", () => {
      render(<ModelInputs levers={{}} onChange={() => {}} inputs={baseInputs} />);
      expect(screen.getByRole("spinbutton", { name: /month 60 member goal/i })).toBeInTheDocument();
    });

    it("renders the Card 1 heading 'Market & Goal'", () => {
      render(<ModelInputs levers={{}} onChange={() => {}} inputs={baseInputs} />);
      expect(screen.getByText(/Market & Goal/i)).toBeInTheDocument();
    });

    it("renders the Card 2 heading 'Acquisition Economics'", () => {
      render(<ModelInputs levers={{}} onChange={() => {}} inputs={baseInputs} />);
      expect(screen.getByText(/Acquisition Economics/i)).toBeInTheDocument();
    });
  });

  describe("lever options", () => {
    it("shows Low / Medium / High for Market Competitiveness", () => {
      render(<ModelInputs levers={{}} onChange={() => {}} inputs={baseInputs} />);
      const group = screen.getByRole("group", { name: /Market Competitiveness/i });
      expect(group).toHaveTextContent(/Low/i);
      expect(group).toHaveTextContent(/Medium/i);
      expect(group).toHaveTextContent(/High/i);
    });

    it("shows Conservative / Moderate / Aggressive for Rate Incentives", () => {
      render(<ModelInputs levers={{}} onChange={() => {}} inputs={baseInputs} />);
      const group = screen.getByRole("group", { name: /Rate Incentives/i });
      expect(group).toHaveTextContent(/Conservative/i);
      expect(group).toHaveTextContent(/Moderate/i);
      expect(group).toHaveTextContent(/Aggressive/i);
    });

    it("shows Mass Market / Balanced / Upmarket for Target Member Profile", () => {
      render(<ModelInputs levers={{}} onChange={() => {}} inputs={baseInputs} />);
      const group = screen.getByRole("group", { name: /Target Member Profile/i });
      expect(group).toHaveTextContent(/Mass Market/i);
      expect(group).toHaveTextContent(/Balanced/i);
      expect(group).toHaveTextContent(/Upmarket/i);
    });

    it("shows 150k / 500k / 2M for Market Size", () => {
      render(<ModelInputs levers={{}} onChange={() => {}} inputs={baseInputs} />);
      const group = screen.getByRole("group", { name: /Market Size/i });
      expect(group).toHaveTextContent(/150k/i);
      expect(group).toHaveTextContent(/500k/i);
      expect(group).toHaveTextContent(/2M/i);
    });

    it("renders the 'potential members' unit label for Market Size", () => {
      render(<ModelInputs levers={{}} onChange={() => {}} inputs={baseInputs} />);
      expect(screen.getByText(/potential members/i)).toBeInTheDocument();
    });
  });

  describe("default selections", () => {
    it("Market Competitiveness defaults to Medium (matches DEFAULT_INPUTS.initialCPA)", () => {
      render(<ModelInputs levers={{}} onChange={() => {}} inputs={baseInputs} />);
      const group = screen.getByRole("group", { name: /Market Competitiveness/i });
      const medium = Array.from(group.querySelectorAll("button")).find(
        b => /^medium$/i.test(b.textContent.trim())
      );
      expect(medium).toHaveAttribute("aria-pressed", "true");
    });

    it("Rate Incentives defaults to Moderate", () => {
      render(<ModelInputs levers={{}} onChange={() => {}} inputs={baseInputs} />);
      const group = screen.getByRole("group", { name: /Rate Incentives/i });
      const moderate = Array.from(group.querySelectorAll("button")).find(
        b => /^moderate$/i.test(b.textContent.trim())
      );
      expect(moderate).toHaveAttribute("aria-pressed", "true");
    });

    it("Target Member Profile defaults to Balanced", () => {
      render(<ModelInputs levers={{}} onChange={() => {}} inputs={baseInputs} />);
      const group = screen.getByRole("group", { name: /Target Member Profile/i });
      const balanced = Array.from(group.querySelectorAll("button")).find(
        b => /^balanced$/i.test(b.textContent.trim())
      );
      expect(balanced).toHaveAttribute("aria-pressed", "true");
    });

    it("Market Size defaults to 500k", () => {
      render(<ModelInputs levers={{}} onChange={() => {}} inputs={baseInputs} />);
      const group = screen.getByRole("group", { name: /Market Size/i });
      const fiveHundredK = Array.from(group.querySelectorAll("button")).find(
        b => /^500k$/i.test(b.textContent.trim())
      );
      expect(fiveHundredK).toHaveAttribute("aria-pressed", "true");
    });

    it("Month 60 goal input shows DEFAULT_INPUTS.m60Target", () => {
      render(<ModelInputs levers={{}} onChange={() => {}} inputs={baseInputs} />);
      const input = screen.getByRole("spinbutton", { name: /month 60 member goal/i });
      expect(input.value).toBe(String(DEFAULT_INPUTS.m60Target));
    });
  });

  describe("controlled selection", () => {
    it("Market Competitiveness reflects the active preset derived from inputs.initialCPA", () => {
      const lowInputs = { ...baseInputs, ...MARKET_COMPETITIVENESS_PRESETS.Low };
      render(<ModelInputs levers={{}} onChange={() => {}} inputs={lowInputs} />);
      const group = screen.getByRole("group", { name: /Market Competitiveness/i });
      const low = Array.from(group.querySelectorAll("button")).find(
        b => /^low$/i.test(b.textContent.trim())
      );
      expect(low).toHaveAttribute("aria-pressed", "true");
    });

    it("Market Competitiveness shows no active selection when CPA fields don't match any preset", () => {
      const customInputs = { ...baseInputs, initialCPA: 999 };
      render(<ModelInputs levers={{}} onChange={() => {}} inputs={customInputs} />);
      const group = screen.getByRole("group", { name: /Market Competitiveness/i });
      const optionButtons = Array.from(group.querySelectorAll("button")).filter((b) =>
        ["low", "medium", "high"].includes(b.textContent.trim().toLowerCase())
      );
      expect(optionButtons).toHaveLength(3);
      for (const button of optionButtons) {
        expect(button).toHaveAttribute("aria-pressed", "false");
      }
    });

    it("clicking a Market Competitiveness option calls onBatchInputChange with the matching preset", async () => {
      const user = userEvent.setup();
      const onBatchInputChange = jest.fn();
      render(
        <ModelInputs
          levers={{}}
          onChange={() => {}}
          onBatchInputChange={onBatchInputChange}
          inputs={baseInputs}
        />
      );
      const group = screen.getByRole("group", { name: /Market Competitiveness/i });
      const high = Array.from(group.querySelectorAll("button")).find(
        b => /^high$/i.test(b.textContent.trim())
      );
      await user.click(high);
      expect(onBatchInputChange).toHaveBeenCalledWith(MARKET_COMPETITIVENESS_PRESETS.High);
    });

    it("Rate Incentives reflects the active preset derived from inputs.rateBump", () => {
      const conservativeInputs = { ...baseInputs, ...LEVER_PRESETS.rateIncentives.Conservative };
      render(<ModelInputs levers={{}} onChange={() => {}} inputs={conservativeInputs} />);
      const group = screen.getByRole("group", { name: /Rate Incentives/i });
      const conservative = Array.from(group.querySelectorAll("button")).find(
        b => /^conservative$/i.test(b.textContent.trim())
      );
      expect(conservative).toHaveAttribute("aria-pressed", "true");
    });

    it("Rate Incentives shows no active selection when rateBump doesn't match any preset", () => {
      const customInputs = { ...baseInputs, rateBump: 999 };
      render(<ModelInputs levers={{}} onChange={() => {}} inputs={customInputs} />);
      const group = screen.getByRole("group", { name: /Rate Incentives/i });
      const optionButtons = Array.from(group.querySelectorAll("button")).filter((b) =>
        ["conservative", "moderate", "aggressive"].includes(b.textContent.trim().toLowerCase())
      );
      expect(optionButtons).toHaveLength(3);
      for (const button of optionButtons) {
        expect(button).toHaveAttribute("aria-pressed", "false");
      }
    });

    it("clicking a Rate Incentives option calls onBatchInputChange with the matching preset", async () => {
      const user = userEvent.setup();
      const onBatchInputChange = jest.fn();
      render(
        <ModelInputs
          levers={{}}
          onChange={() => {}}
          onBatchInputChange={onBatchInputChange}
          inputs={baseInputs}
        />
      );
      const group = screen.getByRole("group", { name: /Rate Incentives/i });
      const aggressive = Array.from(group.querySelectorAll("button")).find(
        b => /^aggressive$/i.test(b.textContent.trim())
      );
      await user.click(aggressive);
      expect(onBatchInputChange).toHaveBeenCalledWith(LEVER_PRESETS.rateIncentives.Aggressive);
    });

    it("clicking 150k for Market Size calls onChange with 'marketOpportunity' and '150k'", async () => {
      const user = userEvent.setup();
      const onChange = jest.fn();
      render(<ModelInputs levers={{}} onChange={onChange} inputs={baseInputs} />);
      const group = screen.getByRole("group", { name: /Market Size/i });
      const small = Array.from(group.querySelectorAll("button")).find(
        b => /^150k$/i.test(b.textContent.trim())
      );
      await user.click(small);
      expect(onChange).toHaveBeenCalledWith("marketOpportunity", "150k");
    });

    it("editing Month 60 goal falls back to onInputChange when onBatchInputChange is not provided", async () => {
      const user = userEvent.setup();
      const onInputChange = jest.fn();
      render(<ModelInputs levers={{}} onChange={() => {}} onInputChange={onInputChange} inputs={baseInputs} />);
      const input = screen.getByRole("spinbutton", { name: /month 60 member goal/i });
      await user.clear(input);
      await user.type(input, "8000");
      fireEvent.blur(input);
      expect(onInputChange).toHaveBeenCalledWith("m60Target", 8000);
    });

    it("editing Month 60 goal calls onBatchInputChange with all three re-derived milestones", async () => {
      const user = userEvent.setup();
      const onBatchInputChange = jest.fn();
      render(
        <ModelInputs
          levers={{}}
          onChange={() => {}}
          onInputChange={() => {}}
          onBatchInputChange={onBatchInputChange}
          inputs={baseInputs}
        />
      );
      const input = screen.getByRole("spinbutton", { name: /month 60 member goal/i });
      await user.clear(input);
      await user.type(input, "30000");
      fireEvent.blur(input);
      expect(onBatchInputChange).toHaveBeenCalledTimes(1);
      const batch = onBatchInputChange.mock.calls[0][0];
      expect(batch.m60Target).toBe(30000);
      expect(batch.m12Target).toBeGreaterThan(0);
      expect(batch.m36Target).toBeGreaterThan(batch.m12Target);
      expect(batch.m60Target).toBeGreaterThan(batch.m36Target);
    });

    it("clicking 'Suggest from SAM' calls onBatchInputChange with all three suggested milestones", async () => {
      const user = userEvent.setup();
      const onBatchInputChange = jest.fn();
      const inputsOffSuggestion = { ...baseInputs, m60Target: 999999 };
      render(
        <ModelInputs
          levers={{}}
          onChange={() => {}}
          onInputChange={() => {}}
          onBatchInputChange={onBatchInputChange}
          inputs={inputsOffSuggestion}
        />
      );
      const button = screen.getByRole("button", { name: /suggest from sam|use suggested/i });
      await user.click(button);
      expect(onBatchInputChange).toHaveBeenCalledTimes(1);
      const batch = onBatchInputChange.mock.calls[0][0];
      expect(batch).toHaveProperty("m12Target");
      expect(batch).toHaveProperty("m36Target");
      expect(batch).toHaveProperty("m60Target");
      expect(batch.m60Target).not.toBe(999999);
    });
  });

  // ─── Card 2: read-only CPA outputs ───────────────────────────────────────────

  describe("Acquisition Economics — read-only CPA outputs", () => {
    it("shows Initial CPA, Steady-State CPA, and Months to Reach Steady-State values from inputs", () => {
      render(<ModelInputs levers={{}} onChange={() => {}} inputs={baseInputs} />);
      expect(screen.getByText(`$${baseInputs.initialCPA.toLocaleString()}`)).toBeInTheDocument();
      expect(screen.getByText(`$${baseInputs.steadyStateCPA.toLocaleString()}`)).toBeInTheDocument();
      expect(screen.getByText(String(baseInputs.monthsToSteadyState))).toBeInTheDocument();
    });

    it("CPA outputs update when a different Market Competitiveness preset is active", () => {
      const highInputs = { ...baseInputs, ...MARKET_COMPETITIVENESS_PRESETS.High };
      render(<ModelInputs levers={{}} onChange={() => {}} inputs={highInputs} />);
      expect(screen.getByText(`$${MARKET_COMPETITIVENESS_PRESETS.High.initialCPA.toLocaleString()}`)).toBeInTheDocument();
      expect(screen.getByText(`$${MARKET_COMPETITIVENESS_PRESETS.High.steadyStateCPA.toLocaleString()}`)).toBeInTheDocument();
    });

    it("each CPA output has a tooltip pointing to Advanced Settings for manual overrides", () => {
      render(<ModelInputs levers={{}} onChange={() => {}} inputs={baseInputs} />);
      const labels = ["Initial CPA", "Steady-State CPA", "Months to Reach Steady-State"];
      for (const label of labels) {
        const row = screen.getByText(label).closest("span").parentElement;
        const infoBtn = within(row).getByRole("button", { name: /more information/i });
        fireEvent.mouseEnter(infoBtn);
        expect(screen.getByRole("tooltip")).toHaveTextContent(/Advanced Settings/i);
        fireEvent.mouseLeave(infoBtn);
      }
    });
  });

  // ─── Card 2: 5-Year Cumulative Acquisition Spend (requires calibration) ──────

  describe("5-Year Cumulative Acquisition Spend", () => {
    it("does not render when calibration is omitted", () => {
      render(<ModelInputs levers={{}} onChange={() => {}} inputs={baseInputs} />);
      expect(screen.queryByText(/5-Year Cumulative Acquisition Spend/i)).not.toBeInTheDocument();
    });

    it("renders the formatted total from computeCumulativeAcquisitionSpend for a real calibration result", () => {
      const calibration = calibrateAcquisition(baseInputs);
      const expectedText = fmtDollars(computeCumulativeAcquisitionSpend(calibration));
      render(<ModelInputs levers={{}} onChange={() => {}} inputs={baseInputs} calibration={calibration} />);
      expect(screen.getByText(expectedText)).toBeInTheDocument();
    });

    it("increases when a higher Market Competitiveness preset raises CPA, holding the curve fixed", () => {
      const lowInputs  = { ...baseInputs, ...MARKET_COMPETITIVENESS_PRESETS.Low };
      const highInputs = { ...baseInputs, ...MARKET_COMPETITIVENESS_PRESETS.High };
      const lowSpend  = computeCumulativeAcquisitionSpend(calibrateAcquisition(lowInputs));
      const highSpend = computeCumulativeAcquisitionSpend(calibrateAcquisition(highInputs));
      expect(highSpend).toBeGreaterThan(lowSpend);

      const { rerender } = render(
        <ModelInputs levers={{}} onChange={() => {}} inputs={lowInputs} calibration={calibrateAcquisition(lowInputs)} />
      );
      expect(screen.getByText(fmtDollars(lowSpend))).toBeInTheDocument();

      rerender(
        <ModelInputs levers={{}} onChange={() => {}} inputs={highInputs} calibration={calibrateAcquisition(highInputs)} />
      );
      expect(screen.getByText(fmtDollars(highSpend))).toBeInTheDocument();
    });

    it("has a tooltip explaining what drives the number and that Market Competitiveness shifts it directly", () => {
      const calibration = calibrateAcquisition(baseInputs);
      render(<ModelInputs levers={{}} onChange={() => {}} inputs={baseInputs} calibration={calibration} />);
      const row = screen.getByText(/5-Year Cumulative Acquisition Spend/i).closest("span").parentElement;
      const infoBtn = within(row).getByRole("button", { name: /more information/i });
      fireEvent.mouseEnter(infoBtn);
      const tooltip = screen.getByRole("tooltip");
      expect(tooltip).toHaveTextContent(/Bass curve/i);
      expect(tooltip).toHaveTextContent(/Market Competitiveness/i);
    });
  });

  // ─── Card 1: calibration-dependent sections ──────────────────────────────────
  // Month 12/36 projections, Bass Fit, and the Rate Incentives footer only
  // render when a `calibration` prop is supplied (mirrors runSimulation()'s
  // real output in page.jsx) — none of the tests above exercise that prop.

  describe("Month 12 / Month 36 projections (requires calibration)", () => {
    it("does not render Month 12/36 projections when calibration is omitted", () => {
      render(<ModelInputs levers={{}} onChange={() => {}} inputs={baseInputs} />);
      expect(screen.queryByText(/Month 12 Projection/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Month 36 Projection/i)).not.toBeInTheDocument();
    });

    it("renders projectedM12 and projectedM36 from a real calibration result", () => {
      const calibration = calibrateAcquisition(baseInputs);
      render(<ModelInputs levers={{}} onChange={() => {}} inputs={baseInputs} calibration={calibration} />);
      expect(screen.getByText(calibration.projectedM12.toLocaleString())).toBeInTheDocument();
      expect(screen.getByText(calibration.projectedM36.toLocaleString())).toBeInTheDocument();
    });

    it("Month 12 Projection tooltip explains it's derived, not editable, and points to Advanced Settings", () => {
      const calibration = calibrateAcquisition(baseInputs);
      render(<ModelInputs levers={{}} onChange={() => {}} inputs={baseInputs} calibration={calibration} />);
      const row = screen.getByText("Month 12 Projection").closest("span").parentElement;
      const infoBtn = within(row).getByRole("button", { name: /more information/i });
      fireEvent.mouseEnter(infoBtn);
      const tooltip = screen.getByRole("tooltip");
      expect(tooltip).toHaveTextContent(/Bass diffusion curve/i);
      expect(tooltip).toHaveTextContent(/Advanced Settings/i);
    });

    it("Month 36 Projection tooltip explains it's derived, not editable, and points to Advanced Settings", () => {
      const calibration = calibrateAcquisition(baseInputs);
      render(<ModelInputs levers={{}} onChange={() => {}} inputs={baseInputs} calibration={calibration} />);
      const row = screen.getByText("Month 36 Projection").closest("span").parentElement;
      const infoBtn = within(row).getByRole("button", { name: /more information/i });
      fireEvent.mouseEnter(infoBtn);
      const tooltip = screen.getByRole("tooltip");
      expect(tooltip).toHaveTextContent(/Bass diffusion curve/i);
      expect(tooltip).toHaveTextContent(/Advanced Settings/i);
    });
  });

  describe("Bass Fit indicator (requires calibration)", () => {
    it("does not render when calibration is omitted", () => {
      render(<ModelInputs levers={{}} onChange={() => {}} inputs={baseInputs} />);
      expect(screen.queryByText(/Bass Fit/i)).not.toBeInTheDocument();
    });

    it("shows 'Plausible' with no issue list when overall is green", () => {
      render(
        <ModelInputs levers={{}} onChange={() => {}} inputs={baseInputs} calibration={mockCalibration()} />
      );
      // Card 3's Rate Fit indicator can also read "Plausible" at Moderate rates,
      // so scope to Card 1 specifically.
      const card1 = screen.getByRole("heading", { name: /Market & Goal/i }).closest(".bg-white");
      expect(within(card1).getByText("Plausible")).toBeInTheDocument();
      expect(within(card1).queryByText(/outside a typical range/i)).not.toBeInTheDocument();
    });

    it("shows 'Ambitious' when overall is yellow", () => {
      render(
        <ModelInputs
          levers={{}}
          onChange={() => {}}
          inputs={baseInputs}
          calibration={mockCalibration({ realismIndicator: { overall: "yellow", qStatus: "yellow" } })}
        />
      );
      expect(screen.getByText("Ambitious")).toBeInTheDocument();
      expect(screen.getByText(/word-of-mouth rate \(q\) is elevated/i)).toBeInTheDocument();
    });

    it("shows 'Implausible' and lists all failing dimensions when overall is red", () => {
      render(
        <ModelInputs
          levers={{}}
          onChange={() => {}}
          inputs={baseInputs}
          calibration={mockCalibration({
            realismIndicator: { overall: "red", pStatus: "red", qStatus: "red", tensionStatus: "red" },
          })}
        />
      );
      expect(screen.getByText("Implausible")).toBeInTheDocument();
      expect(screen.getByText(/innovation rate \(p\) is outside a typical range/i)).toBeInTheDocument();
      expect(screen.getByText(/word-of-mouth rate \(q\) is elevated/i)).toBeInTheDocument();
      expect(screen.getByText(/milestone targets exceed what this market can reach/i)).toBeInTheDocument();
    });
  });

  describe("Required Acquisition Intensity readout (requires calibration)", () => {
    it("does not render when calibration is omitted", () => {
      render(<ModelInputs levers={{}} onChange={() => {}} inputs={baseInputs} />);
      expect(screen.queryByText(/Required Acquisition Intensity/i)).not.toBeInTheDocument();
    });

    it("shows 'on par with Moderate' when p is within 5% of pBaseline", () => {
      const calibration = mockCalibration();
      const nearBaseline = { ...calibration, p: calibration.pBaseline * 1.02 };
      render(<ModelInputs levers={{}} onChange={() => {}} inputs={baseInputs} calibration={nearBaseline} />);
      expect(screen.getByText(/on par with Moderate/i)).toBeInTheDocument();
    });

    it("shows '+X% more outbound push needed' and the added-spend note when p exceeds pBaseline by more than 10%", () => {
      const calibration = mockCalibration();
      const higherP = { ...calibration, p: calibration.pBaseline * 1.5 };
      render(<ModelInputs levers={{}} onChange={() => {}} inputs={baseInputs} calibration={higherP} />);
      expect(screen.getByText("+50%")).toBeInTheDocument();
      expect(screen.getByText(/more outbound push needed/i)).toBeInTheDocument();
      expect(screen.getByText(/meaningfully more outbound marketing push/i)).toBeInTheDocument();
    });

    it("shows '-X% less outbound push needed' and the word-of-mouth note when p is more than 10% below pBaseline", () => {
      const calibration = mockCalibration();
      const lowerP = { ...calibration, p: calibration.pBaseline * 0.5 };
      render(<ModelInputs levers={{}} onChange={() => {}} inputs={baseInputs} calibration={lowerP} />);
      expect(screen.getByText("-50%")).toBeInTheDocument();
      expect(screen.getByText(/less outbound push needed/i)).toBeInTheDocument();
      expect(screen.getByText(/stronger word-of-mouth carries more of the load/i)).toBeInTheDocument();
    });
  });

  describe("Rate Fit indicator (requires calibration)", () => {
    it("does not render when calibration is omitted", () => {
      render(<ModelInputs levers={{}} onChange={() => {}} inputs={baseInputs} />);
      expect(screen.queryByText(/Rate Fit/i)).not.toBeInTheDocument();
    });

    it("shows 'Implausible', scoped to Card 3, when rateFitIndicator.overall is red", () => {
      const calibration = mockCalibration({
        rateFitIndicator: { overall: "red", pStatus: "red", qStatus: "green", tensionStatus: "red" },
      });
      render(<ModelInputs levers={{}} onChange={() => {}} inputs={baseInputs} calibration={calibration} />);
      const card3 = screen.getByRole("heading", { name: /^Rate Incentives$/i }).closest(".bg-white");
      expect(within(card3).getByText("Implausible")).toBeInTheDocument();
    });
  });

  describe("Card 3 — read-only Rate Incentives mechanism fields", () => {
    it("shows Initial Rate Bump, Rate Bump Decay, Rate Bump Floor, and Rate Cut on Digital Loans with title-cased labels", () => {
      render(<ModelInputs levers={{}} onChange={() => {}} inputs={baseInputs} />);
      expect(screen.getByText("Initial Rate Bump")).toBeInTheDocument();
      expect(screen.getByText("Rate Bump Decay")).toBeInTheDocument();
      expect(screen.getByText("Rate Bump Floor")).toBeInTheDocument();
      expect(screen.getByText("Rate Cut on Digital Loans")).toBeInTheDocument();
    });

    it("shows the Word-of-Mouth Multiplier (q) and Attrition Multiplier fields", () => {
      render(<ModelInputs levers={{}} onChange={() => {}} inputs={baseInputs} />);
      expect(screen.getByText("Word-of-Mouth Multiplier (q)")).toBeInTheDocument();
      expect(screen.getByText("Attrition Multiplier")).toBeInTheDocument();
    });

    it("displays the current values from inputs for each read-only field", () => {
      const inputs = { ...baseInputs, ...LEVER_PRESETS.rateIncentives.Aggressive };
      render(<ModelInputs levers={{}} onChange={() => {}} inputs={inputs} />);
      expect(screen.getByText(String(inputs.rateBump))).toBeInTheDocument();
      expect(screen.getByText(String(inputs.ratePremiumDecay))).toBeInTheDocument();
      expect(screen.getByText(String(inputs.rateBumpFloor))).toBeInTheDocument();
      expect(screen.getByText(String(inputs.rateCut))).toBeInTheDocument();
      expect(screen.getByText(`${inputs.qMultiplier.toFixed(2)}×`)).toBeInTheDocument();
      expect(screen.getByText(`${inputs.attritionMultiplier.toFixed(2)}×`)).toBeInTheDocument();
    });

    it("each read-only field has a tooltip pointing to Advanced Settings for manual overrides", () => {
      render(<ModelInputs levers={{}} onChange={() => {}} inputs={baseInputs} />);
      const labels = [
        "Initial Rate Bump",
        "Rate Bump Decay",
        "Rate Bump Floor",
        "Rate Cut on Digital Loans",
        "Word-of-Mouth Multiplier (q)",
        "Attrition Multiplier",
      ];
      for (const label of labels) {
        const row = screen.getByText(label).closest("span").parentElement;
        const infoBtn = within(row).getByRole("button", { name: /more information/i });
        fireEvent.mouseEnter(infoBtn);
        expect(screen.getByRole("tooltip")).toHaveTextContent(/Advanced Settings/i);
        fireEvent.mouseLeave(infoBtn);
      }
    });

    it("Attrition Multiplier tooltip shows the resulting effective attrition rates when calibration is present", () => {
      const calibration = calibrateAcquisition(baseInputs);
      render(<ModelInputs levers={{}} onChange={() => {}} inputs={baseInputs} calibration={calibration} />);
      const row = screen.getByText("Attrition Multiplier").closest("span").parentElement;
      const infoBtn = within(row).getByRole("button", { name: /more information/i });
      fireEvent.mouseEnter(infoBtn);
      expect(screen.getByRole("tooltip")).toHaveTextContent(/effective attrition/i);
    });
  });

  // ─── Methodology notes ────────────────────────────────────────────────────────
  // These disclosures must be visible without hovering an info icon — an
  // executive skimming the page should see the honesty caveats directly.

  describe("methodology notes (always visible, no hover required)", () => {
    it("Bass Fit footer discloses that p/q are estimates, not fitted to CU-specific data", () => {
      render(
        <ModelInputs levers={{}} onChange={() => {}} inputs={baseInputs} calibration={mockCalibration()} />
      );
      expect(screen.getByText(/not fitted to credit-union-specific launch data/i)).toBeInTheDocument();
    });

    it("does not render the Bass Fit methodology note when calibration is omitted", () => {
      render(<ModelInputs levers={{}} onChange={() => {}} inputs={baseInputs} />);
      expect(screen.queryByText(/not fitted to credit-union-specific launch data/i)).not.toBeInTheDocument();
    });

    it("5-Year Cumulative Acquisition Spend footer discloses that spend prices the curve rather than driving it", () => {
      const calibration = calibrateAcquisition(baseInputs);
      render(<ModelInputs levers={{}} onChange={() => {}} inputs={baseInputs} calibration={calibration} />);
      expect(
        screen.getByText(/prices the adoption curve set in Market & Goal — it doesn't drive it/i)
      ).toBeInTheDocument();
    });

    it("Rate Incentives always discloses that its multipliers are illustrative, even without calibration", () => {
      render(<ModelInputs levers={{}} onChange={() => {}} inputs={baseInputs} />);
      expect(screen.getByText(/illustrative estimates, not fitted to observed rate-sensitivity data/i)).toBeInTheDocument();
    });

    it("Rate Incentives methodology note still renders alongside the Required Acquisition Intensity readout when calibration is present", () => {
      render(
        <ModelInputs levers={{}} onChange={() => {}} inputs={baseInputs} calibration={mockCalibration()} />
      );
      expect(screen.getByText(/Required Acquisition Intensity/i)).toBeInTheDocument();
      expect(screen.getByText(/illustrative estimates, not fitted to observed rate-sensitivity data/i)).toBeInTheDocument();
    });
  });

  // ─── Tooltips ───────────────────────────────────────────────────────────────

  describe("lever tooltips", () => {
    it("renders a 'More information' button for each lever", () => {
      render(<ModelInputs levers={{}} onChange={() => {}} inputs={baseInputs} />);
      const infoButtons = screen.getAllByRole("button", { name: /more information/i });
      expect(infoButtons.length).toBeGreaterThanOrEqual(4);
    });

    it("tooltip appears on mouseenter and disappears on mouseleave", () => {
      render(<ModelInputs levers={{}} onChange={() => {}} inputs={baseInputs} />);
      const group  = screen.getByRole("group", { name: /Market Competitiveness/i });
      const infoBtn = within(group).getByRole("button", { name: /more information/i });

      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
      fireEvent.mouseEnter(infoBtn);
      expect(screen.getByRole("tooltip")).toBeInTheDocument();
      fireEvent.mouseLeave(infoBtn);
      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    });

    it("Market Competitiveness tooltip clarifies that CPA does not affect member counts", () => {
      render(<ModelInputs levers={{}} onChange={() => {}} inputs={baseInputs} />);
      const group   = screen.getByRole("group", { name: /Market Competitiveness/i });
      const infoBtn = within(group).getByRole("button", { name: /more information/i });
      fireEvent.mouseEnter(infoBtn);
      expect(screen.getByRole("tooltip")).toHaveTextContent(/does not affect projected member/i);
    });

    it("Market Competitiveness tooltip lists the three controlled fields", () => {
      render(<ModelInputs levers={{}} onChange={() => {}} inputs={baseInputs} />);
      const group   = screen.getByRole("group", { name: /Market Competitiveness/i });
      const infoBtn = within(group).getByRole("button", { name: /more information/i });
      fireEvent.mouseEnter(infoBtn);
      const tooltip = screen.getByRole("tooltip");
      expect(tooltip).toHaveTextContent(/Initial CPA/i);
      expect(tooltip).toHaveTextContent(/Steady-State CPA/i);
      expect(tooltip).toHaveTextContent(/Months to Reach Steady-State/i);
    });

    it("Rate Incentives tooltip describes hot money / word-of-mouth effects", () => {
      render(<ModelInputs levers={{}} onChange={() => {}} inputs={baseInputs} />);
      const group   = screen.getByRole("group", { name: /Rate Incentives/i });
      const infoBtn = within(group).getByRole("button", { name: /more information/i });
      fireEvent.mouseEnter(infoBtn);
      const tooltip = screen.getByRole("tooltip");
      expect(tooltip).toHaveTextContent(/hot money/i);
      expect(tooltip).toHaveTextContent(/word-of-mouth/i);
    });

    it("Rate Incentives tooltip warns about cannibalization for Aggressive setting", () => {
      render(<ModelInputs levers={{}} onChange={() => {}} inputs={baseInputs} />);
      const group   = screen.getByRole("group", { name: /Rate Incentives/i });
      const infoBtn = within(group).getByRole("button", { name: /more information/i });
      fireEvent.mouseEnter(infoBtn);
      expect(screen.getByRole("tooltip")).toHaveTextContent(/cannibalization/i);
    });

    it("Rate Incentives tooltip describes the effect of each level", () => {
      render(<ModelInputs levers={{}} onChange={() => {}} inputs={baseInputs} />);
      const group   = screen.getByRole("group", { name: /Rate Incentives/i });
      const infoBtn = within(group).getByRole("button", { name: /more information/i });
      fireEvent.mouseEnter(infoBtn);
      const tooltip = screen.getByRole("tooltip");
      expect(tooltip).toHaveTextContent(/Conservative/i);
      expect(tooltip).toHaveTextContent(/Moderate/i);
      expect(tooltip).toHaveTextContent(/Aggressive/i);
    });

    it("Target Member Profile tooltip mentions attrition and SAM", () => {
      render(<ModelInputs levers={{}} onChange={() => {}} inputs={baseInputs} />);
      const group   = screen.getByRole("group", { name: /Target Member Profile/i });
      const infoBtn = within(group).getByRole("button", { name: /more information/i });
      fireEvent.mouseEnter(infoBtn);
      const tooltip = screen.getByRole("tooltip");
      expect(tooltip).toHaveTextContent(/attrition/i);
      expect(tooltip).toHaveTextContent(/SAM/i);
    });

    it("Target Member Profile tooltip notes that milestones are re-suggested on change", () => {
      render(<ModelInputs levers={{}} onChange={() => {}} inputs={baseInputs} />);
      const group   = screen.getByRole("group", { name: /Target Member Profile/i });
      const infoBtn = within(group).getByRole("button", { name: /more information/i });
      fireEvent.mouseEnter(infoBtn);
      expect(screen.getByRole("tooltip")).toHaveTextContent(/re-suggest/i);
    });

    it("Market Size tooltip mentions milestone re-suggestion", () => {
      render(<ModelInputs levers={{}} onChange={() => {}} inputs={baseInputs} />);
      const group   = screen.getByRole("group", { name: /Market Size/i });
      const infoBtn = within(group).getByRole("button", { name: /more information/i });
      fireEvent.mouseEnter(infoBtn);
      expect(screen.getByRole("tooltip")).toHaveTextContent(/re-suggest/i);
    });

    it("Market Size tooltip distinguishes TAM from SAM", () => {
      render(<ModelInputs levers={{}} onChange={() => {}} inputs={baseInputs} />);
      const group   = screen.getByRole("group", { name: /Market Size/i });
      const infoBtn = within(group).getByRole("button", { name: /more information/i });
      fireEvent.mouseEnter(infoBtn);
      const tooltip = screen.getByRole("tooltip");
      expect(tooltip).toHaveTextContent(/TAM/);
      expect(tooltip).toHaveTextContent(/SAM/);
    });

    it("Month 60 goal tooltip mentions Bass diffusion", () => {
      render(<ModelInputs levers={{}} onChange={() => {}} inputs={baseInputs} />);
      const goalSection = screen.getByRole("spinbutton", { name: /month 60 member goal/i }).closest("div");
      const infoBtn = within(goalSection.parentElement).getByRole("button", { name: /more information/i });
      fireEvent.mouseEnter(infoBtn);
      expect(screen.getByRole("tooltip")).toHaveTextContent(/Bass/i);
    });
  });
});
