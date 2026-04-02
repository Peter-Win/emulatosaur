// Тест эмуляции ВСЕХ команд 8080

import { Computer } from "../../Computer";
import { hexByte, hexDump, hexWord } from "../../format";
import { getMemoryWord, Memory, readMemory, setMemoryWord, writeMemory } from "../../memory/Memory";
import { SimpleMemory } from "../../memory/SimpleMemory";
import { Emul80Ctx, Emul80Op } from "./Emul80Ctx";
import { isCondition80 } from "./isCondition80";
import { opCode8080 } from "./opCode8080";
import { opEmul8080 } from "./opEmul8080";
import { Proc8080 } from "./Proc8080";
import { P80FlagMask, P80Reg8NameByIndex, Registers80 } from "./Registers80";

type Env = {
  regs: Registers80;
  memory: Memory;
  comp: Computer;
  buf: Uint8Array;
  ctx: Emul80Ctx;
  cpu: Proc8080;
}

class TestInOutCPU extends Proc8080 {
  outBuf = new Uint8Array(256);
  inBuf = new Uint8Array(256);
  readPort(portIndex: number): number {
    return this.inBuf[portIndex];
  }
  writePort(portIndex: number, byte: number): void {
    this.outBuf[portIndex] = byte;
  }
}

const createEnv = (buf: Uint8Array, options?: {cpu?: Proc8080}): Env => {
  const cpu = options?.cpu ?? new Proc8080();
  const {regs} = cpu;
  const memory = new SimpleMemory(128)
  const comp: Computer = {memory, step() {}}
  const ctx: Emul80Ctx = {regs, cpu, comp}
  return {buf, regs, comp, memory, cpu, ctx}
}

type OpResult = Env & {
  cmdKey: string;
  opEmulator: Emul80Op;
  beginPos: number;
  endPos: number;
  length: number;
}

const execOp = (env: Env, offset=0): OpResult => {
  const cmdKey = opCode8080[env.buf[offset]];
  if (!cmdKey) throw Error(`Invalid code ${hexDump(env.buf, "")}`);
  const opEmulator = opEmul8080[cmdKey];
  if (!opEmulator) throw Error(`Emulator not found for "${cmdKey}"`);
  const length = opEmulator(env.ctx, env.buf, offset);
  return {
    ...env, 
    cmdKey, 
    opEmulator, 
    length, 
    beginPos: offset,
    endPos: offset + length,
  }
}


type ExecOptions = {
  cpu?: Proc8080;
  beforeExec?: (env: Env) => void;
}

const testEmulOnce = (buf: Uint8Array, options?: ExecOptions) => {
  const env = createEnv(buf, options);
  options?.beforeExec?.(env);
  return execOp(env);
}

const testSingleByteCmd = (opCode: number, options?: ExecOptions) => {
  return testEmulOnce(new Uint8Array([opCode]), options);
}
const testTwoByteCmd = (opCode: number, byte: number, options?: ExecOptions) => {
  return testEmulOnce(new Uint8Array([opCode, byte]), options);
}
const testThreeByteCmd = (opCode: number, word: number, options?: ExecOptions) =>
  testEmulOnce(new Uint8Array([opCode, word & 0xFF, word >> 8]), options);

