import { MemoryBlock } from "./MemoryBlock"

export type MemoryBlockROM = MemoryBlock & {
  buffer: Uint8Array;
}

export const createMemoryBlockROM = (begin: number, buffer: Uint8Array): MemoryBlockROM => ({
  begin,
  end: begin + buffer.length,
  buffer,
  getByte(addr: number) {
    return this.buffer[addr - begin]!;
  },
  setByte(addr: number, value: number) {
  },
});