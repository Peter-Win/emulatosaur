import { Memory } from "./Memory";
import { MemoryBlock } from "./MemoryBlock";

export class CompositeMemory implements Memory {
  constructor(public readonly blocks: MemoryBlock[]) {
    // Пока считаем, что память всегда начинается с 0
    // А размер определяется последним блоком
    const maxPos = blocks.reduce((acc, {end}) => Math.max(acc, end), 0);
    this.size = maxPos;
  }
  size: number;
  findBlock(addr: number): MemoryBlock | undefined {
    return this.blocks.find(({begin, end}) => begin <= addr && addr < end);
  }
  getByte(addr: number): number {
    return this.findBlock(addr)?.getByte(addr) ?? 0;
  }
  setByte(addr: number, value: number): void {
    this.findBlock(addr)?.setByte(addr, value);
  }
}