describe("opEmul8080", () => {
  it("nop", () => {
    const op = testSingleByteCmd(0);
    expect(op.cmdKey).toBe("nop");
    expect(op.length).toBe(1);
  });
  it("mov r16,i16", () => {
    const lxiB = testThreeByteCmd(1, 0x789A);
    expect(lxiB.length).toBe(3);
    expect(lxiB.regs.get16id("BC")).toBe(0x789A);
    const lxiD = testThreeByteCmd(0x11, 0x7C60);
    expect(lxiD.regs.get16id("DE")).toBe(0x7C60);
    const lxiH = testThreeByteCmd(0x21, 0x1FFF);
    expect(lxiH.regs.get16id("HL")).toBe(0x1FFF);
    const lxiSP = testThreeByteCmd(0x31, 0x3000);
    expect(lxiSP.regs.get16id("SP")).toBe(0x3000);
  });
  it("mov [r16],A", () => {
    const env = createEnv(new Uint8Array([0x02, 0x12]));
    env.regs.set8id("A", 0xBC, env.memory);
    env.regs.set16id("BC", 1);

    const staxB = execOp(env);
    expect(staxB.length).toBe(1);
    expect(hexDump(readMemory(env.memory, 0, 4), " ")).toBe("00 BC 00 00");

    env.regs.set8id("A", 0xDE, env.memory);
    env.regs.set16id("DE", 2);
    execOp(env, staxB.endPos);
    expect(hexDump(readMemory(env.memory, 0, 4), " ")).toBe("00 BC DE 00");
  })
  it("mov [i16],A", () => {
    // STA nn = LD (nn),A
    const op = testThreeByteCmd(0x32, 4, {
      beforeExec: ({regs}) => regs.setA(0xA5),
    })
    expect(op.length).toBe(3);
    expect(op.memory.getByte(4)).toBe(0xA5);
  });
  it("mov A,[i16]", () => {
    // LDA nn = LD A,(nn)
    const op = testThreeByteCmd(0x3A, 4, {
      beforeExec: ({memory}) => memory.setByte(4, 0x78),
    })
    expect(op.length).toBe(3);
    expect(op.regs.getA()).toBe(0x78);

  });
  it("mov SP,HL", () => {
    // SPHL = LD SP,HL
    const op = testSingleByteCmd(0xF9, {
      beforeExec: ({regs}) => regs.setHL(12),
    })
    expect(op.length).toBe(1);
    expect(op.regs.getSP()).toBe(12);
  })
  it("inc r16", () => {
    const env = createEnv(new Uint8Array([0x03, 0x13, 0x23, 0x33]));
    const {regs} = env;
    regs.set16id("DE", 1);
    regs.set16id("HL", 0xFFFF);
    regs.set16id("SP", 0xFF);
    const inxB = execOp(env);
    expect(inxB.length).toBe(1);
    expect(regs.get16id("BC")).toBe(1);
    const inxD = execOp(env, inxB.endPos);
    expect(regs.get16id("DE")).toBe(2);
    const inxH = execOp(env, inxD.endPos);
    expect(regs.get16id("HL")).toBe(0); // 0 в результате переполнения
    execOp(env, inxH.endPos);
    expect(regs.get16id("SP")).toBe(0x0100);
    expect(regs.getFlags()).toBe(P80FlagMask.Default);
  })
  it("inc r8", () => {
    const env = createEnv(new Uint8Array([
      0x04, 0x0C, // inr B, inr C
      0x14, 0x1C, // inr D, int E
      0x24, 0x2C, // inr H, inr L
      0x34, 0x3C, // int M, inr A
    ]))
    const {memory, regs} = env;
    regs.setFlags(0);
    regs.set8id("B", 0, memory);
    const inrB = execOp(env);
    expect(inrB.length).toBe(1);
    expect(regs.get8id("B", memory)).toBe(1);
    expect(regs.getFlags()).toBe(P80FlagMask.Default);

    regs.set8id("C", 2, memory);  // Increment of 2 -> set P flag
    const inrC = execOp(env, inrB.endPos);
    expect(regs.get8id("C", memory)).toBe(3);
    expect(regs.getFlags()).toBe(P80FlagMask.P | P80FlagMask.Default);

    regs.set8id("D", 0xF, memory); // Increment of 0xF -> set AC
    const inrD = execOp(env, inrC.endPos);
    expect(regs.get8id("D", memory)).toBe(0x10);
    expect(regs.getFlags()).toBe(P80FlagMask.AC | P80FlagMask.Default);;

    regs.set8id("E", 0x7F, memory); // Increment of 0x7F -> set AC and S
    const inrE = execOp(env, inrD.endPos);
    expect(regs.get8id("E", memory)).toBe(0x80);
    expect(regs.getFlags()).toBe(P80FlagMask.S | P80FlagMask.AC | P80FlagMask.Default);;

    regs.set8id("H", 0xFF, memory); // Increment of 0xFF -> set AC, Z and P
    const inrH = execOp(env, inrE.endPos);
    expect(regs.get8id("H", memory)).toBe(0);
    expect(regs.getFlags()).toBe(P80FlagMask.Z | P80FlagMask.AC | P80FlagMask.P | P80FlagMask.Default);

    regs.setFlags(P80FlagMask.C); // C is not changed
    const inrL = execOp(env, inrH.endPos);
    expect(regs.get8id("L", memory)).toBe(1);
    expect(regs.getFlags()).toBe(P80FlagMask.C | P80FlagMask.Default);

    regs.setFlags(0);
    regs.set16id("HL", 1);
    memory.setByte(1, 6);
    const inrM = execOp(env, inrL.endPos);
    expect(regs.get8id("M", memory)).toBe(7);
    expect(memory.getByte(1)).toBe(7);
    expect(regs.getFlags()).toBe(P80FlagMask.Default);

    regs.setA(0x88);
    execOp(env, inrM.endPos);
    expect(regs.isFlagS()).toBe(true);
    expect(hexWord(regs.get16id("PSW"))).toBe("8982");
  })

  it("dec r8", () => {
    const env = createEnv(new Uint8Array([
      0x05, 0x0D, // dcr B, dcr C
      0x15, 0x1D, // dcr D, dct E
      0x25, 0x2D, // dcr H, dcr L
      0x35, 0x3D, // dct M, dcr A
    ]))
    const {memory, regs} = env;
    regs.setFlags(0);
    regs.set8id("B", 0, memory);
    let res = execOp(env);
    expect(res.length).toBe(1);
    expect(regs.get8id("B", memory)).toBe(0xFF);
    expect(regs.getFlags()).toBe(P80FlagMask.Default | P80FlagMask.S | P80FlagMask.P);

    regs.set8id("C", 4, memory);  // Decrement of 4 -> set P flag
    res = execOp(env, res.endPos);
    expect(regs.get8id("C", memory)).toBe(3);
    expect(regs.getFlags()).toBe(P80FlagMask.P | P80FlagMask.AC | P80FlagMask.Default);

    regs.set8id("D", 0x10, memory); // Decrement of 0x10 -> 0x0F
    res = execOp(env, res.endPos);
    expect(regs.get8id("D", memory)).toBe(0x0F);
    expect(regs.getFlags()).toBe(P80FlagMask.P | P80FlagMask.Default);;

    regs.set8id("E", 0x80, memory); // Decrement of 80 -> 0x7F
    res = execOp(env, res.endPos);
    expect(regs.get8id("E", memory)).toBe(0x7F);
    expect(regs.getFlags()).toBe(P80FlagMask.Default);

    regs.set8id("H", 1, memory); // Decrement of 1 -> 0 set AC, Z and P
    res = execOp(env, res.endPos);
    expect(regs.get8id("H", memory)).toBe(0);
    expect(regs.getFlags()).toBe(P80FlagMask.Z | P80FlagMask.AC | P80FlagMask.P | P80FlagMask.Default);

    regs.setFlags(P80FlagMask.C); // test for C is not changed
    regs.set8id("L", 2, memory)
    res = execOp(env, res.endPos);
    expect(regs.get8id("L", memory)).toBe(1);
    expect(regs.getFlags()).toBe(P80FlagMask.C | P80FlagMask.Default | P80FlagMask.AC);

    regs.setFlags(0);
    regs.set16id("HL", 1);
    memory.setByte(1, 5);
    res = execOp(env, res.endPos);
    expect(regs.get8id("M", memory)).toBe(4);
    expect(memory.getByte(1)).toBe(4);
    expect(regs.getFlags()).toBe(P80FlagMask.Default | P80FlagMask.AC);

    regs.setA(0x88);
    execOp(env, res.endPos);
    expect(regs.isFlagS()).toBe(true);
    expect(hexWord(regs.get16id("PSW"))).toBe("8796");
  })

  it("mov r8,i8", () => {
    let res = testTwoByteCmd(0x06, 0x01); // mvi B, 1;
    expect(res.regs.getB()).toBe(1);
    expect(res.length).toBe(2);
    res = testTwoByteCmd(0x0E, 0x06); // mvi C, 6;
    expect(res.regs.getC()).toBe(6);
    res = testTwoByteCmd(0x16, 0x1F); // mvi D, 1Fh;
    expect(res.regs.getD()).toBe(0x1F);
    res = testTwoByteCmd(0x1E, 0x22); // mvi E, 22h;
    expect(res.regs.getE()).toBe(0x22);
    res = testTwoByteCmd(0x26, 0xAA); // mvi H, 0AAh;
    expect(res.regs.getH()).toBe(0xAA);
    res = testTwoByteCmd(0x2E, 0x78); // mvi L, 78h;
    expect(res.regs.getL()).toBe(0x78);
    res = testTwoByteCmd(0x36, 0x55, { // HL=2, mvi M, 55h;
      beforeExec: ({regs}) => regs.set16id("HL", 2),
    }); 
    expect(res.memory.getByte(2)).toBe(0x55);
    res = testTwoByteCmd(0x3E, 0xFF); // mvi A, 0FFh;
    expect(res.regs.getA()).toBe(0xFF);
  })

  it("rlc", () => {
    const env = createEnv(new Uint8Array([7,7]))
    env.regs.setA(0b1010_1000);   
    let res = execOp(env);
    expect(res.length).toBe(1);
    expect(hexByte(res.regs.getA())).toBe("51");
    expect(res.regs.isFlagC()).toBe(true);
    execOp(env, res.endPos);
    expect(hexByte(res.regs.getA())).toBe("A2");
    expect(res.regs.isFlagC()).toBe(false);
  });

  it("rrc", () => {
    const env = createEnv(new Uint8Array([0xF,0xF]))
    env.regs.setA(0b1010_0010);   // A2
    let res = execOp(env);
    expect(res.length).toBe(1);
    expect(hexByte(res.regs.getA())).toBe("51"); // 0101.0001
    expect(res.regs.isFlagC()).toBe(false);
    execOp(env, res.endPos);
    expect(hexByte(res.regs.getA())).toBe("A8"); // 1010.1000
    expect(res.regs.isFlagC()).toBe(true);
  });

  it("ral", () => {
    const env = createEnv(new Uint8Array([0x17, 0x17]))
    env.regs.setFlags(env.regs.getFlags() | P80FlagMask.C);
    env.regs.setA(0b0010_0110);   
    let res = execOp(env);
    expect(res.length).toBe(1);
    expect(hexByte(res.regs.getA())).toBe("4D"); // (1) => (0) 0100_1101
    expect(res.regs.isFlagC()).toBe(false);
    execOp(env, res.endPos);
    expect(hexByte(res.regs.getA())).toBe("9A"); // (0) => 1001_1010 (0)
    expect(res.regs.isFlagC()).toBe(false);
  });

  it("rar", () => {
    const env = createEnv(new Uint8Array([0x1F,0x1F]))
    env.regs.setFlags(env.regs.getFlags() | P80FlagMask.C);
    env.regs.setA(0b1010_0010);   
    let res = execOp(env);
    expect(res.length).toBe(1);
    expect(hexByte(res.regs.getA())).toBe("D1"); // (1) => 1101_0001 (0)
    expect(res.regs.isFlagC()).toBe(false);
    execOp(env, res.endPos);
    expect(hexByte(res.regs.getA())).toBe("68"); // (0) => 0110_1000 (1)
    expect(res.regs.isFlagC()).toBe(true);
  });

  it("add HL,r16", () => {
    const env = createEnv(new Uint8Array([0x09, 0x19, 0x29, 0x39]));
    const {regs} = env;
    // 1st example from http://dunfield.classiccmp.org/r/8080asm.pdf (page 24)
    regs.set16id("BC", 0x339F);
    regs.setHL(0xA17B);
    let r = execOp(env); // dad B
    expect(regs.getHL()).toBe(0xD51A);
    expect(regs.isFlagC()).toBe(false);

    regs.set16id("DE", 0xFFFF);
    regs.setHL(3);
    r = execOp(env, r.endPos); // dad D
    expect(hexWord(regs.getHL())).toBe("0002");
    expect(regs.isFlagC()).toBe(true);

    r = execOp(env, r.endPos); // dad H
    expect(hexWord(regs.getHL())).toBe("0004");
    expect(regs.isFlagC()).toBe(false);

    regs.set16id("SP", 0x1000);
    r = execOp(env, r.endPos); // dad SP
    expect(hexWord(regs.getHL())).toBe("1004");
    expect(regs.isFlagC()).toBe(false);
  })

  it("mov A,[r16]", () => {
    const env = createEnv(new Uint8Array([0x0A, 0x1A]));
    const {regs, memory} = env;
    memory.setByte(2, 0x55);
    memory.setByte(7, 0xAA);
    regs.set16id("BC", 2);
    regs.set16id("DE", 7);
    let r = execOp(env);
    expect(r.length).toBe(1);
    expect(regs.getA()).toBe(0x55);
    r = execOp(env, r.endPos);
    expect(regs.getA()).toBe(0xAA);
  })

  it("dec r16", () => {
    const env = createEnv(new Uint8Array([0x0B, 0x1B, 0x2B, 0x3B]));
    const {regs} = env;
    expect(regs.isFlagC()).toBe(false);
    regs.set16id("BC", 0x9800);
    let r = execOp(env);
    expect(r.length).toBe(1);
    expect(hexWord(regs.get16id("BC"))).toBe("97FF");
    regs.set16id("DE", 1);
    r = execOp(env, r.endPos);
    expect(hexWord(regs.get16id("DE"))).toBe("0000");
    r = execOp(env, r.endPos);
    expect(hexWord(regs.getHL())).toBe("FFFF");
    expect(regs.isFlagC()).toBe(false); // флаг переноса не меняется
    regs.set16id("SP", 3);
    r = execOp(env, r.endPos);
    expect(hexWord(regs.get16id("SP"))).toBe("0002");
  })

  it("mov [i16],HL", () => { // SHLD
    const r = testThreeByteCmd(0x22, 4, {
      beforeExec: ({regs}) => regs.setHL(0x789A),
    })
    expect(r.length).toBe(3);
    expect(hexDump(readMemory(r.memory, 4, 2), " ")).toBe("9A 78");
  });
  it("mov HL,[i16]", () => { // LHLD
    const r = testThreeByteCmd(0x2A, 8, {
      beforeExec: ({comp}) => setMemoryWord(comp.memory, 8, 0xF00D),
    })
    expect(r.length).toBe(3);
    expect(hexDump(readMemory(r.memory, 8, 2), " ")).toBe("0D F0");
    expect(hexWord(r.regs.getHL())).toBe("F00D");
  });
  it("daa", () => {
    // Example: 33 + 49 = 82
    const r = testSingleByteCmd(0x27, {
      beforeExec: ({regs}) => regs.setA(0x33 + 0x49), // = 7C
    });
    expect(r.length).toBe(1);
    expect(hexByte(r.regs.getA())).toBe("82");
    expect(r.regs.isFlagAC()).toBe(true);
    expect(r.regs.isFlagC()).toBe(false);
  })
  it("not A", () => {
    // Не должно влиять на флаги
    const r = testSingleByteCmd(0x2F, {
      beforeExec: ({regs}) => regs.setPSW(0xE5FF),
    });
    expect(r.length).toBe(1);
    expect(hexWord(r.regs.getPSW())).toBe("1AFF");
  })
  it("stc", () => {
    const r = testSingleByteCmd(0x37);
    expect(r.length).toBe(1);
    expect(r.regs.isFlagC()).toBe(true);
  })
  it("cmc", () => {
    const env = createEnv(new Uint8Array([0x3F]));
    const {regs} = env;
    const fc = regs.getFlags() | P80FlagMask.C;
    expect(regs.isFlagC()).toBe(false);
    expect(regs.getFlags() | P80FlagMask.C).toBe(fc);
    execOp(env);
    expect(regs.isFlagC()).toBe(true);
    execOp(env);
    expect(regs.isFlagC()).toBe(false);
    expect(regs.getFlags() | P80FlagMask.C).toBe(fc);
  })
  it("mov r8,r8", () => {
    for (let opCode = 0x40; opCode <= 0x7F; opCode++) {
      if (opCode === 0x76) continue; // Нет команды mov M, M. Вместо неё HLT
      const srcNdx = opCode & 7;
      const dstNdx = (opCode >> 3) & 7;
      const srcName = P80Reg8NameByIndex[srcNdx];
      const dstName = P80Reg8NameByIndex[dstNdx];
      // Тестовым значением является индекс исходного регистра + 1
      // Т.е тестовые значения всегда ненулевые, а остальные р-ры = 0
      // За исключением mov M, H. Т.к. получаемый адрес выходит за границы выделяемой памяти
      const testValue = (dstName === "M" && srcName === "H") ? 0 : srcNdx + 1;
      const needCmd = `mov ${dstName}, ${srcName} = ${testValue}`;
      const r = testSingleByteCmd(opCode, {
        beforeExec: ({regs, memory}) => {
          regs.set8ndx(srcNdx, testValue, memory);
        }
      });
      const actualValue = r.regs.get8ndx(dstNdx, r.memory);
      const actualCmd = `mov ${dstName}, ${srcName} = ${actualValue}`;
      expect(actualCmd).toBe(needCmd);
    }
  })
  it("hlt", () => {
    const r = testSingleByteCmd(0x76);
    expect(r.length).toBe(0);
  })

  it("add r8", () => {
    const env = createEnv(new Uint8Array([0x80, 0x81, 0x82, 0x83, 0x84, 0x85, 0x86, 0x87]));
    const {regs, memory} = env;
    //         B  C    D     E     H  L  M     A 
    const v = [1, 0xF, 0x7F, 0x72, 0, 8, 0xF7, 0];
    for (let i=0; i<8; i++) regs.set8ndx(i, v[i], memory);
    let r = execOp(env); // add B
    expect(hexWord(regs.getPSW())).toBe("0102"); // 0 + 1 = 1, -
    r = execOp(env, r.endPos); // add C
    expect(hexWord(regs.getPSW())).toBe("1012"); // 1 + F = 10, AC
    r = execOp(env, r.endPos); // add D
    expect(hexWord(regs.getPSW())).toBe("8F82"); // 10 + 7F = 8F, S
    r = execOp(env, r.endPos); // add E
    expect(hexWord(regs.getPSW())).toBe("0113"); // 7F + 72 = 1, AC, C
    r = execOp(env, r.endPos); // add H
    expect(hexWord(regs.getPSW())).toBe("0102"); // 1 + 0 = 1, -
    r = execOp(env, r.endPos); // add L
    expect(hexWord(regs.getPSW())).toBe("0906"); // 1 + 8 = 9, P
    r = execOp(env, r.endPos); // add M
    expect(hexWord(regs.getPSW())).toBe("0057"); // 9 + F7 = 0, Z, AC, P, C
    r = execOp(env, r.endPos); // add A
    expect(hexWord(regs.getPSW())).toBe("0046"); // 0 + 0 = 0, Z, P
  })
  it("add i8", () => {
    const env = createEnv(new Uint8Array([0xC6, 0xFF, 0xC6, 1]));
    const { regs } = env;
    regs.setA(2);
    let r = execOp(env);
    expect(regs.getA()).toBe(1);
    expect(regs.isFlagC()).toBe(true);
    execOp(env, r.endPos);
    expect(regs.getA()).toBe(2);
    expect(regs.isFlagC()).toBe(false);
  });

  it("adc r8", () => {
    const env = createEnv(new Uint8Array([0x88, 0x89, 0x8A, 0x8B, 0x8C, 0x8D, 0x8E, 0x8F]));
    const {regs, memory} = env;
    //         B  C    D     E     H  L  M     A 
    const v = [1, 0xF, 0x7F, 0x72, 0, 8, 0xF7, 0];
    for (let i=0; i<8; i++) regs.set8ndx(i, v[i], memory);
    let r = execOp(env); // adc B
    expect(hexWord(regs.getPSW())).toBe("0102"); // 0 + 1 = 1, -
    r = execOp(env, r.endPos); // adc C
    expect(hexWord(regs.getPSW())).toBe("1012"); // 1 + F = 10, AC
    r = execOp(env, r.endPos); // adc D
    expect(hexWord(regs.getPSW())).toBe("8F82"); // 10 + 7F = 8F, S
    r = execOp(env, r.endPos); // adc E
    expect(hexWord(regs.getPSW())).toBe("0113"); // 7F + 72 = 1, AC, C
    r = execOp(env, r.endPos); // adc H
    expect(hexWord(regs.getPSW())).toBe("0202"); // 1 + 0 + **C** = 2, -
    r = execOp(env, r.endPos); // adc L
    expect(hexWord(regs.getPSW())).toBe("0A06"); // 2 + 8 = A, P
    r = execOp(env, r.endPos); // adc M
    expect(hexWord(regs.getPSW())).toBe("0113"); // A + F7 = 1, AC, C
    r = execOp(env, r.endPos); // adc A
    expect(hexWord(regs.getPSW())).toBe("0306"); // 1 + 1 + **C** = 2, P
  })
  it("adc i8", () => {
    const env = createEnv(new Uint8Array([0xCE, 0xFF, 0xCE, 1]));
    const { regs } = env;
    regs.setA(2);
    let r = execOp(env);
    expect(regs.getA()).toBe(1);
    expect(regs.isFlagC()).toBe(true);
    execOp(env, r.endPos);
    expect(regs.getA()).toBe(3);
    expect(regs.isFlagC()).toBe(false);
  });

  it("sub r8", () => {
    const env = createEnv(new Uint8Array([0x90, 0x91, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97]));
    const {regs, memory} = env;
    //         B  C    D     E     H  L  M     A 
    const v = [1, 0xF, 0x7F, 0x72, 0, 8, 0xF7, 2];
    for (let i=0; i<8; i++) regs.set8ndx(i, v[i], memory);
    let r = execOp(env); // sub B
    expect(hexWord(regs.getPSW())).toBe("0112"); // 2 - 1 = 1, AC
    r = execOp(env, r.endPos); // sub C
    expect(hexWord(regs.getPSW())).toBe("F283"); // 1 - F = F2, S, C
    r = execOp(env, r.endPos); // sub D
    expect(hexWord(regs.getPSW())).toBe("7302"); // F2 - 7F = 73, -
    r = execOp(env, r.endPos); // sub E
    expect(hexWord(regs.getPSW())).toBe("0112"); // 73 - 72 = 1, AC
    r = execOp(env, r.endPos); // sub H
    expect(hexWord(regs.getPSW())).toBe("0102"); // 1 - 0 = 1, -
    r = execOp(env, r.endPos); // sub L
    expect(hexWord(regs.getPSW())).toBe("F987"); // 1 - 8 = F9, S, P, C
    r = execOp(env, r.endPos); // sub M
    expect(hexWord(regs.getPSW())).toBe("0212"); // F9 - F7 = 2, AC
    r = execOp(env, r.endPos); // sub A
    expect(hexWord(regs.getPSW())).toBe("0056"); // 2 - 2 = 0, Z, P, AC
  })
  it("sub i8", () => {
    const env = createEnv(new Uint8Array([0xD6, 0xFF, 0xD6, 1]));
    const { regs } = env;
    regs.setA(1);
    let r = execOp(env);
    expect(regs.getA()).toBe(2);
    expect(regs.isFlagC()).toBe(true);
    execOp(env, r.endPos);
    expect(regs.getA()).toBe(1);
    expect(regs.isFlagC()).toBe(false);
  });

  it("sbb r8", () => {
    const env = createEnv(new Uint8Array([0x98, 0x99, 0x9A, 0x9B, 0x9C, 0x9D, 0x9E, 0x9F]));
    const {regs, memory} = env;
    //         B  C    D     E     H  L  M     A 
    const v = [1, 0xF, 0x7F, 0x72, 0, 8, 0xF7, 2];
    for (let i=0; i<8; i++) regs.set8ndx(i, v[i], memory);
    let r = execOp(env); // sbb B
    expect(hexWord(regs.getPSW())).toBe("0112"); // 2 - 1 = 1, AC
    r = execOp(env, r.endPos); // sbb C
    expect(hexWord(regs.getPSW())).toBe("F283"); // 1 - F = F2, S, C
    r = execOp(env, r.endPos); // sbb D
    expect(hexWord(regs.getPSW())).toBe("7206"); // F2 - 7F - **C** = 72, P
    r = execOp(env, r.endPos); // sbb E
    expect(hexWord(regs.getPSW())).toBe("0056"); // 72 - 72 = 0, Z, AC, P
    r = execOp(env, r.endPos); // sbb H
    expect(hexWord(regs.getPSW())).toBe("0046"); // 0 - 0 = 0, Z, P
    r = execOp(env, r.endPos); // sbb L
    expect(hexWord(regs.getPSW())).toBe("F883"); // 0 - 8 = F8, S, C
    r = execOp(env, r.endPos); // sbb M
    expect(hexWord(regs.getPSW())).toBe("0056"); // F8 - F7 - **C** = 0, Z, AC, P
    r = execOp(env, r.endPos); // sbb A
    expect(hexWord(regs.getPSW())).toBe("0046"); // 0 - 0 = 0, Z, P, AC
  })
  it("sbb i8", () => {
    const env = createEnv(new Uint8Array([0xDE, 0xFF, 0xDE, 1]));
    const { regs } = env;
    regs.setA(1);
    let r = execOp(env);
    expect(regs.getA()).toBe(2);
    expect(regs.isFlagC()).toBe(true);
    execOp(env, r.endPos);
    expect(regs.getA()).toBe(0);
    expect(regs.isFlagC()).toBe(false);
    expect(regs.isFlagZ()).toBe(true);
  });

  it("and r8", () => {
    const env = createEnv(new Uint8Array([0xA0, 0xA1, 0xA2, 0xA3, 0xA4, 0xA5, 0xA6, 0xA7]));
    const {regs, memory} = env;
    //         B     C     D     E     H  L  M     A 
    const v = [0xFA, 0x7F, 0xF9, 0xC0, 0, 5, 0xFE, 0xFF];
    for (let i=0; i<8; i++) regs.set8ndx(i, v[i], memory);
    let r = execOp(env); // ana B
    expect(hexWord(regs.getPSW())).toBe("FA86"); // FF and FA = FA, S, P
    r = execOp(env, r.endPos); // ana C
    expect(hexWord(regs.getPSW())).toBe("7A02"); // FA and 7F = 7A, -
    r = execOp(env, r.endPos); // ana D
    expect(hexWord(regs.getPSW())).toBe("7806"); // 7A & F9  = 78, P
    r = execOp(env, r.endPos); // ana E
    expect(hexWord(regs.getPSW())).toBe("4002"); // 78 & C0 = 40, -
    r = execOp(env, r.endPos); // ana H
    expect(hexWord(regs.getPSW())).toBe("0046"); // 0 & 0 = 0, Z, P
    regs.setA(0xFF);
    r = execOp(env, r.endPos); // ana L
    expect(hexWord(regs.getPSW())).toBe("0506"); // FF & 5 = 5, P
    r = execOp(env, r.endPos); // ana M
    expect(hexWord(regs.getPSW())).toBe("0402"); // 5 & FE = 4, -
    r = execOp(env, r.endPos); // ana A
    expect(hexWord(regs.getPSW())).toBe("0402"); // 4 & 4 = 4, -
  })
  it("and i8", () => {
    const env = createEnv(new Uint8Array([0xE6, 0xAA, 0xE6, 0x55]));
    const { regs } = env;
    regs.setA(0xC3);
    let r = execOp(env); // CC & AA = 82
    expect(regs.getA()).toBe(0x82);
    expect(regs.isFlagZ()).toBe(false);
    execOp(env, r.endPos); // 82 & 55 = 0
    expect(regs.getA()).toBe(0);
    expect(regs.isFlagZ()).toBe(true);
  });

  it("or r8", () => {
    const env = createEnv(new Uint8Array([0xB0, 0xB1, 0xB2, 0xB3, 0xB4, 0xB5, 0xB6, 0xB7]));
    const {regs, memory} = env;
    //         B     C     D     E     H  L  M     A 
    const v = [0x00, 0x0A, 0x90, 0xC0, 0, 5, 0x20, 0];
    for (let i=0; i<8; i++) regs.set8ndx(i, v[i], memory);
    let r = execOp(env); // ora B
    expect(hexWord(regs.getPSW())).toBe("0046"); // 0 or 0 = 0, Z, P
    r = execOp(env, r.endPos); // ora C
    expect(hexWord(regs.getPSW())).toBe("0A06"); // 0 or 0A = 0A, P
    r = execOp(env, r.endPos); // ora D
    expect(hexWord(regs.getPSW())).toBe("9A86"); // 0A | 90  = 9A, S, P
    r = execOp(env, r.endPos); // ora E
    expect(hexWord(regs.getPSW())).toBe("DA82"); // 9A | C0 = DA, S
    r = execOp(env, r.endPos); // ora H
    expect(hexWord(regs.getPSW())).toBe("DA82"); // DA | 0 = DA, S
    r = execOp(env, r.endPos); // ora L
    expect(hexWord(regs.getPSW())).toBe("DF82"); // DA | 5 = DF, S
    r = execOp(env, r.endPos); // ora M
    expect(hexWord(regs.getPSW())).toBe("FF86"); // DF | 20 = FF, S, P
    r = execOp(env, r.endPos); // ora A
    expect(hexWord(regs.getPSW())).toBe("FF86"); // FF | FF = FF, S, P
  })
  it("or i8", () => {
    const env = createEnv(new Uint8Array([0xF6, 0x50, 0xF6, 0xA0]));
    const { regs } = env;
    regs.setA(0x0F);
    let r = execOp(env); // F | 50 = 5F
    expect(regs.getA()).toBe(0x5F);
    expect(regs.isFlagS()).toBe(false);
    execOp(env, r.endPos); // 5F | A0 = FF
    expect(regs.getA()).toBe(0xFF);
    expect(regs.isFlagS()).toBe(true);
  });

  it("xor r8", () => {
    const env = createEnv(new Uint8Array([0xA8, 0xA9, 0xAA, 0xAB, 0xAC, 0xAD, 0xAE, 0xAF]));
    const {regs, memory} = env;
    //         B     C     D     E     H  L  M     A 
    const v = [0x00, 0x0A, 0x90, 0xC0, 0, 5, 0x20, 0];
    for (let i=0; i<8; i++) regs.set8ndx(i, v[i], memory);
    let r = execOp(env); // xra B
    expect(hexWord(regs.getPSW())).toBe("0046"); // 0 ^ 0 = 0, Z, P
    r = execOp(env, r.endPos); // xra C
    expect(hexWord(regs.getPSW())).toBe("0A06"); // 0 ^ 0A = 0A, P
    r = execOp(env, r.endPos); // xra D
    expect(hexWord(regs.getPSW())).toBe("9A86"); // 0A ^ 90  = 9A, S, P
    r = execOp(env, r.endPos); // xra E
    expect(hexWord(regs.getPSW())).toBe("5A06"); // 9A ^ C0 = 5A, P
    r = execOp(env, r.endPos); // xra H
    expect(hexWord(regs.getPSW())).toBe("5A06"); // 5A ^ 0 = 5A, P
    r = execOp(env, r.endPos); // xra L
    expect(hexWord(regs.getPSW())).toBe("5F06"); // 5A ^ 5 = 5F, P
    r = execOp(env, r.endPos); // xra M
    expect(hexWord(regs.getPSW())).toBe("7F02"); // 5F ^ 20 = 7F, -
    r = execOp(env, r.endPos); // xra A
    expect(hexWord(regs.getPSW())).toBe("0046"); // 7F ^ 7F = 0, Z, P
  })
  it("xor i8", () => {
    const env = createEnv(new Uint8Array([0xEE, 0x55, 0xEE, 0xFF]));
    const { regs } = env;
    regs.setA(0xFF);
    let r = execOp(env); // FF ^ 55 = AA
    expect(regs.getA()).toBe(0xAA);
    expect(regs.isFlagS()).toBe(true);
    execOp(env, r.endPos); // AA ^ FF = 55
    expect(regs.getA()).toBe(0x55);
    expect(regs.isFlagS()).toBe(false);
  });

  it("cmp r8", () => {
    const env = createEnv(new Uint8Array([0xB8, 0xB9, 0xBA, 0xBB, 0xBC, 0xBD, 0xBE, 0xBF]));
    const {regs, memory} = env;
    //         B     C    D     E     H  L  M     A 
    const v = [0xFF, 0xF, 0x7F, 0x72, 0, 8, 0xF7, 0x7F];
    for (let i=0; i<8; i++) regs.set8ndx(i, v[i], memory);
    let r = execOp(env); // sub B
    expect(hexWord(regs.getPSW())).toBe("7F93"); // 7F - FF = 80, S, AC, C
    r = execOp(env, r.endPos); // sub C
    expect(hexWord(regs.getPSW())).toBe("7F12"); // 7F - 0F = 70, AC
    r = execOp(env, r.endPos); // sub D
    expect(hexWord(regs.getPSW())).toBe("7F56"); // 7F - 7F = 0, Z, AC, P
    r = execOp(env, r.endPos); // sub E
    expect(hexWord(regs.getPSW())).toBe("7F12"); // 7F - 72 = 0D, AC
    r = execOp(env, r.endPos); // sub H
    expect(hexWord(regs.getPSW())).toBe("7F02"); // 7F - 0 = 7F, -
    r = execOp(env, r.endPos); // sub L
    expect(hexWord(regs.getPSW())).toBe("7F16"); // 7F - 8 = 77, P, AC
    r = execOp(env, r.endPos); // sub M
    expect(hexWord(regs.getPSW())).toBe("7F97"); // 7F - F7 = 88, S, P, AC, C
    r = execOp(env, r.endPos); // sub A
    expect(hexWord(regs.getPSW())).toBe("7F56"); // 7F - 7F = 0, Z, P, AC
  })
  it("cmp i8", () => {
    const env = createEnv(new Uint8Array([0xFE, 0xFF, 0xFE, 1]));
    const { regs } = env;
    regs.setA(1);
    let r = execOp(env);  // a=1, cpi FF -> CF=1, Z=0
    expect(regs.getA()).toBe(1);
    expect(regs.isFlagC()).toBe(true);
    expect(regs.isFlagZ()).toBe(false);
    execOp(env, r.endPos);
    expect(regs.getA()).toBe(1); // a=1, cpi 1 -> CF=0, Z=1
    expect(regs.isFlagC()).toBe(false);
    expect(regs.isFlagZ()).toBe(true);
  });

  it("jmp i16", () => {
    const r = testThreeByteCmd(0xC3, 0xF803);
    expect(r.length).toBe(0);
    expect(r.regs.getPC()).toBe(0xF803)
  })

  it("pop r16s", () => {
    const env = createEnv(new Uint8Array([0xC1, 0xD1, 0xE1, 0xF1]));
    const {regs, memory} = env;
    // Example from http://dunfield.classiccmp.org/r/8080asm.pdf (page 23)
    const stack = new Uint8Array([0xFF, 0x3D, 0x93, 0xFF, 0x17, 0x34, 0x12, 0xC3, 0xFF]);
    writeMemory(memory, 0x38, stack.length, stack);
    regs.setSP(0x39);
    let r = execOp(env); // pop B
    expect(r.length).toBe(1);
    expect(hexWord(regs.get16id("BC"))).toBe("933D");
    expect(regs.getSP()).toBe(0x3B);
    r = execOp(env, r.endPos); // pop D
    expect(hexWord(regs.get16id("DE"))).toBe("17FF");
    expect(regs.getSP()).toBe(0x3D);
    r = execOp(env, r.endPos); // pop H
    expect(hexWord(regs.get16id("HL"))).toBe("1234");
    expect(regs.getSP()).toBe(0x3F);
    r = execOp(env, r.endPos); // pop PSW
    expect(hexWord(regs.getPSW())).toBe("FFC3");
    expect(regs.getSP()).toBe(0x41);
  })

  it("push r16s", () => {
    const env = createEnv(new Uint8Array([0xC5, 0xD5, 0xE5, 0xF5]));
    const {regs, memory} = env;
    regs.setSP(0x2C);
    regs.set16id("BC", 0x8F9D);
    let r = execOp(env);
    expect(regs.getSP()).toBe(0x2A);
    expect(hexWord(getMemoryWord(memory, 0x2A))).toBe("8F9D");
    regs.set16id("DE", 0xDDEE);
    r = execOp(env, r.endPos);
    expect(regs.getSP()).toBe(0x28);
    expect(hexWord(getMemoryWord(memory, 0x28))).toBe("DDEE");
    regs.setHL(0x1234);
    r = execOp(env, r.endPos);
    expect(regs.getSP()).toBe(0x26);
    expect(hexWord(getMemoryWord(memory, 0x26))).toBe("1234");
    regs.setPSW(0x1F47);
    r = execOp(env, r.endPos);
    expect(regs.getSP()).toBe(0x24);
    expect(hexWord(getMemoryWord(memory, 0x24))).toBe("1F47");
  });

  it("jmp-con i16", () => {
    let r = testThreeByteCmd(0xC2, 0x1080); // jnz
    expect(r.regs.isFlagZ()).toBe(false);
    expect(isCondition80(r.regs.getFlags(), r.buf[0]!)).toBe(true);
    expect(hexWord(r.regs.getPC())).toBe("1080");
    expect(r.length).toBe(0);
    r = testThreeByteCmd(0xC2, 0x1080, {
      beforeExec: ({regs}) => regs.setFlag(P80FlagMask.Z, true),
    })
    expect(r.regs.isFlagZ()).toBe(true);
    expect(isCondition80(r.regs.getFlags(), r.buf[0]!)).toBe(false);
    expect(r.length).toBe(3);

    r = testThreeByteCmd(0xCA, 0x1080) // jz
    expect(r.length).toBe(3);

    r = testThreeByteCmd(0xD2, 0x1080) // jnc
    expect(hexWord(r.regs.getPC())).toBe("1080");
    expect(r.length).toBe(0);
    r = testThreeByteCmd(0xDA, 0x1080) // jc
    expect(r.length).toBe(3);

    r = testThreeByteCmd(0xE2, 0x1080); // jpo
    expect(hexWord(r.regs.getPC())).toBe("1080");
    expect(r.length).toBe(0)
    r = testThreeByteCmd(0xEA, 0x1080) // jpe
    expect(r.length).toBe(3);

    r = testThreeByteCmd(0xF2, 0x1080); // jp
    expect(hexWord(r.regs.getPC())).toBe("1080");
    expect(r.length).toBe(0)
    r = testThreeByteCmd(0xFA, 0x1080) // jm
    expect(r.length).toBe(3);
  });

  it("call i16", () => {
    let r = testThreeByteCmd(0xCD, 0x2C00, {
      beforeExec: ({regs}) => regs.setSP(10),
    });
    expect(hexWord(r.regs.getPC())).toBe("2C00");
    expect(r.regs.getSP()).toBe(8);
    expect(getMemoryWord(r.memory, 8)).toBe(3);
  })
  it("ret", () => {
    let r = testSingleByteCmd(0xC9, {
      beforeExec: ({regs, memory}) => {
        regs.setSP(8);
        setMemoryWord(memory, 8, 0x2C03);
      }
    });
    expect(r.length).toBe(0);
    expect(hexWord(r.regs.getPC())).toBe("2C03");
    expect(r.regs.getSP()).toBe(10);
  })
  it("call-con i16", () => {
    const test = (opName: string, opCode: number, flags = 0) => {
      const {length, regs, memory} = testThreeByteCmd(opCode, 0xCA11, {
        beforeExec: ({regs}) => {
          regs.setPC(0x400)
          regs.setSP(10);
          regs.setFlags(flags);
        }
      });
      return {
        op: `${opName}(${hexByte(flags)})`,
        pc: hexWord(regs.getPC() + length),
        stk: hexWord(getMemoryWord(memory, 8)),
      }
    }
    expect(test("CNZ", 0xC4)).toEqual({
      op: "CNZ(00)",
      pc: "CA11",
      stk: "0403",
    });
    expect(test("CNZ", 0xC4, P80FlagMask.Z)).toEqual({
      op: "CNZ(40)",
      pc: "0403",
      stk: "0000",
    });
    expect(test("CZ", 0xCC)).toEqual({
      op: "CZ(00)",
      stk: "0000",
      pc: "0403",
    });
    expect(test("CZ", 0xCC, P80FlagMask.Z)).toEqual({
      op: "CZ(40)",
      pc: "CA11",
      stk: "0403",
    });

    expect(test("CNC", 0xD4)).toEqual({
      op: "CNC(00)",
      pc: "CA11",
      stk: "0403",
    });
    expect(test("CNC", 0xD4, P80FlagMask.C)).toEqual({
      op: "CNC(01)",
      pc: "0403",
      stk: "0000",
    });
    expect(test("CC", 0xDC)).toEqual({
      op: "CC(00)",
      stk: "0000",
      pc: "0403",
    });
    expect(test("CC", 0xDC, P80FlagMask.C)).toEqual({
      op: "CC(01)",
      pc: "CA11",
      stk: "0403",
    });

    expect(test("CPO", 0xE4)).toEqual({
      op: "CPO(00)",
      pc: "CA11",
      stk: "0403",
    });
    expect(test("CPO", 0xE4, P80FlagMask.P)).toEqual({
      op: "CPO(04)",
      pc: "0403",
      stk: "0000",
    });
    expect(test("CPE", 0xEC)).toEqual({
      op: "CPE(00)",
      stk: "0000",
      pc: "0403",
    });
    expect(test("CPE", 0xEC, P80FlagMask.P)).toEqual({
      op: "CPE(04)",
      pc: "CA11",
      stk: "0403",
    });

    expect(test("CP", 0xF4)).toEqual({
      op: "CP(00)",
      pc: "CA11",
      stk: "0403",
    });
    expect(test("CP", 0xF4, P80FlagMask.S)).toEqual({
      op: "CP(80)",
      pc: "0403",
      stk: "0000",
    });
    expect(test("CM", 0xFC)).toEqual({
      op: "CM(00)",
      stk: "0000",
      pc: "0403",
    });
    expect(test("CM", 0xFC, P80FlagMask.S)).toEqual({
      op: "CM(80)",
      pc: "CA11",
      stk: "0403",
    });
  })
  it("ret-con", () => {
    const test = (opName: string, opCode: number, flags = 0) => {
      const {regs, length} = testSingleByteCmd(opCode, {
        beforeExec: ({regs, memory}) => {
          regs.setFlags(flags);
          regs.setPC(0xCA11);
          regs.setSP(8);
          setMemoryWord(memory, 8, 0xBACC);
        },
      });
      return {
        op: `${opName}(${hexByte(flags)})`,
        pc: hexWord(regs.getPC() + length),
        sp: regs.getSP(),
      }
    }
    expect(test("RNZ", 0xC0)).toEqual({op: "RNZ(00)", pc: "BACC", sp: 10});
    expect(test("RNZ", 0xC0, P80FlagMask.Z)).toEqual({op: "RNZ(40)", pc: "CA12", sp: 8});
    expect(test("RZ", 0xC8)).toEqual({op: "RZ(00)", pc: "CA12", sp: 8});
    expect(test("RZ", 0xC8, P80FlagMask.Z)).toEqual({op: "RZ(40)", pc: "BACC", sp: 10});
    expect(test("RNC", 0xD0)).toEqual({op: "RNC(00)", pc: "BACC", sp: 10});
    expect(test("RNC", 0xD0, P80FlagMask.C)).toEqual({op: "RNC(01)", pc: "CA12", sp: 8});
    expect(test("RC", 0xD8)).toEqual({op: "RC(00)", pc: "CA12", sp: 8});
    expect(test("RC", 0xD8, P80FlagMask.C)).toEqual({op: "RC(01)", pc: "BACC", sp: 10});
    expect(test("RPO", 0xE0)).toEqual({op: "RPO(00)", pc: "BACC", sp: 10});
    expect(test("RPO", 0xE0, P80FlagMask.P)).toEqual({op: "RPO(04)", pc: "CA12", sp: 8});
    expect(test("RPE", 0xE8)).toEqual({op: "RPE(00)", pc: "CA12", sp: 8});
    expect(test("RPE", 0xE8, P80FlagMask.P)).toEqual({op: "RPE(04)", pc: "BACC", sp: 10});
    expect(test("RP", 0xF0)).toEqual({op: "RP(00)", pc: "BACC", sp: 10});
    expect(test("RP", 0xF0, P80FlagMask.S)).toEqual({op: "RP(80)", pc: "CA12", sp: 8});
    expect(test("RM", 0xF8)).toEqual({op: "RM(00)", pc: "CA12", sp: 8});
    expect(test("RM", 0xF8, P80FlagMask.S)).toEqual({op: "RM(80)", pc: "BACC", sp: 10});
  })

  it("rst i3", () => {
    const test = (opCode: number) => {
      const i = (opCode >> 3) & 7;
      const r = testSingleByteCmd(opCode, {
        beforeExec: ({regs}) => {
          regs.setSP(102);
          regs.setPC(0xCA11);
        },
      });

      return {
        op: `RST ${i}`,
        pc: hexWord(r.regs.getPC()+r.length),
        ret: hexWord(getMemoryWord(r.memory, 100)),
      }
    }
    expect(test(0xC7)).toEqual({op: "RST 0", pc: "0000", ret: "CA12"});
    expect(test(0xCF)).toEqual({op: "RST 1", pc: "0008", ret: "CA12"});
    expect(test(0xD7)).toEqual({op: "RST 2", pc: "0010", ret: "CA12"});
    expect(test(0xDF)).toEqual({op: "RST 3", pc: "0018", ret: "CA12"});
    expect(test(0xE7)).toEqual({op: "RST 4", pc: "0020", ret: "CA12"});
    expect(test(0xEF)).toEqual({op: "RST 5", pc: "0028", ret: "CA12"});
    expect(test(0xF7)).toEqual({op: "RST 6", pc: "0030", ret: "CA12"});
    expect(test(0xFF)).toEqual({op: "RST 7", pc: "0038", ret: "CA12"});
  })

  it("di", () => {
    const env = createEnv(new Uint8Array([0xF3]));
    expect(env.cpu.intEnabled).toBe(true);
    const r = execOp(env);
    expect(r.length).toBe(1);
    expect(env.cpu.intEnabled).toBe(false);
  })
  it("ei", () => {
    const env = createEnv(new Uint8Array([0xFB]));
    env.cpu.enableInt(false);
    expect(env.cpu.intEnabled).toBe(false);
    const r = execOp(env);
    expect(r.length).toBe(1);
    expect(env.cpu.intEnabled).toBe(true);
  })
  it("out [i8]", () => {
    const cpu = new TestInOutCPU();
    cpu.regs.setA(0xAA);
    const r = testTwoByteCmd(0xD3, 15, {cpu});
    expect(r.length).toBe(2);
    expect(cpu.outBuf[15]).toBe(0xAA);
  })
  it("in [i8]", () => {
    const cpu = new TestInOutCPU();
    cpu.inBuf[21] = 0x3C;
    const r = testTwoByteCmd(0xDB, 21, {cpu});
    expect(r.length).toBe(2);
    expect(cpu.regs.getA()).toBe(0x3C);
  })
  it("xchg [SP],HL", () => {
    const r = testSingleByteCmd(0xE3, {
      beforeExec: ({regs, memory}) => {
        regs.setSP(20);
        regs.setHL(0x1234);
        setMemoryWord(memory, 20, 0xBCDE);
      }
    });
    expect(r.length).toBe(1);
    expect(hexWord(r.regs.getHL())).toBe("BCDE");
    expect(hexWord(getMemoryWord(r.memory, 20))).toBe("1234");
    expect(r.regs.getSP()).toBe(20);
  })
  it("xchg DE,HL", () => {
    const env = createEnv(new Uint8Array([0xEB]));
    const {regs} = env;
    regs.set16id("DE", 0xDDEE);
    regs.setHL(0x0102);
    const r = execOp(env);
    expect(r.length).toBe(1)
    expect(hexWord(regs.get16id("DE"))).toBe("0102");
    expect(hexWord(regs.getHL())).toBe("DDEE");
  })
  it("jmp [HL]", () => {
    const r = testSingleByteCmd(0xE9, {
      beforeExec: ({regs}) => regs.setHL(0x5678),
    });
    expect(r.length).toBe(0);
    expect(hexWord(r.regs.getPC())).toBe("5678");
  })
});

