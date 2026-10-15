import { isAbn, isTradeType, normaliseVouchAttributes } from "../../utils/vouchRules";

describe("normaliseVouchAttributes", () => {
  it("accepts two or more attributes from the fixed list", () => {
    expect(normaliseVouchAttributes(["Honest", "Reliable"])).toEqual(["Honest", "Reliable"]);
  });

  it("rejects fewer than two", () => {
    expect(normaliseVouchAttributes(["Honest"])).toBeNull();
    expect(normaliseVouchAttributes([])).toBeNull();
  });

  it("counts a repeated attribute once", () => {
    expect(normaliseVouchAttributes(["Honest", "Honest"])).toBeNull();
    expect(normaliseVouchAttributes(["Honest", "Honest", "Reliable"])).toEqual([
      "Honest",
      "Reliable",
    ]);
  });

  it("rejects anything outside the list, and non-arrays", () => {
    expect(normaliseVouchAttributes(["Honest", "Never pays"])).toBeNull();
    expect(normaliseVouchAttributes(["Honest", { $ne: null }])).toBeNull();
    expect(normaliseVouchAttributes("Honest,Reliable")).toBeNull();
    expect(normaliseVouchAttributes(undefined)).toBeNull();
  });
});

describe("isAbn", () => {
  it("accepts exactly 11 digits", () => {
    expect(isAbn("51824753556")).toBe(true);
  });

  it("rejects spaced, short, and non-string values", () => {
    expect(isAbn("51 824 753 556")).toBe(false);
    expect(isAbn("1234")).toBe(false);
    expect(isAbn({ $ne: null })).toBe(false);
  });
});

describe("isTradeType", () => {
  it("accepts only listed trades", () => {
    expect(isTradeType("Carpentry")).toBe(true);
    expect(isTradeType("carpentry")).toBe(false);
    expect(isTradeType("Anything I like")).toBe(false);
    expect(isTradeType(42)).toBe(false);
  });
});
