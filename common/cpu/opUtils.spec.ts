import {getReg16, getSrcReg8, getDstReg8} from "./opUtils";

test("getReg16", () => {
  // lxi B, 1234h
  expect(getReg16(new Uint8Array([0x01, 0x34, 0x12]), 0)).toBe(0);
  // lxi D, 0ABCDh
  expect(getReg16(new Uint8Array([0, 0x11, 0xCD, 0xAB]), 1)).toBe(1);
})

test("getSrcReg8", () => {
  const buf = new Uint8Array([0, 0xFF, 0xAA, 0x55]);
  let pos = 0;
  expect(getSrcReg8(buf, pos++)).toBe(0);
  expect(getSrcReg8(buf, pos++)).toBe(7);
  expect(getSrcReg8(buf, pos++)).toBe(2);
  expect(getSrcReg8(buf, pos++)).toBe(5);
})

test("getDstReg8", () => {
  const buf = new Uint8Array([0, 0xFF, 0xAA, 0x55]);
  let pos = 0;
  expect(getDstReg8(buf, pos++)).toBe(0);
  expect(getDstReg8(buf, pos++)).toBe(7);
  expect(getDstReg8(buf, pos++)).toBe(5); // 0xAA =  10|10 1|010
  expect(getDstReg8(buf, pos++)).toBe(2); // 0x55 => 01|01 0|101 
})
