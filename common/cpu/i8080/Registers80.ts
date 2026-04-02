import {Memory} from "../../memory/Memory";

export type P80Reg8Name = "A" | "B" | "C" | "D" | "E" | "H" | "L" | "M";
export type P80Reg16Name = "BC" | "DE" | "HL" | "SP" | "PSW" | "PC";

export enum P80FlagMask {
  C = 0x01,
  Default = 0x02,
  P = 0x04,
  AC = 0x10,
  Z = 0x40,
  S = 0x80,
}
export const P80Reg8NameByIndex: P80Reg8Name[] = [
  "B", "C", "D", "E", "H", "L", "M", "A",
];

export enum P80Reg8Index { B, C, D, E, H, L, M, A}
export enum P80Reg16Index { BC, DE, HL, SP }
// Для push/pop
export enum P80Reg16sIndex { BC, DE, HL, PSW }

export class Registers80 {
  constructor () {
    this.regs = new Uint8Array(12);
    this.regs16 = new DataView(this.regs.buffer);
  }
  protected regs: Uint8Array;
  protected regs16: DataView;

  // internal access to 16 bit
  protected get16(offset: number) {
    // Используется big-endian, т.к. старший регистр идёт перед младшим
    return this.regs16.getUint16(offset, false);
  }
  protected set16(offset: number, value: number) {
    this.regs16.setUint16(offset, value, false);
  }

  // internal access to 8 bit
  protected get8(intIndex: number, mem: Memory): number {
    if (intIndex < 0) { // M
      const addr = this.get16(Reg16intPos.HL);
      return mem.getByte(addr);
    } else {
      return this.regs[intIndex]!;
    }
  }
  protected set8(ii: number, value: number, mem: Memory) {
    if (ii < 0) { // M
      const addr = this.get16(Reg16intPos.HL);
      mem.setByte(addr, value);
    } else {
      this.regs[ii] = value;
    }
  }

  get8ndx(stdIndex: number, mem: Memory): number {
    return this.get8(cvtR8std2int[stdIndex]!, mem);
  }
  set8ndx(stdIndex: number, value: number, mem: Memory) {
    return this.set8(cvtR8std2int[stdIndex]!, value, mem);
  }
  get8id(id: P80Reg8Name, mem: Memory) {
    const i = cvtR8Name2int[id];
    if (i === undefined) throw Error(`Invalid 8-bit register name ${id}`);
    return this.get8(i, mem);
  }
  set8id(id: P80Reg8Name, value: number, mem: Memory) {
    const i = cvtR8Name2int[id];
    if (i === undefined) throw Error(`Invalid 8-bit register name ${id}`);
    return this.set8(i, value, mem);
  }
  getA(): number {
    return this.regs[6]!;
  }
  setA(value: number) {
    this.regs[6] = value;
  }

  /**
   * Доступ по индексу из кода команд типа LXI, кроме pop/push
   * @param stdIndex 
   */
  get16ndx(stdIndex: number): number {
    return this.get16(cvtR16std2offset[stdIndex]!);
  }
  set16ndx(stdIndex: number, value: number) {
    this.set16(cvtR16std2offset[stdIndex]!, value);
  }

  /**
   * Доступ по индексу из кода для команд pop/push
   * @param stdIndexStk 
   */
  get16ndxStk(stdIndexStk: number): number {
    return this.get16(cvtR16stdStk2offset[stdIndexStk]!);
  }
  set16ndxStk(stdIndexStk: number, value: number) {
    this.set16(cvtR16stdStk2offset[stdIndexStk]!, value);
  }

  get16id(id: P80Reg16Name): number {
    return this.get16(cvtR16Name2offset[id])
  }
  set16id(id: P80Reg16Name, value: number) {
    this.set16(cvtR16Name2offset[id], value);
  }



  getFlags(): number {
    return this.regs[7]!;
  }
  setFlags(value: number) {
    this.regs[7] = value;
  }
  setFlag(mask: P80FlagMask, on: boolean) {
    const prevFlags = this.getFlags();
    this.setFlags(on ? (prevFlags | mask) : (prevFlags & ~mask));
  }
  /**
   * @param value 0 | 1
   */
  setFlagC(value: number) {
    this.regs[7] = (this.regs[7]! & 0xFE) | value;
  }
  isFlagC() {
    return !!(this.getFlags() & P80FlagMask.C);
  }
  isFlagZ() {
    return !!(this.getFlags() & P80FlagMask.Z);
  }
  isFlagS() {
    return !!(this.getFlags() & P80FlagMask.S);
  }
  isFlagP() {
    return !!(this.getFlags() & P80FlagMask.P);
  }
  isFlagAC() {
    return !!(this.getFlags() & P80FlagMask.AC);
  }

  getB() {
    return this.regs[0];
  }
  setB(value: number) {
    return this.regs[0] = value;
  }
  getC() {
    return this.regs[1];
  }
  setC(value: number) {
    return this.regs[1] = value;
  }
  getD() {
    return this.regs[2];
  }
  setD(value: number) {
    return this.regs[2] = value;
  }
  getE() {
    return this.regs[3];
  }
  setE(value: number) {
    return this.regs[3] = value;
  }
  getH() {
    return this.regs[4];
  }
  setH(value: number) {
    return this.regs[4] = value;
  }
  getL() {
    return this.regs[5];
  }
  setL(value: number) {
    return this.regs[5] = value;
  }
  getPSW() {
    return this.get16(Reg16intPos.PSW);
  }
  setPSW(value: number) {
    this.set16(Reg16intPos.PSW, value);
  }
  getHL(): number {
    return this.get16(Reg16intPos.HL);
  }
  setHL(value: number) {
    this.set16(Reg16intPos.HL, value);
  }
  getPC(): number {
    return this.get16(Reg16intPos.PC);
  }
  setPC(value: number) {
    this.set16(Reg16intPos.PC, value);
  }
  getSP(): number {
    return this.get16(Reg16intPos.SP);
  }
  setSP(value: number) {
    this.set16(Reg16intPos.SP, value);
  }
}

// Структура хранения регистров
// Связано с тем, что 
//  Bytes         Words
//  0   B         0  BC
//  1   C
//  2   D         1  DE
//  3   E
//  4   H         2  HL
//  5   L
//  6   A         3  PSW
//  7   F
//  8   -         4  SP
//  9   -
//  10  -         5  PC
//  11  -
//  -1  M

const cvtR8std2int: number[] = [0, 1, 2, 3, 4, 5, -1, 6];
const enum Reg16intPos {
  BC = 0,
  DE = 2,
  HL = 4,
  PSW = 6,
  SP = 8,
  PC = 10,
}
const cvtR8Name2int: Record<P80Reg8Name, number> = {
  A: 6,
  B: 0,
  C: 1,
  D: 2,
  E: 3,
  H: 4,
  L: 5,
  M: -1,
}

// Смещения 16-разрядных р-ров для индексов из кодов операций типа LXI, но не POP/PUSH
const cvtR16std2offset: number[] = [
  Reg16intPos.BC,
  Reg16intPos.DE,
  Reg16intPos.HL,
  Reg16intPos.SP
];

const cvtR16stdStk2offset: number[] = [
  Reg16intPos.BC,
  Reg16intPos.DE,
  Reg16intPos.HL,
  Reg16intPos.PSW,
];

const cvtR16Name2offset: Record<P80Reg16Name, number> = {
  BC: Reg16intPos.BC,
  DE: Reg16intPos.DE,
  HL: Reg16intPos.HL,
  SP: Reg16intPos.SP,
  PSW: Reg16intPos.PSW,
  PC: Reg16intPos.PC,
}
