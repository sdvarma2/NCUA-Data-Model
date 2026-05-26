import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import InstitutionProfileCard from "@/components/InstitutionProfileCard";

const BRANCH_HEAVY = {
  CU_NUMBER: 1, CU_NAME: "LAKE MICHIGAN", STATE: "MI", CITY: "BATTLE CREEK",
  assets_b: 15.953, members: 523449, branch_count: 79, fte_equiv: 2100,
  members_per_branch: 6626, members_per_fte: 249,
  opex_per_member: 653, occupancy_per_member: 32,
  nim_pct: 2.553, roa_pct: 1.305,
  digital_intensity: "branch_heavy",
  member_gap_to_hybrid: 1056551, branch_surplus_vs_hybrid: 52,
  opex_gap_vs_hybrid_median: 223, occupancy_gap_vs_hybrid_median: 15,
  hybrid_opex_p25: 317, hybrid_opex_p50: 430, hybrid_opex_p75: 582,
  hybrid_occupancy_p50: 17, hybrid_nim_p50: 2.657, hybrid_roa_p50: 0.622,
};

const BRANCH_BALANCED = {
  CU_NUMBER: 2, CU_NAME: "AMERICA FIRST", STATE: "UT", CITY: "RIVERDALE",
  assets_b: 23.787, members: 1554689, branch_count: 123, fte_equiv: 3433,
  members_per_branch: 12640, members_per_fte: 453,
  opex_per_member: 402, occupancy_per_member: 21,
  nim_pct: 3.548, roa_pct: 1.409,
  digital_intensity: "branch_balanced",
  member_gap_to_hybrid: 905311, branch_surplus_vs_hybrid: 45,
  opex_gap_vs_hybrid_median: -28, occupancy_gap_vs_hybrid_median: 4,
  hybrid_opex_p25: 317, hybrid_opex_p50: 430, hybrid_opex_p75: 582,
  hybrid_occupancy_p50: 17, hybrid_nim_p50: 2.657, hybrid_roa_p50: 0.622,
};

const HYBRID = {
  CU_NUMBER: 3, CU_NAME: "DIGITAL", STATE: "MA", CITY: "MARLBOROUGH",
  assets_b: 13.084, members: 1159110, branch_count: 25, fte_equiv: 1800,
  members_per_branch: 46364, members_per_fte: 644,
  opex_per_member: 320, occupancy_per_member: 11,
  nim_pct: 3.891, roa_pct: 0.676,
  digital_intensity: "hybrid",
  member_gap_to_hybrid: 0, branch_surplus_vs_hybrid: 0,
  opex_gap_vs_hybrid_median: -110, occupancy_gap_vs_hybrid_median: -6,
  hybrid_opex_p25: 317, hybrid_opex_p50: 430, hybrid_opex_p75: 582,
  hybrid_occupancy_p50: 17, hybrid_nim_p50: 2.657, hybrid_roa_p50: 0.622,
};

