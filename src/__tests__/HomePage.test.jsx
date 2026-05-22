import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import HomePage from "@/app/page";

const BASE_INSTITUTION = {
  assets_b: 10.0, branch_count: 50, fte_equiv: 1000,
  members_per_branch: 15000, members_per_fte: 400,
  opex_per_member: 402, occupancy_per_member: 21,
  nim_pct: 3.5, roa_pct: 1.4,
  member_gap_to_hybrid: 100000, branch_surplus_vs_hybrid: 5,
  opex_gap_vs_hybrid_median: -28, occupancy_gap_vs_hybrid_median: 4,
  hybrid_opex_p25: 317, hybrid_opex_p50: 430, hybrid_opex_p75: 582,
  hybrid_occupancy_p50: 17, hybrid_nim_p50: 2.657, hybrid_roa_p50: 0.622,
};

const MOCK_INSTITUTIONS = [
  { ...BASE_INSTITUTION, CU_NUMBER: 3, CU_NAME: "THE GOLDEN 1", STATE: "CA", CITY: "SACRAMENTO", members: 1181184, digital_intensity: "branch_balanced" },
  { ...BASE_INSTITUTION, CU_NUMBER: 4, CU_NAME: "DIGITAL FCU",  STATE: "MA", CITY: "MARLBOROUGH", members: 100000,  digital_intensity: "hybrid" },
  ...Array.from({ length: 456 }, (_, i) => ({
    ...BASE_INSTITUTION,
    CU_NUMBER: i + 10,
    CU_NAME: `CREDIT UNION ${i}`,
    STATE: "TX",
    CITY: "AUSTIN",
    members: 10000,
    digital_intensity: "branch_heavy",
  })),
];

const MOCK_DATA = {
  metadata: {
    source: "NCUA 5300 Call Report Q4 2025",
    generated: "2025-12-31",
    total_institutions: 462,
    target_count: 441,
    benchmark_count: 17,
    excluded_count: 4,
    digital_intensity_thresholds: {},
  },
  hybrid_benchmark: {},
  target_summary: {},
  institutions: MOCK_INSTITUTIONS,
};

beforeEach(() => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve(MOCK_DATA),
    })
  );
  jest.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("HomePage — data loading", () => {
  it("fetches ncua_model_data.json from the public folder", async () => {
    render(<HomePage />);
    await waitFor(() => expect(fetch).toHaveBeenCalledWith("/ncua_model_data.json"));
  });


  it("renders the institution selector after data loads", async () => {
    render(<HomePage />);
    await waitFor(() =>
      expect(screen.getByRole("combobox")).toBeInTheDocument()
    );
  });

  it("shows a loading state before data arrives", () => {
    // Never resolves — fetch hangs
    global.fetch = jest.fn(() => new Promise(() => {}));
    render(<HomePage />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("shows an error message when fetch fails", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({ ok: false, status: 500 })
    );
    render(<HomePage />);
    await waitFor(() =>
      expect(screen.getByText(/failed to load/i)).toBeInTheDocument()
    );
  });
});

describe("HomePage — institution selector wiring", () => {
  it("renders the institution selector search input after data loads", async () => {
    render(<HomePage />);
    await waitFor(() =>
      expect(screen.getByRole("combobox")).toBeInTheDocument()
    );
  });

  it("shows the title-cased institution name in the profile card after selection", async () => {
    const user = userEvent.setup();
    render(<HomePage />);
    await waitFor(() => screen.getByRole("combobox"));

    await user.type(screen.getByRole("combobox"), "golden");
    await user.click(within(screen.getByRole("listbox")).getAllByRole("option")[0]);

    expect(screen.getByText(/The Golden 1/i)).toBeInTheDocument();
  });

  it("shows the title-cased city name in the profile card after selection", async () => {
    const user = userEvent.setup();
    render(<HomePage />);
    await waitFor(() => screen.getByRole("combobox"));

    await user.type(screen.getByRole("combobox"), "golden");
    await user.click(within(screen.getByRole("listbox")).getAllByRole("option")[0]);

    expect(screen.getByText(/Sacramento/i)).toBeInTheDocument();
    expect(screen.queryByText(/SACRAMENTO/)).not.toBeInTheDocument();
  });
});
