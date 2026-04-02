import { hexDump, hexWord } from "../../format";
import { SimpleMemory } from "../../memory/SimpleMemory";
import {P80Reg16Index, P80Reg16sIndex, P80Reg8Index, Registers80} from "./Registers80";

describe("Registers80", () => {
  const mem = new SimpleMemory(16);
  it("A", () => {
    const r = new Registers80();
    r.set8id("A", 0x55, mem)
    expect(r.get8id("A", mem)).toBe(0x55);
    expect(r.get8ndx(P80Reg8Index.A, mem)).toBe(0x55);
    expect(r.get16id("PSW")).toBe(0x5500);
  })
  it("B,C", () => {
    const r = new Registers80();
    r.set8id("B", 0xBB, mem)
    r.set8id("C", 0x22, mem)
    expect(r.get8id("B", mem)).toBe(0xBB);
    expect(r.get8ndx(P80Reg8Index.B, mem)).toBe(0xBB);
    expect(r.get8id("C", mem)).toBe(0x22);
    expect(r.get8ndx(P80Reg8Index.C, mem)).toBe(0x22);
    expect(hexWord(r.get16id("BC"))).toBe("BB22");
  })
  it("D,E", () => {
    const r = new Registers80();
    r.set8id("D", 0x12, mem)
    r.set8id("E", 0x34, mem)
    expect(r.get8id("D", mem)).toBe(0x12);
    expect(r.get8ndx(P80Reg8Index.D, mem)).toBe(0x12);
    expect(r.get8id("E", mem)).toBe(0x34);
    expect(r.get8ndx(P80Reg8Index.E, mem)).toBe(0x34);
    expect(hexWord(r.get16id("DE"))).toBe("1234");
  })
  it("H,L", () => {
    const r = new Registers80();
    r.set8id("H", 0xAB, mem)
    r.set8id("L", 0xCD, mem)
    expect(r.get8id("H", mem)).toBe(0xAB);
    expect(r.get8ndx(P80Reg8Index.H, mem)).toBe(0xAB);
    expect(r.get8id("L", mem)).toBe(0xCD);
    expect(r.get8ndx(P80Reg8Index.L, mem)).toBe(0xCD);
    expect(hexWord(r.get16id("HL"))).toBe("ABCD");
  })
  it("HL, M", () => {
    const r = new Registers80();
    const m = new SimpleMemory(16);
    m.setByte(1, 0x89);
    r.set16id("HL", 1);
    expect(hexWord(r.get16id("HL"))).toBe("0001");
    expect(r.get8id("M", m)).toBe(0x89);
    expect(r.get8ndx(P80Reg8Index.M, m)).toBe(0x89);

    r.set8id("L", 2, m);
    expect(hexWord(r.get16ndx(P80Reg16Index.HL))).toBe("0002");
    r.set8ndx(P80Reg8Index.M, 0xD5, m);
    expect(r.get8id("M", m)).toBe(0xD5);
    expect(m.buffer[2]).toBe(0xD5);

    r.set16ndx(P80Reg16Index.HL, 3);
    r.set8id("M", 0x1F, m);
    expect(r.get8ndx(P80Reg8Index.M, m)).toBe(0x1F);

    expect(hexDump(m.buffer, " ", 4)).toBe("00 89 D5 1F");
  })
  it("SP", () => {
    const r = new Registers80();
    r.set16ndx(P80Reg16Index.SP, 0x7654);
    expect(hexWord(r.get16id("SP"))).toBe("7654");
    expect(hexWord(r.get16ndx(P80Reg16Index.SP))).toBe("7654");
  })
  it("PSW", () => {
    const r = new Registers80();
    r.set16ndxStk(P80Reg16sIndex.PSW, 0xFE83);
    expect(hexWord(r.get16id("PSW"))).toBe("FE83");
    expect(hexWord(r.get16ndxStk(P80Reg16sIndex.PSW))).toBe("FE83");
    expect(r.get8id("A", mem)).toBe(0xFE);
    expect(r.getA()).toBe(0xFE);
    expect(r.getFlags()).toBe(0x83);
  })

})
