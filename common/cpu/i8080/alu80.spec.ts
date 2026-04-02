import { addBytes, andBytes, decByte, decimalAdjust, incByte, orBytes, rotateLeft, rotateLeftCircular, rotateRight, rotateRightCircular, subBytes, xorBytes } from "./alu80"
import {hexWord} from "../../format";

// 80 40 20 10 08 04 02 01
//  7  6  5  4  3  2  1  0
//  S  Z  0 AC  0  P  1  C

test("addBytes", () => {
  expect(hexWord(addBytes(0, 0))).toBe("0046"); // Z | P
  expect(hexWord(addBytes(0, 1))).toBe("0102");
  expect(hexWord(addBytes(1, 0))).toBe("0102");
  expect(hexWord(addBytes(1, 1))).toBe("0202");
  expect(hexWord(addBytes(2, 1))).toBe("0306"); // P
  expect(hexWord(addBytes(0xF, 1))).toBe("1012"); // AC
  expect(hexWord(addBytes(0x7F, 1))).toBe("8092"); // S | AC
  expect(hexWord(addBytes(0xFF, 1))).toBe("0057"); // C | P | Z | AC
  expect(hexWord(addBytes(0, 0, 1))).toBe("0102");
  expect(hexWord(addBytes(0xFF, 0xFF, 0))).toBe("FE93"); // S, AC, C
  expect(hexWord(addBytes(0xFF, 0xFF, 1))).toBe("FF97"); // S, AC, P, C
})

test("subBytes", () => {
  // Пример флагов для 2-1 тут: https://studfile.net/preview/1465793/page:4/
  expect(hexWord(subBytes(2, 1))).toBe("0112"); // AC
  // В остальных случаях поведение AC не гарантируется
  expect(hexWord(subBytes(1, 1))).toBe("0056"); // Z | AC | P
  expect(hexWord(subBytes(1, 2))).toBe("FF87"); // S | C | P
  expect(hexWord(subBytes(0xFF, 1))).toBe("FE92"); // S | AC
  expect(hexWord(subBytes(0xFF, 0xFF))).toBe("0056"); // Z | AC
  // С применением переноса
  // example from http://dunfield.classiccmp.org/r/8080asm.pdf (page 56)
  //   1301
  // - 0503
  //   ----
  //   0DFE
  expect(hexWord(subBytes(0x01, 0x03, 0))).toBe("FE83"); // => C=1
  expect(hexWord(subBytes(0x13, 0x05, 1))).toBe("0D02");
})

test("incByte", () => {
  expect(hexWord(incByte(0, 0xFF))).toBe("0103"); // Сброшены все флаги для данной операции: S, Z, P, AC
  // Сохранён CF=1, и бит 02 установлен по-умолчанию
  expect(hexWord(incByte(0, 0))).toBe("0102"); // Тут вообще все флаги пусты, кроме 02.
  expect(hexWord(incByte(0xFF, 0))).toBe("0056"); // Z | AC | P
  expect(hexWord(incByte(0xFF, 1))).toBe("0057"); // Z | AC | P + (C от прежнего состояния)
  expect(hexWord(incByte(0x0F, 0))).toBe("1012"); // AC
  expect(hexWord(incByte(0x7F, 0))).toBe("8092"); // S | AC 
})

test("decByte", () => {
  expect(hexWord(decByte(0, 0xFF))).toBe("FF87"); // S | P | C(сохр.)
  expect(hexWord(decByte(0, 0))).toBe("FF86"); // C=0
  expect(hexWord(decByte(0xFF, 0))).toBe("FE92"); // S | AC
  expect(hexWord(decByte(1, 0))).toBe("0056"); // Z | P | AC
})

test("rotateLeftCircular", () => {
  // 1st example from http://dunfield.classiccmp.org/r/8080asm.pdf
  expect(hexWord(rotateLeftCircular(0xF2, 0))).toBe("E501");
  // 0101_1010 -> 1011_0100
  expect(hexWord(rotateLeftCircular(0x5A, 0xFF))).toBe("B4FE");
})

test("rotateRightCircular", () => {
  // 1st example from http://dunfield.classiccmp.org/r/8080asm.pdf
  expect(hexWord(rotateRightCircular(0xF2, 1))).toBe("7900");
  // 0000_1111 -> 1000_0111
  expect(hexWord(rotateRightCircular(0x0F, 0x80))).toBe("8781");
})

test("rotateLeft", () => {
  // 1st example from http://dunfield.classiccmp.org/r/8080asm.pdf
  expect(hexWord(rotateLeft(0xB5, 0))).toBe("6A01");
  // (1) 0101_1010 -> (0) 1011_0101
  expect(hexWord(rotateLeft(0x5A, 0xFF))).toBe("B5FE");
})

test("rotateRight", () => {
  // 1st example from http://dunfield.classiccmp.org/r/8080asm.pdf
  expect(hexWord(rotateRight(0x6A, 3))).toBe("B502");
  //  0010_0101 (0) -> 0001_0010 (1)
  expect(hexWord(rotateRight(0x25, 2))).toBe("1203");
})

test("decimalAdjust", () => {
  // example from http://dunfield.classiccmp.org/r/8080asm.pdf (page 56)
  //   2985   low   85 = 1000_0101
  // + 4936   -->   36 = 0011_0110
  //   ----              ---------
  //   7921              1011_1011, C=0, AC=0

  //         DAA:        1011_1011
  //                   + _____0110
  //                     1100_0001, AC=1
  //                   + 0110
  //                   1_0010_0001, C=1
  expect(hexWord(decimalAdjust(0xBB00))).toBe("2111")
  // high  29 = 0010_1001
  //       49 = 0100_1001
  //        C = ________1
  //  DAA:      0111_0011, C=0, AC=1
  //          + _____0110
  //            0111_1001, AC = 0
  //           no action for 0111
  expect(hexWord(decimalAdjust(0x7310))).toBe("7900")
})

test("andBytes", () => {
  expect(hexWord(andBytes(0xFC00, 0x0F))).toBe("0C06");
  expect(hexWord(andBytes(0xFCFF, 0x0F))).toBe("0C3E");
  expect(hexWord(andBytes(0x0000, 0x00))).toBe("0046");
  expect(hexWord(andBytes(0x8000, 0x80))).toBe("8082");
})

test("xorBytes", () => {
  expect(hexWord(xorBytes(0xFC00, 0xFC))).toBe("0046");
  expect(hexWord(xorBytes(0x5500, 0xF0))).toBe("A586");
})

test("orBytes", () => {
  expect(hexWord(orBytes(0xF000, 0x0F))).toBe("FF86");
  expect(hexWord(orBytes(0x0000, 0x00))).toBe("0046");
})