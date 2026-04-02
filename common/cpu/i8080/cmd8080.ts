import { CpuCommand } from "../CpuCommand";

import {getReg16, getWord, getSrcReg8, getDstReg8} from "../opUtils";

type FnParam = (buffer: Uint8Array, offset: number) => number[];
const paramAddr: FnParam = (buffer, offset) => [getWord(buffer, offset+1)];
const paramSrcReg: FnParam = (buffer, offset) => [getSrcReg8(buffer, offset)];
const paramByteConst: FnParam = (buffer, offset) => [buffer[offset+1]!];
const paramDstReg: FnParam = (buffer, offset) => [getDstReg8(buffer, offset)];
const paramReg16: FnParam = (buffer, offset) => [getReg16(buffer, offset)]
const paramCondAndAddr: FnParam = (buffer, offset) => [getDstReg8(buffer, offset), getWord(buffer, offset+1)];

/**
 * length: 1|2|3
 * params: number[] | undefined
 * isFinal: boolean | undefined
 * usage: ("code"|undefined)[]
 */
export const cmd8080: Record<string, CpuCommand> = {
  nop: {
    length: 1,
  },
  // Например: по команде LXI Н, FFOOH, в регистровую пару HL загружается число FFOOH.
  // rr:=nn
  "mov r16,i16": {
    length: 3,
    params: (buffer, offset) => [
      getReg16(buffer, offset),
      getWord(buffer, offset+1),
    ],
    usage: ["r16", "i16"],
  },
  // STAX - запись содержимого 8-битного аккумулятора (A) в память, 
  // используя 16-битную регистровую пару BC или DE как адрес.
  // (B|D):=A
  "mov [r16],A": {
    length: 1,
    params: (buffer, offset) => [getReg16(buffer, offset)],
  },
  // LDAX | LD A,(rr)
  "mov A,[r16]": {
    length: 1,
    params: (buffer, offset) => [getReg16(buffer, offset)],
  },
  // SPHL
  "mov SP,HL": {
    length: 1,
  },

  "inc r16": {
    length: 1,
    params: (buffer, offset) => [getReg16(buffer, offset)],
  },
  "inc r8": {
    length: 1,
    params: (buffer, offset) => [getDstReg8(buffer, offset)],
  },
  "dec r8": {
    length: 1,
    params: (buffer, offset) => [getDstReg8(buffer, offset)],
  },
  "dec r16": {
    length: 1,
    params: (buffer, offset) => [getReg16(buffer, offset)],
  },
  "mov r8,i8": {
    length: 2,
    params: (buffer, offset) => [getDstReg8(buffer, offset), buffer[offset + 1]!],
    usage: ["r8", "i8"],
  },
  "rlc": {
    length: 1,
  },
  "rrc": {
    length: 1,
  },
  "ral": {
    length: 1,
  },
  "rar": {
    length: 1,
  },
  "add HL,r16": {
    length: 1,
    params: (buffer, offset) => [getReg16(buffer, offset)],
  },
  "mov [i16],HL": {
    length: 3,
    params: paramAddr,
    usage: ["addr:2"],
  },
  "mov HL,[i16]": {
    length: 3,
    params: paramAddr,
    usage: ["addr:2"],
  },
  "daa": {
    length: 1,
  },
  "not A": {
    length: 1,
  },
  "mov [i16],A": {
    length: 3,
    params: paramAddr,
    usage: ["addr:1"],
  },
  "mov A,[i16]": {
    length: 3,
    params: paramAddr,
    usage: ["addr:1"],
  },
  stc: {
    length: 1,
  },
  cmc: {
    length: 1,
  },
  "mov r8,r8": {
    length: 1,
    params: (buffer, offset) => [getDstReg8(buffer, offset), getSrcReg8(buffer, offset)],
  },
  hlt: {
    length: 1,
  },
  "add r8": {
    length: 1,
    params: paramSrcReg,
  },
  "add i8": {
    length: 2,
    params: paramByteConst,
    usage: ["i8"],
  },
  "adc r8": {
    length: 1,
    params: paramSrcReg,
  },
  "adc i8": {
    length: 2,
    params: paramByteConst,
    usage: ["i8"],
  },
  "sub r8": {
    length: 1,
    params: paramSrcReg,
  },
  "sub i8": {
    length: 2,
    params: paramByteConst,
    usage: ["i8"],
  },
  "sbb r8": {
    length: 1,
    params: paramSrcReg,
  },
  "sbb i8": {
    length: 2,
    params: paramByteConst,
    usage: ["i8"],
  },
  "and r8": {
    length: 1,
    params: paramSrcReg,
  },
  "and i8": {
    length: 2,
    params: paramByteConst,
    usage: ["i8"],
  },
  "or r8": {
    length: 1,
    params: paramSrcReg,
  },
  "or i8": {
    length: 2,
    params: paramByteConst,
    usage: ["i8"],
  },
  "xor r8": {
    length: 1,
    params: paramSrcReg,
  },
  "xor i8": {
    length: 2,
    params: paramByteConst,
    usage: ["i8"],
  },
  "cmp r8": {
    length: 1,
    params: paramSrcReg,
  },
  "cmp i8": {
    length: 2,
    params: paramByteConst,
    usage: ["i8"],
  },
  ret: {
    length: 1,
    isFinal: true,
  },
  "ret-con": {
    length: 1,
    params: paramDstReg,
    usage: ["cond"],
  },
  "pop r16s": {
    length: 1,
    params: paramReg16,
  },
  "push r16s": {
    length: 1,
    params: paramReg16,
  },
  "jmp i16": {
    length: 3,
    params: paramAddr,
    usage: ["code"],
    isFinal: true,
  },
  "jmp [HL]": {
    length: 1,
    isFinal: true,
  },
  "jmp-con i16": {
    length: 3,
    usage: ["cond", "code"],
    params: paramCondAndAddr,
  },
  "call i16": {
    length: 3,
    usage: ["code"],
    params: paramAddr,
  },
  "call-con i16": {
    length: 3,
    usage: ["cond", "code"],
    params: paramCondAndAddr,
  },
  "rst i3": {
    length: 1,
    params: paramDstReg,
  },
  "out [i8]": {
    length: 2,
    params: paramByteConst,
  },
  "in [i8]": {
    length: 2,
    params: paramByteConst,
  },
  "xchg [SP],HL": {
    length: 1,
  },
  "xchg DE,HL": {
    length: 1,
  },
  "di": {
    length: 1,
  },
  "ei": {
    length: 1,
  },
}