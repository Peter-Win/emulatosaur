const { isCondition80 } = require("./isCondition80");
const { P80FlagMask } = require("./Registers80");

describe("isCondition80", () => {
  it("NZ", () => {
    // rnz
    expect(isCondition80(0, 0xC0)).toBe(true);
    expect(isCondition80(P80FlagMask.Z | P80FlagMask.Default, 0xC0)).toBe(false);
  })
  it("Z", () => {
    // jz
    expect(isCondition80(0, 0xCA)).toBe(false);
    expect(isCondition80(P80FlagMask.Z | P80FlagMask.Default, 0xCA)).toBe(true);
  })
  it("NC", () => {
    // CNC
    expect(isCondition80(0, 0xD4)).toBe(true);
    expect(isCondition80(P80FlagMask.C | P80FlagMask.Default, 0xD4)).toBe(false);
  })
  it("C", () => {
    // RC
    expect(isCondition80(0, 0xD8)).toBe(false);
    expect(isCondition80(P80FlagMask.C | P80FlagMask.Default, 0xD8)).toBe(true);
  })
  it("PO", () => {
    // JPO
    expect(isCondition80(0, 0xE2)).toBe(true);
    expect(isCondition80(P80FlagMask.P | P80FlagMask.Default, 0xE2)).toBe(false);
  })
  it("PE", () => {
    // JPE
    expect(isCondition80(0, 0xEA)).toBe(false);
    expect(isCondition80(P80FlagMask.P | P80FlagMask.Default, 0xEA)).toBe(true);
  })
  it("P", () => {
    // RP
    expect(isCondition80(0, 0xF0)).toBe(true);
    expect(isCondition80(P80FlagMask.S | P80FlagMask.Default, 0xF0)).toBe(false);
  })
  it("M", () => {
    // CM
    expect(isCondition80(0, 0xFC)).toBe(false);
    expect(isCondition80(P80FlagMask.S | P80FlagMask.Default, 0xFC)).toBe(true);
  })
})