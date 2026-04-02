import {syntaxZ80} from "./syntaxZ80";

describe("syntax8080", () => {
  it("lxi", () => {
    expect(syntaxZ80["mov r16,i16"](1, 0x1234)).toBe("ld DE, $1234");
    expect(syntaxZ80["mov r16,i16"](2, 0xABCF)).toBe("ld HL, $ABCF");
  })
})