import { Memory } from "./Memory";

export class SimpleMemory implements Memory {
  constructor(public readonly size: number) {
    this.buffer = new Uint8Array(size);
    this.buffer.fill(0);
  }
  buffer: Uint8Array;
  setByte(addr: number, byte: number) {
    this.buffer[addr] = byte;
  }
  getByte(addr: number): number {
    return this.buffer[addr];
  }
};
