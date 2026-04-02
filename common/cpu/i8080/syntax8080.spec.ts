import {syntax8080} from "./syntax8080";

describe("syntax8080", () => {
  it("lxi", () => {
    expect(syntax8080["mov r16,i16"](1, 0x1234)).toBe("lxi D, 1234H");
    expect(syntax8080["mov r16,i16"](2, 0xABCF)).toBe("lxi H, 0ABCFH");
  })
})