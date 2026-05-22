import { render, screen } from "@testing-library/react";
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

    it("shows Single Metro / Multi-Metro / Multi-State for Market Opportunity", () => {
      render(<ModelInputs levers={{}} onChange={() => {}} />);
      const group = screen.getByRole("group", { name: /Market Opportunity/i });
      expect(group).toHaveTextContent(/Single Metro/i);
      expect(group).toHaveTextContent(/Multi-Metro/i);
      expect(group).toHaveTextContent(/Multi-State/i);
    });
  });

  describe("default selections", () => {
    it("Acquisition Aggression defaults to Moderate", () => {
      render(<ModelInputs levers={{}} onChange={() => {}} />);
      const group = screen.getByRole("group", { name: /Acquisition Aggression/i });
      const moderate = Array.from(group.querySelectorAll("button")).find(
        b => /moderate/i.test(b.textContent)
      );
      expect(moderate).toHaveAttribute("aria-pressed", "true");
    });

    it("Rate Competitiveness defaults to Moderate", () => {
      render(<ModelInputs levers={{}} onChange={() => {}} />);
      const group = screen.getByRole("group", { name: /Rate Competitiveness/i });
      const moderate = Array.from(group.querySelectorAll("button")).find(
        b => /moderate/i.test(b.textContent)
      );
      expect(moderate).toHaveAttribute("aria-pressed", "true");
    });

    it("Target Member Profile defaults to Balanced", () => {
      render(<ModelInputs levers={{}} onChange={() => {}} />);
      const group = screen.getByRole("group", { name: /Target Member Profile/i });
      const balanced = Array.from(group.querySelectorAll("button")).find(
        b => /balanced/i.test(b.textContent)
      );
      expect(balanced).toHaveAttribute("aria-pressed", "true");
    });

    it("Market Opportunity defaults to Multi-Metro", () => {
      render(<ModelInputs levers={{}} onChange={() => {}} />);
      const group = screen.getByRole("group", { name: /Market Opportunity/i });
      const multiMetro = Array.from(group.querySelectorAll("button")).find(
        b => /multi-metro/i.test(b.textContent)
      );
      expect(multiMetro).toHaveAttribute("aria-pressed", "true");
    });
  });

  describe("controlled selection", () => {
    it("reflects lever values passed via props", () => {
      render(<ModelInputs levers={{ acquisitionAggression: "Conservative" }} onChange={() => {}} />);
      const group = screen.getByRole("group", { name: /Acquisition Aggression/i });
      const conservative = Array.from(group.querySelectorAll("button")).find(
        b => /conservative/i.test(b.textContent)
      );
      expect(conservative).toHaveAttribute("aria-pressed", "true");
    });

    it("clicking an option calls onChange with the lever id and new value", async () => {
      const user = userEvent.setup();
      const onChange = jest.fn();
      render(<ModelInputs levers={{}} onChange={onChange} />);
      const group = screen.getByRole("group", { name: /Acquisition Aggression/i });
      const aggressive = Array.from(group.querySelectorAll("button")).find(
        b => /aggressive/i.test(b.textContent)
      );
      await user.click(aggressive);
      expect(onChange).toHaveBeenCalledWith("acquisitionAggression", "Aggressive");
    });
  });
});
