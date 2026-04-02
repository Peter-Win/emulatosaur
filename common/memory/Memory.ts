export interface Memory {
  readonly size: number;
  getByte(addr: number): number;
  setByte(addr: number, value: number): void;
  getWord?(addr: number): number;
  setWord?(addr: number, value: number): void;
  read?(addr: number, size: number): Uint8Array;
  write?(addr: number, size: number, buffer: Uint8Array, offset?: number): void;
  fill?(addr: number, size: number, byte: number): void;
}

export const setMemoryWord = (mem: Memory, addr: number, word: number) => {
  if (mem.setWord) {
    mem.setWord(addr, word);
  } else {
    // Предполагается Little-endian, т.к. это типичный вариант.
    mem.setByte(addr, word & 0xFF);
    mem.setByte(addr + 1, word >> 8);
  }
}

export const getMemoryWord = (mem: Memory, addr: number): number =>
  mem.getWord?.(addr) ?? (mem.getByte(addr + 1) << 8) | mem.getByte(addr); 

export const readMemory = (mem: Memory, addr: number, size: number): Uint8Array => {
  if (mem.read) {
    return mem.read(addr, size);
  }
  const result = new Uint8Array(size);
  let srcPos = addr;
  const srcEnd = Math.min(addr + size, mem.size);
  let dstPos = 0;
  while (srcPos < srcEnd) {
    result[dstPos++] = mem.getByte(srcPos++);
  }
  return result;
}

export const writeMemory = (mem: Memory, addr: number, size: number, buffer: Uint8Array, offset?: number) => {
  if (mem.write) {
    mem.write(addr, addr, buffer, offset);
  } else {
    let dstPos = addr;
    const dstEnd = Math.min(addr + size, mem.size);
    let srcPos = offset ?? 0;
    while (dstPos < dstEnd) {
      mem.setByte(dstPos++, buffer[srcPos++]!);
    }
  }
}

export const fillMemory = (mem: Memory, addr: number, size: number, byte: number) => {
  if (mem.fill) {
    mem.fill(addr, size, byte);
  } else {
    let dstPos = addr;
    const dstEnd = Math.min(addr + size, mem.size);
    while (dstPos < dstEnd) {
      mem.setByte(dstPos++, byte);
    }
  }
}