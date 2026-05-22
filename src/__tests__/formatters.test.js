import { toTitleCase } from "@/lib/formatters";

describe("toTitleCase", () => {
  it("lowercases all caps input", () => {
    expect(toTitleCase("AMERICA FIRST")).toBe("America First");
  });

  it("handles mixed case input", () => {
    expect(toTitleCase("the golden 1")).toBe("The Golden 1");
  });

  it("handles small words correctly", () => {
    expect(toTitleCase("POLICE & FIRE")).toBe("Police & Fire");
  });

  it("handles single word", () => {
    expect(toTitleCase("DIGITAL")).toBe("Digital");
  });

  it("returns empty string for empty input", () => {
    expect(toTitleCase("")).toBe("");
  });
});

import { formatCurrency, formatPct, formatAssets, formatCount } from "@/lib/formatters";

describe("formatCurrency", () => {
  it("formats whole dollars with $ prefix", () => {
    expect(formatCurrency(430)).toBe("$430");
  });
  it("formats negative values", () => {
    expect(formatCurrency(-28)).toBe("-$28");
  });
  it("rounds to nearest dollar", () => {
    expect(formatCurrency(430.7)).toBe("$431");
  });
});

describe("formatPct", () => {
  it("formats a decimal as a percentage to one decimal place", () => {
    expect(formatPct(2.657)).toBe("2.7%");
  });
  it("formats zero", () => {
    expect(formatPct(0)).toBe("0.0%");
  });
});

describe("formatAssets", () => {
  it("formats billions to one decimal with B suffix", () => {
    expect(formatAssets(15.953)).toBe("$15.9B");
  });
  it("formats less than 1 billion", () => {
    expect(formatAssets(0.85)).toBe("$0.8B");
  });
});

describe("formatCount", () => {
  it("formats large numbers with commas", () => {
    expect(formatCount(1554689)).toBe("1,554,689");
  });
  it("formats small numbers", () => {
    expect(formatCount(79)).toBe("79");
  });
});
