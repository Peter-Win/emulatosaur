import { hexDump } from "../format";
import { getMemoryWord, readMemory, setMemoryWord, writeMemory, fillMemory } from "./Memory";
import { SimpleMemory } from "./SimpleMemory";

describe("SimpleMemory", () => {
  it("setByte/getByte", () => {
    const mem = new SimpleMemory(1024);
    mem.setByte(10, 0x55);
    expect(mem.buffer[10]).toBe(0x55);
    expect(mem.getByte(10)).toBe(0x55);
  })
  it("getWord/setWord", () => {
    const mem = new SimpleMemory(1024);
    setMemoryWord(mem, 10, 0x1234);
    expect(mem.buffer[10]).toBe(0x34);
    expect(mem.buffer[11]).toBe(0x12);
    expect(getMemoryWord(mem, 10)).toBe(0x1234);
  })
  it("readMemory/writeMemory", () => {
    const mem = new SimpleMemory(16);
    writeMemory(mem, 2, 4, new Uint8Array([0xFF, 0xEE, 0x88, 0x55, 0x44, 0x22]), 1);
    expect(hexDump(mem.buffer, " ", 8)).toBe("00 00 EE 88 55 44 00 00");
    const buf = readMemory(mem, 1, 7);
    expect(hexDump(buf, " ")).toBe("00 EE 88 55 44 00 00");
  })
  it("fillMemory", () => {
    const mem = new SimpleMemory(10);
    fillMemory(mem, 2, 5, 0xAA);
    expect(hexDump(mem.buffer, " ")).toBe("00 00 AA AA AA AA AA 00 00 00");
  })
})