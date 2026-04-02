import { getMemoryWord, setMemoryWord } from "../../memory/Memory";
import { getDstReg8, getReg16, getSrcReg8, getWord } from "../opUtils";
import { addBytes, andBytes, decByte, decimalAdjust, incByte, orBytes, rotateLeft, rotateLeftCircular, rotateRight, rotateRightCircular, subBytes, xorBytes } from "./alu80";
import { Emul80Op } from "./Emul80Ctx";
import { callInterrupt80 } from "./interrupt80";
import { isCondition80 } from "./isCondition80";
import { P80Reg16Index } from "./Registers80";
import { pop, push } from "./stack80";

export const opEmul8080: Record<string, Emul80Op> = {
  nop: () => 1,
  "mov r16,i16": ({regs}, buffer, pos) => {
    const r16ndx = getReg16(buffer, pos);
    const value = getWord(buffer, pos+1);
    regs.set16ndx(r16ndx, value);
    return 3;
  },
  "mov [r16],A": ({regs, comp}, buffer, pos) => {
    const r16ndx = getReg16(buffer, pos);
    const addr = regs.get16ndx(r16ndx);
    comp.memory.setByte(addr, regs.getA());
    return 1;
  },
  "inc r16": ({regs}, buffer, pos) => {
    const r16ndx = getReg16(buffer, pos);
    const val = regs.get16ndx(r16ndx);
    // данная команда не влияет на флаги
    regs.set16ndx(r16ndx, val + 1);
    return 1;
  },
  "dec r16": ({regs}, buffer, pos) => {
    const r16ndx = getReg16(buffer, pos);
    const val = regs.get16ndx(r16ndx);
    // данная команда не влияет на флаги
    regs.set16ndx(r16ndx, val - 1);
    return 1;
  },
  "inc r8": ({regs, comp}, buffer, pos) => {
    const r8ndx = getDstReg8(buffer, pos)
    const psw = incByte(regs.get8ndx(r8ndx, comp.memory), regs.getFlags());
    regs.set8ndx(r8ndx, psw >> 8, comp.memory);
    regs.setFlags(psw); // нет смысла убирать старший байт, т.к. всё равно сохраняется только один байт
    return 1;
  },
  "dec r8": ({regs, comp}, buffer, pos) => {
    const r8ndx = getDstReg8(buffer, pos)
    const psw = decByte(regs.get8ndx(r8ndx, comp.memory), regs.getFlags());
    regs.set8ndx(r8ndx, psw >> 8, comp.memory);
    regs.setFlags(psw); // нет смысла убирать старший байт, т.к. всё равно сохраняется только один байт
    return 1;
  },
  "mov r8,i8": ({regs, comp}, buffer, pos) => {
    const r8ndx = getDstReg8(buffer, pos);
    const i8 = buffer[pos + 1]!;
    regs.set8ndx(r8ndx, i8, comp.memory);
    return 2;
  },
  "rlc": ({regs}) => {
    regs.setPSW(rotateLeftCircular(regs.getA(), regs.getFlags()));
    return 1;
  },
  "rrc": ({regs}) => {
    regs.setPSW(rotateRightCircular(regs.getA(), regs.getFlags()));
    return 1;
  },
  "ral": ({regs}) => {
    regs.setPSW(rotateLeft(regs.getA(), regs.getFlags()));
    return 1;
  },
  "rar": ({regs}) => {
    regs.setPSW(rotateRight(regs.getA(), regs.getFlags()));
    return 1;
  },
  "add HL,r16": ({regs}, buffer, pos) => {
    // Отдельную функцию делать не целесообразно, т.к. расходы на передачу параметров будут выше
    const r16ndx = getReg16(buffer, pos);
    const sum = regs.getHL() + regs.get16ndx(r16ndx);
    regs.setHL(sum); // В случае переноса он автоматически отсекается, т.к. для хранения используется Uint16
    // данная команда влияет только на флаг C
    regs.setFlagC(sum >> 16);
    return 1;
  },
  "mov A,[r16]": ({regs, comp}, buffer, pos) => {
    const r16ndx = getReg16(buffer, pos);
    const addr = regs.get16ndx(r16ndx);
    regs.setA(comp.memory.getByte(addr));
    return 1;
  },
  // STA
  "mov [i16],A": ({regs, comp}, buffer, pos) => {
    const addr = getWord(buffer, pos + 1);
    comp.memory.setByte(addr, regs.getA());
    return 3;
  },
  // LDA
  "mov A,[i16]": ({regs, comp}, buffer, pos) => {
    const addr = getWord(buffer, pos + 1);
    regs.setA(comp.memory.getByte(addr));
    return 3;
  },
  // SHLD
  "mov [i16],HL": ({regs, comp}, buffer, pos) => {
    const addr = getWord(buffer, pos + 1);
    setMemoryWord(comp.memory, addr, regs.getHL());
    return 3;
  },
  "mov HL,[i16]": ({regs, comp}, buffer, pos) => {
    const addr = getWord(buffer, pos + 1);
    regs.setHL(getMemoryWord(comp.memory, addr));
    return 3;
  },
  // SPHL = LD SP,HL
  "mov SP,HL": ({regs}) => {
    regs.setSP(regs.getHL());
    return 1;
  },
  "daa": ({regs}) => {
    regs.setPSW(decimalAdjust(regs.getPSW()));
    return 1;
  },
  "not A": ({regs}) => {
    regs.setA(~regs.getA());
    return 1;
  },
  stc: ({regs}) => {
    regs.setFlagC(1);
    return 1;
  },
  cmc: ({regs}) => {
    regs.setFlags(regs.getFlags() ^ 1);
    return 1;
  },
  "mov r8,r8": ({regs, comp: {memory}}, buffer, pos) => {
    const dstNdx = getDstReg8(buffer, pos);
    const srcNdx = getSrcReg8(buffer, pos);
    regs.set8ndx(dstNdx, regs.get8ndx(srcNdx, memory), memory);
    return 1;
  },
  hlt: () => {
    // TODO: Пока что эмулируются компы, у которых не используются прерывания.
    // Поэтому пока что тут не слишком удачная реализация: вечный цикл на этой команде.
    // После появления более актуальных кейсов надо будет сделать более реалистичное поведение.
    return 0;
  },
  "add r8": ({regs, comp}, buffer, pos) => {
    const ndx = getSrcReg8(buffer, pos);
    const a = regs.getA();
    const b = regs.get8ndx(ndx, comp.memory);
    regs.setPSW(addBytes(a, b));
    return 1;
  },
  "add i8": ({regs}, buffer, pos) => {
    regs.setPSW(addBytes(regs.getA(), buffer[pos+1]!));
    return 2;
  },
  "adc r8": ({regs, comp}, buffer, pos) => {
    const ndx = getSrcReg8(buffer, pos);
    const a = regs.getA();
    const b = regs.get8ndx(ndx, comp.memory);
    const c = regs.getFlags() & 1;
    regs.setPSW(addBytes(a, b, c));
    return 1;
  },
  "adc i8": ({regs}, buffer, pos) => {
    regs.setPSW(addBytes(regs.getA(), buffer[pos+1]!, regs.getFlags() & 1));
    return 2;
  },
  "sub r8": ({regs, comp}, buffer, pos) => {
    const ndx = getSrcReg8(buffer, pos);
    const a = regs.getA();
    const b = regs.get8ndx(ndx, comp.memory);
    regs.setPSW(subBytes(a, b));
    return 1;
  },
  "sub i8": ({regs}, buffer, pos) => {
    regs.setPSW(subBytes(regs.getA(), buffer[pos+1]!));
    return 2;
  },

  "cmp r8": ({regs, comp}, buffer, pos) => {
    const ndx = getSrcReg8(buffer, pos);
    const a = regs.getA();
    const b = regs.get8ndx(ndx, comp.memory);
    regs.setFlags(subBytes(a, b)); // Старший байт будет отброшен. Сохранятся только флаги
    return 1;
  },
  "cmp i8": ({regs}, buffer, pos) => {
    regs.setFlags(subBytes(regs.getA(), buffer[pos+1]!));
    return 2;
  },
  "sbb r8": ({regs, comp}, buffer, pos) => {
    const ndx = getSrcReg8(buffer, pos);
    const a = regs.getA();
    const b = regs.get8ndx(ndx, comp.memory);
    const c = regs.getFlags() & 1;
    regs.setPSW(subBytes(a, b, c));
    return 1;
  },
  "sbb i8": ({regs}, buffer, pos) => {
    regs.setPSW(subBytes(regs.getA(), buffer[pos+1]!, regs.getFlags() & 1));
    return 2;
  },
  "and r8": ({regs, comp}, buffer, pos) => {
    const ndx = getSrcReg8(buffer, pos);
    const b = regs.get8ndx(ndx, comp.memory);
    regs.setPSW(andBytes(regs.getPSW(), b));
    return 1;
  },
  "and i8": ({regs}, buffer, pos) => {
    regs.setPSW(andBytes(regs.getPSW(), buffer[pos+1]!));
    return 2;
  },
  "xor r8": ({regs, comp}, buffer, pos) => {
    const ndx = getSrcReg8(buffer, pos);
    const b = regs.get8ndx(ndx, comp.memory);
    regs.setPSW(xorBytes(regs.getPSW(), b));
    return 1;
  },
  "xor i8": ({regs}, buffer, pos) => {
    regs.setPSW(xorBytes(regs.getPSW(), buffer[pos+1]!));
    return 2;
  },
  "or r8": ({regs, comp}, buffer, pos) => {
    const ndx = getSrcReg8(buffer, pos);
    const b = regs.get8ndx(ndx, comp.memory);
    regs.setPSW(orBytes(regs.getPSW(), b));
    return 1;
  },
  "or i8": ({regs}, buffer, pos) => {
    regs.setPSW(orBytes(regs.getPSW(), buffer[pos+1]!));
    return 2;
  },
  "jmp i16": ({regs}, buffer, pos) => {
    regs.setPC(getWord(buffer, pos + 1));
    return 0;
  },
  "pop r16s": ({regs, comp: {memory}}, buffer, pos) => {
    const regNdx = getReg16(buffer, pos);
    regs.set16ndxStk(regNdx, pop(regs, memory));
    return 1;
  },
  "push r16s": ({regs, comp: {memory}}, buffer, pos) => {
    const regNdx = getReg16(buffer, pos);
    const value = regs.get16ndxStk(regNdx);
    push(regs, memory, value);
    return 1;
  },
  "call i16": ({regs, comp: {memory}}, buffer, pos) => {
    push(regs, memory, regs.getPC() + 3);
    regs.setPC(getWord(buffer, pos+1));
    return 0;
  },
  ret: ({regs, comp: {memory}}) => {
    regs.setPC(pop(regs, memory));
    return 0;
  },
  "jmp-con i16": ({regs}, buffer, pos) => {
    if (isCondition80(regs.getFlags(), buffer[pos]!)) {
      regs.setPC(getWord(buffer, pos + 1))
      return 0;
    } else {
      return 3;
    }
  },
  "call-con i16": ({regs, comp: {memory}}, buffer, pos) => {
    if (isCondition80(regs.getFlags(), buffer[pos]!)) {
      push(regs, memory, regs.getPC() + 3);
      regs.setPC(getWord(buffer, pos + 1))
      return 0;
    } else {
      return 3;
    }
  },
  "ret-con": ({regs, comp: {memory}}, buffer, pos) => {
    if (isCondition80(regs.getFlags(), buffer[pos]!)) {
      const retAddr = pop(regs, memory);
      regs.setPC(retAddr);
      return 0;
    } else {
      return 1;
    }
  },
  "rst i3": ({regs, comp: {memory}}, buffer, pos) => {
    const intNumber = getDstReg8(buffer, pos);
    callInterrupt80(intNumber, regs, memory, 1);
    return 0;
  },
  ei: ({cpu}) => {
    cpu.enableInt(true);
    return 1;
  },
  di: ({cpu}) => {
    cpu.enableInt(false);
    return 1;
  },
  "in [i8]": ({regs, cpu}, buffer, pos) => {
    if (cpu.readPort) {
      regs.setA(cpu.readPort(buffer[pos+1]!));
    }
    return 2;
  },
  "out [i8]": ({regs, cpu}, buffer, pos) => {
    if (cpu.writePort) {
      cpu.writePort(buffer[pos+1]!, regs.getA());
    }
    return 2;
  },
  "xchg [SP],HL": ({regs, comp: {memory}}) => {
    const h = regs.getHL();
    const sp = regs.getSP();
    const stk = getMemoryWord(memory, sp);
    regs.setHL(stk);
    setMemoryWord(memory, sp, h);
    return 1;
  },
  "xchg DE,HL": ({regs}) => {
    const de = regs.get16ndx(P80Reg16Index.DE);
    const hl = regs.getHL();
    regs.setHL(de);
    regs.set16ndx(P80Reg16Index.DE, hl);
    return 1;
  },
  "jmp [HL]": ({regs}) => {
    regs.setPC(regs.getHL());
    return 0;
  },
}