describe("InstitutionProfileCard", () => {
  it("renders nothing when no institution is provided", () => {
    const { container } = render(<InstitutionProfileCard institution={null} />);
    expect(container.firstChild).toBeNull();
  });

  describe("identity section", () => {
    it("renders the title-cased institution name", () => {
      render(<InstitutionProfileCard institution={BRANCH_HEAVY} />);
      expect(screen.getByText("Lake Michigan")).toBeInTheDocument();
    });

    it("renders the title-cased city and state", () => {
      render(<InstitutionProfileCard institution={BRANCH_HEAVY} />);
      expect(screen.getByText(/Battle Creek, MI/i)).toBeInTheDocument();
    });

    it("renders assets formatted as $XB", () => {
      render(<InstitutionProfileCard institution={BRANCH_HEAVY} />);
      expect(screen.getByText("$15.9B")).toBeInTheDocument();
    });

    it("renders member count with commas", () => {
      render(<InstitutionProfileCard institution={BRANCH_HEAVY} />);
      expect(screen.getByText("523,449")).toBeInTheDocument();
    });

    it("renders branch count", () => {
      render(<InstitutionProfileCard institution={BRANCH_HEAVY} />);
      expect(screen.getByText("79")).toBeInTheDocument();
    });
  });

  describe("digital density section", () => {
    it("shows the branch_heavy tier label", () => {
      render(<InstitutionProfileCard institution={BRANCH_HEAVY} />);
      expect(screen.getByText(/branch.heavy/i)).toBeInTheDocument();
    });

    it("shows the branch_balanced tier label", () => {
      render(<InstitutionProfileCard institution={BRANCH_BALANCED} />);
      expect(screen.getByText(/branch.balanced/i)).toBeInTheDocument();
    });

    it("shows the hybrid tier label", () => {
      render(<InstitutionProfileCard institution={HYBRID} />);
      expect(screen.getByText("Hybrid")).toBeInTheDocument();
    });

    it("shows a plain-English explanation for branch_heavy", () => {
      render(<InstitutionProfileCard institution={BRANCH_HEAVY} />);
      expect(screen.getByText(/primarily branch-served/i)).toBeInTheDocument();
    });

    it("shows a plain-English explanation for branch_balanced", () => {
      render(<InstitutionProfileCard institution={BRANCH_BALANCED} />);
      expect(screen.getByText(/branch-centric/i)).toBeInTheDocument();
    });

    it("shows a plain-English explanation for hybrid", () => {
      render(<InstitutionProfileCard institution={HYBRID} />);
      expect(screen.getByText(/high digital density/i)).toBeInTheDocument();
    });

    it("shows members per branch", () => {
      render(<InstitutionProfileCard institution={BRANCH_HEAVY} />);
      expect(screen.getByText(/6,626/)).toBeInTheDocument();
    });
  });

  describe("operating costs section", () => {
    it("renders title-cased metric labels", () => {
      render(<InstitutionProfileCard institution={BRANCH_HEAVY} />);
      expect(screen.getByText("Total Operating Cost / Member")).toBeInTheDocument();
      expect(screen.getByText("Occupancy Cost / Member")).toBeInTheDocument();
    });

    it("renders opex per member", () => {
      render(<InstitutionProfileCard institution={BRANCH_HEAVY} />);
      expect(screen.getByText("$653")).toBeInTheDocument();
    });

    it("renders the hybrid opex benchmark values", () => {
      render(<InstitutionProfileCard institution={BRANCH_HEAVY} />);
      expect(screen.getByText("$317")).toBeInTheDocument(); // p25
      expect(screen.getByText("$430")).toBeInTheDocument(); // p50
      expect(screen.getByText("$582")).toBeInTheDocument(); // p75
    });

    it("renders the peer-range band label below opex", () => {
      render(<InstitutionProfileCard institution={BRANCH_HEAVY} />);
      expect(screen.getByText("High-Digital-Density Peer Range (Percentile)")).toBeInTheDocument();
    });

    it("renders 25th, 50th, 75th percentile column labels in the opex band", () => {
      render(<InstitutionProfileCard institution={BRANCH_HEAVY} />);
      expect(screen.getByText("25th")).toBeInTheDocument();
      expect(screen.getByText("50th")).toBeInTheDocument();
      expect(screen.getByText("75th")).toBeInTheDocument();
    });

    it("renders occupancy per member", () => {
      render(<InstitutionProfileCard institution={BRANCH_HEAVY} />);
      expect(screen.getByText("$32")).toBeInTheDocument();
    });
  });

  describe("revenue section", () => {
    it("renders title-cased metric labels", () => {
      render(<InstitutionProfileCard institution={BRANCH_HEAVY} />);
      expect(screen.getByText("Net Interest Margin")).toBeInTheDocument();
      expect(screen.getByText("Return on Assets")).toBeInTheDocument();
    });

    it("renders NIM", () => {
      render(<InstitutionProfileCard institution={BRANCH_HEAVY} />);
      expect(screen.getByText("2.6%")).toBeInTheDocument();
    });

    it("renders ROA", () => {
      render(<InstitutionProfileCard institution={BRANCH_HEAVY} />);
      expect(screen.getByText("1.3%")).toBeInTheDocument();
    });
  });

  describe("digital program ROA analysis section", () => {
    it("renders the section heading", () => {
      render(<InstitutionProfileCard institution={BRANCH_HEAVY} />);
      expect(screen.getByText("Digital Program ROA Analysis")).toBeInTheDocument();
    });

    it("renders the break-even deposit balance label", () => {
      render(<InstitutionProfileCard institution={BRANCH_HEAVY} />);
      expect(screen.getByText("Break-Even Deposit / Digital Member")).toBeInTheDocument();
    });

    it("renders the break-even value in ~$Xk format", () => {
      render(<InstitutionProfileCard institution={BRANCH_HEAVY} />);
      // BRANCH_HEAVY: NIM=2.553, ROA=1.305, spread≈1.0% → ~$23k
      expect(screen.getByText(/^~\$\d+(\.\d)?k$/)).toBeInTheDocument();
    });

    it("renders the Scenario B cannibalization drag label", () => {
      render(<InstitutionProfileCard institution={BRANCH_HEAVY} />);
      expect(screen.getByText("Scenario B Cannibalization Drag")).toBeInTheDocument();
    });

    it("renders the cannib drag value in bps format", () => {
      render(<InstitutionProfileCard institution={BRANCH_HEAVY} />);
      // Default: ~2 bps → 1 bps
      expect(screen.getByText(/\d+(\.\d)? bps → \d+(\.\d)? bps/)).toBeInTheDocument();
    });

    it("shows a green break-even for HYBRID (high NIM, low ROA)", () => {
      // HYBRID: NIM=3.891, ROA=0.676, spread≈2.965% → ~$8k → green
      render(<InstitutionProfileCard institution={HYBRID} />);
      const value = screen.getByText(/^~\$\d+(\.\d)?k$/);
      expect(value.className).toMatch(/emerald/);
    });

    it("shows an amber break-even for BRANCH_BALANCED (moderate spread)", () => {
      // BRANCH_BALANCED: NIM=3.548, ROA=1.409, spread≈1.889% → ~$12.5k → amber
      render(<InstitutionProfileCard institution={BRANCH_BALANCED} />);
      const value = screen.getByText(/^~\$\d+(\.\d)?k$/);
      expect(value.className).toMatch(/amber/);
    });

    it("description includes the institution's NIM", () => {
      render(<InstitutionProfileCard institution={BRANCH_HEAVY} />);
      // Description text includes NIM formatted as X.X%
      expect(screen.getByText(/2\.6% NIM/)).toBeInTheDocument();
    });
  });

  describe("digital density info modal", () => {
    const INSTITUTIONS = [BRANCH_HEAVY, BRANCH_BALANCED, HYBRID];

    it("renders an info button next to the Digital Density section", () => {
      render(<InstitutionProfileCard institution={BRANCH_HEAVY} institutions={INSTITUTIONS} />);
      expect(screen.getByRole("button", { name: /learn more about digital density/i })).toBeInTheDocument();
    });

    it("modal is not open by default", () => {
      render(<InstitutionProfileCard institution={BRANCH_HEAVY} institutions={INSTITUTIONS} />);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("clicking the info button opens the modal", async () => {
      const user = userEvent.setup();
      render(<InstitutionProfileCard institution={BRANCH_HEAVY} institutions={INSTITUTIONS} />);
      await user.click(screen.getByRole("button", { name: /learn more about digital density/i }));
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("modal contains the digital density legend tiles", async () => {
      const user = userEvent.setup();
      render(<InstitutionProfileCard institution={BRANCH_HEAVY} institutions={INSTITUTIONS} />);
      await user.click(screen.getByRole("button", { name: /learn more about digital density/i }));
      expect(screen.getByTestId("tile-hybrid")).toBeInTheDocument();
    });

    it("modal contains a definition of Digital Density", async () => {
      const user = userEvent.setup();
      render(<InstitutionProfileCard institution={BRANCH_HEAVY} institutions={INSTITUTIONS} />);
      await user.click(screen.getByRole("button", { name: /learn more about digital density/i }));
      expect(screen.getByText(/digital density measures members per branch/i)).toBeInTheDocument();
    });

    it("clicking the close button dismisses the modal", async () => {
      const user = userEvent.setup();
      render(<InstitutionProfileCard institution={BRANCH_HEAVY} institutions={INSTITUTIONS} />);
      await user.click(screen.getByRole("button", { name: /learn more about digital density/i }));
      await user.click(screen.getByRole("button", { name: /close/i }));
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });
});
