import { fullName, splitLegacyName } from "../../utils/name";

describe("fullName", () => {
  it("joins both halves", () => {
    expect(fullName("Alex", "Smith")).toBe("Alex Smith");
  });

  it("returns just the first name when there is no surname", () => {
    expect(fullName("Alex", "")).toBe("Alex");
    expect(fullName("Alex", undefined)).toBe("Alex");
    expect(fullName("Alex", null)).toBe("Alex");
  });

  it("trims each half rather than leaving a double space", () => {
    expect(fullName("  Alex  ", "  Smith  ")).toBe("Alex Smith");
  });

  it("returns an empty string when both halves are missing", () => {
    expect(fullName(undefined, undefined)).toBe("");
    expect(fullName("", "")).toBe("");
  });
});

describe("splitLegacyName", () => {
  it("splits on the first space, surname keeps the rest", () => {
    expect(splitLegacyName("Alex Smith")).toEqual({ firstName: "Alex", lastName: "Smith" });
    expect(splitLegacyName("Mary Anne Van Der Berg")).toEqual({
      firstName: "Mary",
      lastName: "Anne Van Der Berg",
    });
  });

  it("leaves the surname empty for a single-word name", () => {
    expect(splitLegacyName("Cher")).toEqual({ firstName: "Cher", lastName: "" });
  });

  it('drops the literal "-" the old sign-up screen wrote as a surname', () => {
    expect(splitLegacyName("Cher -")).toEqual({ firstName: "Cher", lastName: "" });
  });

  it("collapses irregular whitespace", () => {
    expect(splitLegacyName("  Alex   Smith  ")).toEqual({ firstName: "Alex", lastName: "Smith" });
  });

  it("handles missing input", () => {
    expect(splitLegacyName("")).toEqual({ firstName: "", lastName: "" });
    expect(splitLegacyName(undefined)).toEqual({ firstName: "", lastName: "" });
  });
});
