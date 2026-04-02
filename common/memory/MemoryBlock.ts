export type MemoryBlock = {
  begin: number;
  end: number;
  // addr - абсолютный адрес
  getByte(addr: number): number;
  setByte(addr: number, value: number): void;
}
