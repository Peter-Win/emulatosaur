/**
 * Arithmetic logic unit
 */
import {P80FlagMask} from "./Registers80";

/**
 * Установить флаги S, Z и P из значения A
 * @param a 
 * @param f Важно, что изначально флаги должны быть сброшены. Т.к. тут они только устанавливаются
 * @returns {number} PSW, A=hi, Flags = low
 */
const fillSZP = (a: number, f: number): number => {
  // Двойка добавляется, т.к. в документациях указано, что этот бит всегда установлен.
  let res = (a << 8) | f | 2;
  if (!(a & 0xFF)) {
    res |= P80FlagMask.Z;
  }
  if (a & 0x80) {
    res |= P80FlagMask.S;
  }
  return res | maskP[a]!;
}

/**
 * @param byte1 0..255
 * @param byte2 0..255
 * @param cf 0..1
 * @returns {number} PSW. Flags = low byte, A = hi byte
 */
export const addBytes = (byte1: number, byte2: number, cf=0): number => {
  const sum = byte1 + byte2 + cf;
  let f = sum >> 8;
  // AC. Используется тот факт, что флаг находится в той же позиции 0x10, что и бит переноса
  f |= ((byte1 & 0xF) + (byte2 & 0xF) + cf) & 0x10;
  return fillSZP(sum & 0xFF, f)
}

export const subBytes = (byte1: number, byte2: number, cf = 0): number => {
  const diff = byte1  - byte2 - cf;
  let f = (diff >> 8) & 1;
  // Для вычисления AC имитируется поведение процессора, который для вычитания использует a + (-b)
  f |= ((byte1 & 0xF) + ((cf-byte2) & 0xF)) & 0x10;
  return fillSZP(diff & 0xFF, f);
}

// К сожалению, точного описания поведения AC для логики найти не удалось.
// Этот источник http://dunfield.classiccmp.org/r/8080asm.pdf (page 19) пишет, что AC не меняется
// Однако, есть сообщения, что поведение может отличаться на разных вариантах процессоров.
// Точно можно узнать только по железу, которого пока не предвидится.

export const andBytes = (psw: number, byte2: number): number => {
  const a = psw >> 8;
  return fillSZP(a & byte2, psw & logFlagsClrMask)
}
export const xorBytes = (psw: number, byte2: number): number => {
  const a = psw >> 8;
  return fillSZP(a ^ byte2, psw & logFlagsClrMask)
}

export const orBytes = (psw: number, byte2: number): number => {
  const a = psw >> 8;
  return fillSZP(a | byte2, psw & logFlagsClrMask)
}

const logFlagsClrMask = (P80FlagMask.S | P80FlagMask.Z | P80FlagMask.P | P80FlagMask.C) ^ 0xFF;
const incFlagsMask = P80FlagMask.C | P80FlagMask.Default;

export const incByte = (byte: number, srcFlags: number): number => {
  let f = srcFlags & incFlagsMask;
  f |= ((byte & 0xF) + 1) & 0x10; // AC
  return fillSZP((byte + 1) & 0xFF, f);
}

export const decByte = (byte: number, srcFlags: number): number => {
  let f = srcFlags & incFlagsMask;
  f |= ((byte & 0xF) + 0xF) & 0x10;
  return fillSZP((byte - 1) & 0xFF, f);
}

export const rotateLeftCircular = (byte: number, prevFlags: number): number => {
  const c = byte >> 7;
  let psw = ((byte & 0x7F) << 1) | c;
  psw <<= 8;
  // используется тот факт, что флаг C находится в младшем бите и это совпадает с положением c
  psw |= (prevFlags & 0xFE) | c;
  return psw;
}

export const rotateRightCircular = (byte: number, prevFlags: number): number => {
  const c = byte & 1;
  let psw = byte >> 1;
  psw |= c << 7;
  psw <<= 8;
  psw |= (prevFlags & 0xFE) | c;
  return psw;
}

// Rotate left through carry
export const rotateLeft = (byte: number, prevFlags: number): number => {
  const c = byte >> 7;
  let psw = (byte & 0x7F) << 1;
  psw |= prevFlags & 1; // сдвигать не надо, т.к. значение CF на нужном месте
  psw <<= 8;
  psw |= (prevFlags & 0xFE) | c;
  return psw;
}

// Rotate right through carry
export const rotateRight = (byte: number, prevFlags: number): number => {
  const c = byte & 1;
  let psw = byte >> 1;
  psw |= (prevFlags & 1) << 7;
  psw <<= 8;
  psw |= (prevFlags & 0xFE) | c;
  return psw;
}

export const decimalAdjust = (psw: number): number => {
  let a = psw >> 8;
  let lowA = a & 0xF;
  const ac = psw & P80FlagMask.AC;
  const c = psw & P80FlagMask.C;
  let res = psw & 0xEE;
  if (lowA > 9 || (ac)) {
    lowA += 6;
    a += 6;
    res |= lowA & P80FlagMask.AC;
  }
  if (c || (a >> 4) > 9) {
    a += 0x60;
    res |= (a >> 8)
    a &= 0xFF;
  }
  return res | (a << 8);
}


const maskP: number[] = [];
for (let i=0; i<256; i++) {
  maskP[i] = (i.toString(2).replace(/0/g,"").length & 1 ^ 1) << 2;
}

// Следуя оригинальному поведению процессоров i8080 от Intel, флаг дополнительного переноса AC 
// должен вычисляться как третий (A3) бит результата операции OR между аккумулятором и аргументом 
// команд ANA или ANI. Процессоры же AMD просто обнуляют флаг AC в инструкциях ANA и ANI.