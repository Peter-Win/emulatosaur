import { Memory } from "../../memory/Memory";
import { Registers80 } from "./Registers80";
import { push } from "./stack80";

/**
 * Вызов прерывания
 * @param intNumber Номер прерывания [0..7]
 * @param regs 
 * @param memory 
 * @param opSize 0 = by hardware, 1 = by RST command
 */
export const callInterrupt80 = (intNumber: number, regs: Registers80, memory: Memory, opSize: 0|1) => {
  const addr = intNumber * 8;
  push(regs, memory, regs.getPC() + opSize);
  regs.setPC(addr);
} 