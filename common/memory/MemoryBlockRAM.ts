import { MemoryBlock } from "./MemoryBlock"

export type MemoryBlockRAM = MemoryBlock & {
  buffer: Uint8Array;
}

export const createMemoryBlockRAM = (begin: number, end: number): MemoryBlockRAM => ({
  begin,
  end,
  buffer: new Uint8Array(end-begin),
  getByte(addr: number) {
    return this.buffer[addr - begin]!;
  },
  setByte(addr: number, value: number) {
    this.buffer[addr - begin] = value;
  },
});