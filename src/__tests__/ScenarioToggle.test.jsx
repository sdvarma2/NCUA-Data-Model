import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ScenarioToggle from "@/components/ScenarioToggle";

describe("ScenarioToggle", () => {
  it("renders both scenario cards", () => {
    render(<ScenarioToggle scenario="scenario_a" onChange={() => {}} />);
    expect(screen.getByTestId("card-scenario_a")).toBeInTheDocument();
    expect(screen.getByTestId("card-scenario_b")).toBeInTheDocument();
  });

  it("Scenario A card has the correct title", () => {
    render(<ScenarioToggle scenario="scenario_a" onChange={() => {}} />);
    expect(screen.getByText(/Expansion Markets Only/i)).toBeInTheDocument();
  });

  it("Scenario B card has the correct title", () => {
    render(<ScenarioToggle scenario="scenario_a" onChange={() => {}} />);
    expect(screen.getByText(/All Markets/i)).toBeInTheDocument();
  });

  it("selected card has aria-pressed true, unselected false", () => {
    render(<ScenarioToggle scenario="scenario_a" onChange={() => {}} />);
    expect(screen.getByTestId("card-scenario_a")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("card-scenario_b")).toHaveAttribute("aria-pressed", "false");
  });

  it("flips aria-pressed when Scenario B is the active scenario", () => {
    render(<ScenarioToggle scenario="scenario_b" onChange={() => {}} />);
    expect(screen.getByTestId("card-scenario_a")).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByTestId("card-scenario_b")).toHaveAttribute("aria-pressed", "true");
  });

  it("clicking Scenario B calls onChange with 'scenario_b'", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<ScenarioToggle scenario="scenario_a" onChange={onChange} />);
    await user.click(screen.getByTestId("card-scenario_b"));
    expect(onChange).toHaveBeenCalledWith("scenario_b");
  });

  it("clicking Scenario A calls onChange with 'scenario_a'", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<ScenarioToggle scenario="scenario_b" onChange={onChange} />);
    await user.click(screen.getByTestId("card-scenario_a"));
    expect(onChange).toHaveBeenCalledWith("scenario_a");
  });

  it("shows a plain-English description for each scenario", () => {
    render(<ScenarioToggle scenario="scenario_a" onChange={() => {}} />);
    expect(screen.getByText(/outside.*current branch footprint/i)).toBeInTheDocument();
    expect(screen.getByText(/existing branch markets/i)).toBeInTheDocument();
  });

  it("renders a section heading above the cards", () => {
    render(<ScenarioToggle scenario="scenario_a" onChange={() => {}} />);
    expect(screen.getByText(/deployment scenario/i)).toBeInTheDocument();
  });
});
