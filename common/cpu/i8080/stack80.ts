import { getMemoryWord, Memory, setMemoryWord } from "../../memory/Memory";
import { Registers80 } from "./Registers80";

export const push = (regs: Registers80, memory: Memory, value: number) => {
  const addr = regs.getSP() - 2;
  setMemoryWord(memory, addr, value);
  regs.setSP(addr);
}

export const pop = (regs: Registers80, memory: Memory): number => {
  const addr = regs.getSP();
  regs.setSP(addr + 2);
  return getMemoryWord(memory, addr);
}

/**
 * Получить адрес перехода для команды ret
 * @param regs 
 * @param memory 
 */
export const getRetAddr = (regs: Registers80, memory: Memory): number => {
  const pointer = regs.getSP();
  return getMemoryWord(memory, pointer);
}