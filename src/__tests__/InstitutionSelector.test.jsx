import { render, screen, fireEvent, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import InstitutionSelector from "@/components/InstitutionSelector";

const INSTITUTIONS = [
  { CU_NUMBER: 1, CU_NAME: "AMERICA FIRST",        STATE: "UT", CITY: "RIVERDALE",  members: 1554689, digital_intensity: "branch_balanced" },
  { CU_NUMBER: 2, CU_NAME: "MOUNTAIN AMERICA",      STATE: "UT", CITY: "SANDY",      members: 1406629, digital_intensity: "branch_balanced" },
  { CU_NUMBER: 3, CU_NAME: "THE GOLDEN 1",          STATE: "CA", CITY: "SACRAMENTO", members: 1181184, digital_intensity: "branch_balanced" },
  { CU_NUMBER: 4, CU_NAME: "DIGITAL FCU",           STATE: "MA", CITY: "MARLBOROUGH",members: 100000,  digital_intensity: "hybrid" },
  { CU_NUMBER: 5, CU_NAME: "POLICE & FIRE",         STATE: "PA", CITY: "PHILADELPHIA",members: 80000,  digital_intensity: "hybrid" },
  { CU_NUMBER: 6, CU_NAME: "CONNEXUS",              STATE: "WI", CITY: "WAUSAU",     members: 490000,  digital_intensity: "hybrid" },
  { CU_NUMBER: 7, CU_NAME: "NAVY FEDERAL",          STATE: "VA", CITY: "VIENNA",     members: 13000000,digital_intensity: "branch_balanced" },
  { CU_NUMBER: 8, CU_NAME: "PENTAGON FEDERAL",      STATE: "VA", CITY: "MCLEAN",     members: 2900000, digital_intensity: "branch_balanced" },
  { CU_NUMBER: 9, CU_NAME: "ALLIANT",               STATE: "IL", CITY: "CHICAGO",    members: 800000,  digital_intensity: "branch_balanced" },
];

describe("InstitutionSelector", () => {
  describe("initial render", () => {
    it("renders a search input", () => {
      render(<InstitutionSelector institutions={INSTITUTIONS} onSelect={jest.fn()} />);
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    it("shows no dropdown list before the user types", () => {
      render(<InstitutionSelector institutions={INSTITUTIONS} onSelect={jest.fn()} />);
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });

    it("renders the instructional label", () => {
      render(<InstitutionSelector institutions={INSTITUTIONS} onSelect={jest.fn()} />);
      expect(screen.getByText(/credit union selector/i)).toBeInTheDocument();
    });

    it("renders the dataset context line with the institution count", () => {
      render(<InstitutionSelector institutions={INSTITUTIONS} onSelect={jest.fn()} />);
      expect(screen.getByText(/this model supports 9 federally insured credit unions/i)).toBeInTheDocument();
    });

    it("does not display the selected institution name inside the component", () => {
      render(
        <InstitutionSelector
          institutions={INSTITUTIONS}
          onSelect={jest.fn()}
          selected={INSTITUTIONS[2]}
        />
      );
      expect(screen.queryByText(/The Golden 1/i)).not.toBeInTheDocument();
    });
  });

  describe("search filtering", () => {
    it("shows matching results when the user types", async () => {
      const user = userEvent.setup();
      render(<InstitutionSelector institutions={INSTITUTIONS} onSelect={jest.fn()} />);
      await user.type(screen.getByRole("combobox"), "america");
      const listbox = screen.getByRole("listbox");
      expect(listbox).toBeInTheDocument();
      expect(within(listbox).getAllByRole("option")).toHaveLength(2);
    });

    it("filters case-insensitively", async () => {
      const user = userEvent.setup();
      render(<InstitutionSelector institutions={INSTITUTIONS} onSelect={jest.fn()} />);
      await user.type(screen.getByRole("combobox"), "GOLDEN");
      expect(within(screen.getByRole("listbox")).getAllByRole("option")).toHaveLength(1);
    });

    it("filters by state", async () => {
      const user = userEvent.setup();
      render(<InstitutionSelector institutions={INSTITUTIONS} onSelect={jest.fn()} />);
      await user.type(screen.getByRole("combobox"), "VA");
      const options = within(screen.getByRole("listbox")).getAllByRole("option");
      expect(options.length).toBeGreaterThanOrEqual(2);
      expect(options.every(o => o.textContent.includes("VA"))).toBe(true);
    });

    it("filters by city", async () => {
      const user = userEvent.setup();
      render(<InstitutionSelector institutions={INSTITUTIONS} onSelect={jest.fn()} />);
      await user.type(screen.getByRole("combobox"), "Chicago");
      expect(within(screen.getByRole("listbox")).getAllByRole("option")).toHaveLength(1);
    });

    it("title-cases institution names in results", async () => {
      const user = userEvent.setup();
      render(<InstitutionSelector institutions={INSTITUTIONS} onSelect={jest.fn()} />);
      await user.type(screen.getByRole("combobox"), "digital");
      expect(screen.getByText(/Digital Fcu/i)).toBeInTheDocument();
    });

    it("shows a no-results message when nothing matches", async () => {
      const user = userEvent.setup();
      render(<InstitutionSelector institutions={INSTITUTIONS} onSelect={jest.fn()} />);
      await user.type(screen.getByRole("combobox"), "zzznomatch");
      expect(screen.getByText(/no results/i)).toBeInTheDocument();
    });

    it("caps displayed results at 8", async () => {
      const user = userEvent.setup();
      render(<InstitutionSelector institutions={INSTITUTIONS} onSelect={jest.fn()} />);
      // single letter 'a' matches most entries
      await user.type(screen.getByRole("combobox"), "a");
      const options = within(screen.getByRole("listbox")).getAllByRole("option");
      expect(options.length).toBeLessThanOrEqual(8);
    });
  });

  describe("selection", () => {
    it("calls onSelect with the full institution object when an option is clicked", async () => {
      const user = userEvent.setup();
      const onSelect = jest.fn();
      render(<InstitutionSelector institutions={INSTITUTIONS} onSelect={onSelect} />);
      await user.type(screen.getByRole("combobox"), "golden");
      await user.click(within(screen.getByRole("listbox")).getAllByRole("option")[0]);
      expect(onSelect).toHaveBeenCalledWith(
        expect.objectContaining({ CU_NUMBER: 3, CU_NAME: "THE GOLDEN 1" })
      );
    });

    it("clears the search input after selection", async () => {
      const user = userEvent.setup();
      render(<InstitutionSelector institutions={INSTITUTIONS} onSelect={jest.fn()} />);
      await user.type(screen.getByRole("combobox"), "golden");
      await user.click(within(screen.getByRole("listbox")).getAllByRole("option")[0]);
      expect(screen.getByRole("combobox")).toHaveValue("");
    });

    it("closes the dropdown after selection", async () => {
      const user = userEvent.setup();
      render(<InstitutionSelector institutions={INSTITUTIONS} onSelect={jest.fn()} />);
      await user.type(screen.getByRole("combobox"), "golden");
      await user.click(within(screen.getByRole("listbox")).getAllByRole("option")[0]);
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });

  });
});
