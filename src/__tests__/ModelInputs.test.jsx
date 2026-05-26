import { render, screen, fireEvent, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ModelInputs from "@/components/ModelInputs";

describe("ModelInputs", () => {
  describe("lever labels", () => {
    it("renders the Acquisition Aggression lever", () => {
      render(<ModelInputs levers={{}} onChange={() => {}} />);
      expect(screen.getByText(/Acquisition Aggression/i)).toBeInTheDocument();
    });

    it("renders the Rate Competitiveness lever", () => {
      render(<ModelInputs levers={{}} onChange={() => {}} />);
      expect(screen.getByText(/Rate Competitiveness/i)).toBeInTheDocument();
    });

    it("renders the Target Member Profile lever", () => {
      render(<ModelInputs levers={{}} onChange={() => {}} />);
      expect(screen.getByText(/Target Member Profile/i)).toBeInTheDocument();
    });

    it("renders the Market Opportunity lever", () => {
      render(<ModelInputs levers={{}} onChange={() => {}} />);
      expect(screen.getByText(/Market Opportunity/i)).toBeInTheDocument();
    });
  });

  describe("lever options", () => {
    it("shows Conservative / Moderate / Aggressive for Acquisition Aggression", () => {
      render(<ModelInputs levers={{}} onChange={() => {}} />);
      const group = screen.getByRole("group", { name: /Acquisition Aggression/i });
      expect(group).toHaveTextContent(/Conservative/i);
      expect(group).toHaveTextContent(/Moderate/i);
      expect(group).toHaveTextContent(/Aggressive/i);
    });

    it("shows Conservative / Moderate / Aggressive for Rate Competitiveness", () => {
      render(<ModelInputs levers={{}} onChange={() => {}} />);
      const group = screen.getByRole("group", { name: /Rate Competitiveness/i });
      expect(group).toHaveTextContent(/Conservative/i);
      expect(group).toHaveTextContent(/Moderate/i);
      expect(group).toHaveTextContent(/Aggressive/i);
    });

    it("shows Mass Market / Balanced / Upmarket for Target Member Profile", () => {
      render(<ModelInputs levers={{}} onChange={() => {}} />);
      const group = screen.getByRole("group", { name: /Target Member Profile/i });
      expect(group).toHaveTextContent(/Mass Market/i);
      expect(group).toHaveTextContent(/Balanced/i);
      expect(group).toHaveTextContent(/Upmarket/i);
    });

    it("shows 150k / 500k / 2M for Market Opportunity", () => {
      render(<ModelInputs levers={{}} onChange={() => {}} />);
      const group = screen.getByRole("group", { name: /Market Opportunity/i });
      expect(group).toHaveTextContent(/150k/i);
      expect(group).toHaveTextContent(/500k/i);
      expect(group).toHaveTextContent(/2M/i);
    });

    it("renders the 'potential members' unit label for Market Opportunity", () => {
      render(<ModelInputs levers={{}} onChange={() => {}} />);
      expect(screen.getByText(/potential members/i)).toBeInTheDocument();
    });
  });

  describe("default selections", () => {
    it("Acquisition Aggression defaults to Moderate", () => {
      render(<ModelInputs levers={{}} onChange={() => {}} />);
      const group = screen.getByRole("group", { name: /Acquisition Aggression/i });
      const moderate = Array.from(group.querySelectorAll("button")).find(
        b => /^moderate$/i.test(b.textContent.trim())
      );
      expect(moderate).toHaveAttribute("aria-pressed", "true");
    });

    it("Rate Competitiveness defaults to Moderate", () => {
      render(<ModelInputs levers={{}} onChange={() => {}} />);
      const group = screen.getByRole("group", { name: /Rate Competitiveness/i });
      const moderate = Array.from(group.querySelectorAll("button")).find(
        b => /^moderate$/i.test(b.textContent.trim())
      );
      expect(moderate).toHaveAttribute("aria-pressed", "true");
    });

    it("Target Member Profile defaults to Balanced", () => {
      render(<ModelInputs levers={{}} onChange={() => {}} />);
      const group = screen.getByRole("group", { name: /Target Member Profile/i });
      const balanced = Array.from(group.querySelectorAll("button")).find(
        b => /^balanced$/i.test(b.textContent.trim())
      );
      expect(balanced).toHaveAttribute("aria-pressed", "true");
    });

    it("Market Opportunity defaults to 500k", () => {
      render(<ModelInputs levers={{}} onChange={() => {}} />);
      const group = screen.getByRole("group", { name: /Market Opportunity/i });
      const fiveHundredK = Array.from(group.querySelectorAll("button")).find(
        b => /^500k$/i.test(b.textContent.trim())
      );
      expect(fiveHundredK).toHaveAttribute("aria-pressed", "true");
    });
  });

  describe("controlled selection", () => {
    it("reflects lever values passed via props", () => {
      render(<ModelInputs levers={{ acquisitionAggression: "Conservative" }} onChange={() => {}} />);
      const group = screen.getByRole("group", { name: /Acquisition Aggression/i });
      const conservative = Array.from(group.querySelectorAll("button")).find(
        b => /^conservative$/i.test(b.textContent.trim())
      );
      expect(conservative).toHaveAttribute("aria-pressed", "true");
    });

    it("clicking an option calls onChange with the lever id and new value", async () => {
      const user = userEvent.setup();
      const onChange = jest.fn();
      render(<ModelInputs levers={{}} onChange={onChange} />);
      const group = screen.getByRole("group", { name: /Acquisition Aggression/i });
      const aggressive = Array.from(group.querySelectorAll("button")).find(
        b => /^aggressive$/i.test(b.textContent.trim())
      );
      await user.click(aggressive);
      expect(onChange).toHaveBeenCalledWith("acquisitionAggression", "Aggressive");
    });

    it("clicking 150k for Market Opportunity calls onChange with 'marketOpportunity' and '150k'", async () => {
      const user = userEvent.setup();
      const onChange = jest.fn();
      render(<ModelInputs levers={{}} onChange={onChange} />);
      const group = screen.getByRole("group", { name: /Market Opportunity/i });
      const small = Array.from(group.querySelectorAll("button")).find(
        b => /^150k$/i.test(b.textContent.trim())
      );
      await user.click(small);
      expect(onChange).toHaveBeenCalledWith("marketOpportunity", "150k");
    });
  });

  // ─── Tooltips ───────────────────────────────────────────────────────────────

  describe("lever tooltips", () => {
    it("renders a 'More information' button for each of the four levers", () => {
      render(<ModelInputs levers={{}} onChange={() => {}} />);
      const infoButtons = screen.getAllByRole("button", { name: /more information/i });
      expect(infoButtons).toHaveLength(4);
    });

    it("tooltip appears on mouseenter and disappears on mouseleave", () => {
      render(<ModelInputs levers={{}} onChange={() => {}} />);
      const group  = screen.getByRole("group", { name: /Acquisition Aggression/i });
      const infoBtn = within(group).getByRole("button", { name: /more information/i });

      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
      fireEvent.mouseEnter(infoBtn);
      expect(screen.getByRole("tooltip")).toBeInTheDocument();
      fireEvent.mouseLeave(infoBtn);
      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    });

    it("Acquisition Aggression tooltip clarifies that CPA does not affect member counts", () => {
      render(<ModelInputs levers={{}} onChange={() => {}} />);
      const group   = screen.getByRole("group", { name: /Acquisition Aggression/i });
      const infoBtn = within(group).getByRole("button", { name: /more information/i });
      fireEvent.mouseEnter(infoBtn);
      expect(screen.getByRole("tooltip")).toHaveTextContent(/does not affect projected member/i);
    });

    it("Acquisition Aggression tooltip lists the three controlled fields", () => {
      render(<ModelInputs levers={{}} onChange={() => {}} />);
      const group   = screen.getByRole("group", { name: /Acquisition Aggression/i });
      const infoBtn = within(group).getByRole("button", { name: /more information/i });
      fireEvent.mouseEnter(infoBtn);
      const tooltip = screen.getByRole("tooltip");
      expect(tooltip).toHaveTextContent(/Initial CPA/i);
      expect(tooltip).toHaveTextContent(/Steady-State CPA/i);
      expect(tooltip).toHaveTextContent(/Months to Reach Steady-State/i);
    });

    it("Rate Competitiveness tooltip warns about cannibalization implications of Aggressive", () => {
      render(<ModelInputs levers={{}} onChange={() => {}} />);
      const group   = screen.getByRole("group", { name: /Rate Competitiveness/i });
      const infoBtn = within(group).getByRole("button", { name: /more information/i });
      fireEvent.mouseEnter(infoBtn);
      expect(screen.getByRole("tooltip")).toHaveTextContent(/cannibalization/i);
    });

    it("Rate Competitiveness tooltip describes each level's behavior", () => {
      render(<ModelInputs levers={{}} onChange={() => {}} />);
      const group   = screen.getByRole("group", { name: /Rate Competitiveness/i });
      const infoBtn = within(group).getByRole("button", { name: /more information/i });
      fireEvent.mouseEnter(infoBtn);
      const tooltip = screen.getByRole("tooltip");
      expect(tooltip).toHaveTextContent(/Rate Bump/i);
      expect(tooltip).toHaveTextContent(/Rate Cut/i);
    });

    it("Target Member Profile tooltip mentions attrition and SAM", () => {
      render(<ModelInputs levers={{}} onChange={() => {}} />);
      const group   = screen.getByRole("group", { name: /Target Member Profile/i });
      const infoBtn = within(group).getByRole("button", { name: /more information/i });
      fireEvent.mouseEnter(infoBtn);
      const tooltip = screen.getByRole("tooltip");
      expect(tooltip).toHaveTextContent(/attrition/i);
      expect(tooltip).toHaveTextContent(/SAM/i);
    });

    it("Target Member Profile tooltip notes that milestones are re-suggested on change", () => {
      render(<ModelInputs levers={{}} onChange={() => {}} />);
      const group   = screen.getByRole("group", { name: /Target Member Profile/i });
      const infoBtn = within(group).getByRole("button", { name: /more information/i });
      fireEvent.mouseEnter(infoBtn);
      expect(screen.getByRole("tooltip")).toHaveTextContent(/re-suggest/i);
    });

    it("Market Opportunity tooltip mentions milestone re-suggestion", () => {
      render(<ModelInputs levers={{}} onChange={() => {}} />);
      const group   = screen.getByRole("group", { name: /Market Opportunity/i });
      const infoBtn = within(group).getByRole("button", { name: /more information/i });
      fireEvent.mouseEnter(infoBtn);
      expect(screen.getByRole("tooltip")).toHaveTextContent(/milestone/i);
    });

    it("Market Opportunity tooltip distinguishes TAM from SAM", () => {
      render(<ModelInputs levers={{}} onChange={() => {}} />);
      const group   = screen.getByRole("group", { name: /Market Opportunity/i });
      const infoBtn = within(group).getByRole("button", { name: /more information/i });
      fireEvent.mouseEnter(infoBtn);
      const tooltip = screen.getByRole("tooltip");
      expect(tooltip).toHaveTextContent(/TAM/);
      expect(tooltip).toHaveTextContent(/SAM/);
    });
  });
});
