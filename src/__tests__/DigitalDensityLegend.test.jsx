import { render, screen, within } from "@testing-library/react";
import DigitalDensityLegend from "@/components/DigitalDensityLegend";

const INSTITUTIONS = [
  { CU_NUMBER: 1, digital_intensity: "hybrid",          assets_b: 13.0, opex_per_member: 320, occupancy_per_member: 11, roa_pct: 0.68 },
  { CU_NUMBER: 2, digital_intensity: "hybrid",          assets_b: 5.0,  opex_per_member: 400, occupancy_per_member: 15, roa_pct: 0.50 },
  { CU_NUMBER: 3, digital_intensity: "branch_balanced", assets_b: 8.0,  opex_per_member: 500, occupancy_per_member: 25, roa_pct: 0.80 },
  { CU_NUMBER: 4, digital_intensity: "branch_balanced", assets_b: 4.0,  opex_per_member: 600, occupancy_per_member: 35, roa_pct: 0.60 },
  { CU_NUMBER: 5, digital_intensity: "branch_heavy",    assets_b: 2.0,  opex_per_member: 700, occupancy_per_member: 40, roa_pct: 0.70 },
];

describe("DigitalDensityLegend", () => {
  describe("tier tiles", () => {
    it("renders a tile for each of the three tiers", () => {
      render(<DigitalDensityLegend institutions={INSTITUTIONS} />);
      expect(screen.getAllByText(/^hybrid$/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/branch.balanced/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/branch.heavy/i).length).toBeGreaterThanOrEqual(1);
    });

    it("does not render very digital or digital-leaning tiles", () => {
      render(<DigitalDensityLegend institutions={INSTITUTIONS} />);
      expect(screen.queryByTestId("tile-very_digital")).not.toBeInTheDocument();
      expect(screen.queryByTestId("tile-digital_leaning")).not.toBeInTheDocument();
    });

    it("shows three tiles", () => {
      render(<DigitalDensityLegend institutions={INSTITUTIONS} />);
      expect(screen.getAllByRole("article")).toHaveLength(3);
    });

    it("shows the correct count for a tier with data", () => {
      render(<DigitalDensityLegend institutions={INSTITUTIONS} />);
      const hybridTile = screen.getByTestId("tile-hybrid");
      expect(within(hybridTile).getByText("2")).toBeInTheDocument();
    });

    it("shows the word 'Institutions' next to the count in each tile", () => {
      render(<DigitalDensityLegend institutions={INSTITUTIONS} />);
      const hybridTile = screen.getByTestId("tile-hybrid");
      expect(within(hybridTile).getByText(/institutions/i)).toBeInTheDocument();
    });

    it("shows the members-per-branch range for each tier", () => {
      render(<DigitalDensityLegend institutions={INSTITUTIONS} />);
      expect(screen.getByText(/20K.50K/i)).toBeInTheDocument();
      expect(screen.getByText(/10K.20K/i)).toBeInTheDocument();
      expect(screen.getByText(/under 10K/i)).toBeInTheDocument();
    });
  });

  describe("footnote", () => {
    it("renders a footnote about the dataset scope", () => {
      render(<DigitalDensityLegend institutions={INSTITUTIONS} />);
      expect(screen.getByText(/fewer than a handful.*50k members per branch/i)).toBeInTheDocument();
    });

  });

  describe("metrics table", () => {
    it("renders a row for each of the four metrics", () => {
      render(<DigitalDensityLegend institutions={INSTITUTIONS} />);
      expect(screen.getByText(/avg assets/i)).toBeInTheDocument();
      expect(screen.getByText(/opex per member/i)).toBeInTheDocument();
      expect(screen.getByText(/occupancy per member/i)).toBeInTheDocument();
      expect(screen.getByText(/return on assets/i)).toBeInTheDocument();
    });

    it("computes and displays the average assets for a tier", () => {
      render(<DigitalDensityLegend institutions={INSTITUTIONS} />);
      // hybrid avg assets = (13.0 + 5.0) / 2 = 9.0 → $9.0B
      expect(screen.getByTestId("cell-hybrid-assets")).toHaveTextContent("$9.0B");
    });

    it("computes and displays average opex for a tier", () => {
      render(<DigitalDensityLegend institutions={INSTITUTIONS} />);
      // hybrid avg opex = (320 + 400) / 2 = 360
      expect(screen.getByTestId("cell-hybrid-opex")).toHaveTextContent("$360");
    });

    it("computes and displays average occupancy for a tier", () => {
      render(<DigitalDensityLegend institutions={INSTITUTIONS} />);
      // hybrid avg occupancy = (11 + 15) / 2 = 13
      expect(screen.getByTestId("cell-hybrid-occupancy")).toHaveTextContent("$13");
    });

    it("computes and displays average ROA for a tier", () => {
      render(<DigitalDensityLegend institutions={INSTITUTIONS} />);
      // hybrid avg roa = (0.68 + 0.50) / 2 = 0.59 → 0.590%
      expect(screen.getByTestId("cell-hybrid-roa")).toHaveTextContent("0.590%");
    });

    it("shows a dash for a tier with no institutions", () => {
      const noHybrid = INSTITUTIONS.filter(i => i.digital_intensity !== "hybrid");
      render(<DigitalDensityLegend institutions={noHybrid} />);
      expect(screen.getByTestId("cell-hybrid-assets")).toHaveTextContent("—");
    });
  });
});
