/**
 * Тут проверяются ВСЕ команды процессора 8080
 */

import {cmd8080 as commands} from "./cmd8080";
import {opCode8080 as opCode} from "./opCode8080";
import {syntax8080, syntax8080ext} from "./syntax8080";
import {syntaxZ80} from "../z80/syntaxZ80";

const stdSyntaxMap = {
  i80: syntax8080,
  I80: syntax8080ext({opUp: true}),
  z80: syntaxZ80,
}

const getInfo = (buffer: Uint8Array, offset: number) => {
    const code = opCode[buffer[offset]];
    const cmd = code ? commands[code] : null;
    const params = cmd?.params?.(buffer, offset);
    const cmdText = (key: keyof typeof stdSyntaxMap): string =>
      // @ts-ignore
      stdSyntaxMap[key][code]?.(params?.[0], params?.[1]) ?? 
      stdSyntaxMap[key].opName(code ?? "");
    const res = {
      code, 
      cmd, 
      params,
      i80: cmdText("i80"),
      I80: cmdText("I80"),
      z80: cmdText("z80"),
    }
    return res;
}


const singleByteOp = (code: number) => getInfo(new Uint8Array([code]), 0);
const twoByteOp = (code: number, byte: number) => getInfo(new Uint8Array([code, byte]), 0);
const threeByteOp = (code: number, param: number) => 
  getInfo(new Uint8Array([code, param & 0xFF, param >> 8]), 0);


describe("commands", () => {
  it("all", () => {
    for (let i=0; i<256; i++) {
      expect(`CodeKey of ${i.toString(16)} = ${opCode[i]}`)
        .toEqual(expect.not.stringContaining("undefined"))    }
  })

  it("nop", () => {
    const r = getInfo(new Uint8Array([0]), 0);
    expect(r.code).toBe("nop");
    expect(r.params).toBeUndefined();
    expect(r.i80).toBe("nop");
    expect(r.I80).toBe("NOP");
    expect(r.z80).toBe("nop");
  });

  it("mov r8,r8", () => {
    const buf = new Uint8Array([
      0x40, // mob b,b
    ])
    let pos = 0;
    let r = getInfo(buf, pos++);
    expect(r.code).toBe("mov r8,r8");
    expect(r.cmd?.length).toBe(1);
    expect(r.I80).toBe("MOV B, B");
    expect(r.i80).toBe("mov B, B");
    expect(r.z80).toBe("ld B, B");
  })

  it("mov r16,i16", () => {
    const buf = new Uint8Array([
      0x01, 0xEF, 0xAB, 
      0x11, 1, 0, 
      0x21, 0x34, 0x12,
      0x31, 0x67, 0x45,
    ]);

    const rec1 = getInfo(buf, 0);
    expect(rec1.code).toBe("mov r16,i16");
    expect(rec1.params).toEqual([0, 0xABEF]);
    expect(rec1.i80).toBe("lxi B, 0ABEFH");
    expect(rec1.I80).toBe("LXI B, 0ABEFH");
    expect(rec1.z80).toBe("ld BC, $ABEF");

    const rec2 = getInfo(buf, 3);
    expect(rec2.code).toBe(rec1.code);
    expect(rec2.params).toEqual([1, 1]);
    expect(rec2.i80).toBe("lxi D, 0001H");
    expect(rec2.z80).toBe("ld DE, $0001");

    const rec3 = getInfo(buf, 6);
    expect(rec3.i80).toBe("lxi H, 1234H");
    expect(rec3.z80).toBe("ld HL, $1234");

    const rec4 = getInfo(buf, 9);
    expect(rec4.i80).toBe("lxi SP, 4567H");
    expect(rec4.z80).toBe("ld SP, $4567");
  });

  it("mov [r16],A", () => {
    const buf = new Uint8Array([0x02, 0x12]);
    const rec1 = getInfo(buf, 0);
    expect(rec1.code).toBe("mov [r16],A");
    expect(rec1.params).toEqual([0]);
    expect(rec1.i80).toBe("stax B");
    expect(rec1.I80).toBe("STAX B");
    expect(rec1.z80).toBe("ld (BC), A");

    const rec2 = getInfo(buf, rec1.cmd!.length);
    expect(rec2.params).toEqual([1]);
    expect(rec2.i80).toBe("stax D");
    expect(rec2.z80).toBe("ld (DE), A");
  })
  it("mov SP,HL", () => {
    const r = singleByteOp(0xF9);
    expect(r.code).toBe("mov SP,HL");
    expect(r.i80).toBe("sphl");
    expect(r.I80).toBe("SPHL");
    expect(r.z80).toBe("ld SP, HL");
  })

  it("inc r16", () => {
    const buf = new Uint8Array([3, 0x13, 0x23, 0x33]);
    let pos = 0;
    const r0 = getInfo(buf, pos++);
    const r1 = getInfo(buf, pos++);
    const r2 = getInfo(buf, pos++);
    const r3 = getInfo(buf, pos++);

    expect(r0.code).toBe("inc r16");
    expect(r0.I80).toBe("INX B");
    expect(r0.z80).toBe("inc BC");

    expect(r1.i80).toBe("inx D");
    expect(r1.z80).toBe("inc DE");

    expect(r2.i80).toBe("inx H");
    expect(r2.z80).toBe("inc HL");

    expect(r3.i80).toBe("inx SP");
    expect(r3.z80).toBe("inc SP");
  });

  it("inc r8", () => {
    const buf = new Uint8Array([0x04, 0x0C, 0x14, 0x1C, 0x24, 0x2C, 0x34, 0x3C]);
    let pos = 0;
    let r = getInfo(buf, pos++);
    expect(r.code).toBe("inc r8");
    expect(r.params).toEqual([0]);
    expect(r.I80).toBe("INR B");
    expect(r.z80).toBe("inc B");

    r = getInfo(buf, pos++);
    expect(r.i80).toBe("inr C");
    expect(r.z80).toBe("inc C");

    r = getInfo(buf, pos++);
    expect(r.I80).toBe("INR D");
    expect(r.z80).toBe("inc D");

    r = getInfo(buf, pos++);
    expect(r.i80).toBe("inr E");
    expect(r.z80).toBe("inc E");

    r = getInfo(buf, pos++);
    expect(r.i80).toBe("inr H");
    expect(r.z80).toBe("inc H");

    r = getInfo(buf, pos++);
    expect(r.i80).toBe("inr L");
    expect(r.z80).toBe("inc L");

    r = getInfo(buf, pos++);
    expect(r.i80).toBe("inr M");
    expect(r.I80).toBe("INR M");
    expect(r.z80).toBe("inc (HL)");

    r = getInfo(buf, pos++);
    expect(r.i80).toBe("inr A");
    expect(r.I80).toBe("INR A");
    expect(r.z80).toBe("inc A");
  })

  it("dec r8", () => {
    const buf = new Uint8Array([0x05, 0x0D, 0x15, 0x1D, 0x25, 0x2D, 0x35, 0x3D]);
    let pos = 0;
    let r = getInfo(buf, pos++);
    expect(r.code).toBe("dec r8");
    expect(r.params).toEqual([0]);
    expect(r.I80).toBe("DCR B");
    expect(r.z80).toBe("dec B");

    r = getInfo(buf, pos++);
    expect(r.i80).toBe("dcr C");
    expect(r.z80).toBe("dec C");

    r = getInfo(buf, pos++);
    expect(r.I80).toBe("DCR D");
    expect(r.z80).toBe("dec D");

    r = getInfo(buf, pos++);
    expect(r.i80).toBe("dcr E");
    expect(r.z80).toBe("dec E");

    r = getInfo(buf, pos++);
    expect(r.i80).toBe("dcr H");
    expect(r.z80).toBe("dec H");

    r = getInfo(buf, pos++);
    expect(r.i80).toBe("dcr L");
    expect(r.z80).toBe("dec L");

    r = getInfo(buf, pos++);
    expect(r.i80).toBe("dcr M");
    expect(r.I80).toBe("DCR M");
    expect(r.z80).toBe("dec (HL)");

    r = getInfo(buf, pos++);
    expect(r.i80).toBe("dcr A");
    expect(r.I80).toBe("DCR A");
    expect(r.z80).toBe("dec A");
  });

  it("mov r8,i8", () => {
    const buf = new Uint8Array([0x06, 1, 0x0E, 0xFF, 0x16, 0xAB, 0x1E, 0, 0x26, 0x11, 0x2E, 0x80, 
      0x36, 0xAA, // mvi M, 0AAh
      0x3E, 0x7f, // mvi A, 7Fh
    ]);
    let pos = 0;
    let r = getInfo(buf, pos);
    expect(r.code).toBe("mov r8,i8");
    expect(r.params).toEqual([0, 1]);
    expect(r.I80).toBe("MVI B, 01H");
    expect(r.z80).toBe("ld B, $01");

    pos += r.cmd!.length;
    expect(pos).toBe(2);
    r = getInfo(buf, pos);
    expect(r.params).toEqual([1, 255]);
    expect(r.i80).toBe("mvi C, 0FFH");
    expect(r.z80).toBe("ld C, $FF");

    pos += r.cmd!.length;
    r = getInfo(buf, pos);
    expect(r.I80).toBe("MVI D, 0ABH");
    expect(r.z80).toBe("ld D, $AB");

    pos += r.cmd!.length;
    r = getInfo(buf, pos);
    expect(r.i80).toBe("mvi E, 00H");
    expect(r.z80).toBe("ld E, $00");

    pos += r.cmd!.length;
    r = getInfo(buf, pos);
    expect(r.i80).toBe("mvi H, 11H");
    expect(r.z80).toBe("ld H, $11");

    pos += r.cmd!.length;
    r = getInfo(buf, pos);
    expect(r.i80).toBe("mvi L, 80H");
    expect(r.z80).toBe("ld L, $80");

    pos += r.cmd!.length;
    r = getInfo(buf, pos);
    expect(r.i80).toBe("mvi M, 0AAH");
    expect(r.z80).toBe("ld (HL), $AA");

    pos += r.cmd!.length;
    r = getInfo(buf, pos);
    expect(r.i80).toBe("mvi A, 7FH");
    expect(r.z80).toBe("ld A, $7F");
  });

  it("rlc", () => {
    const r = singleByteOp(7);
    expect(r.code).toBe("rlc");
    expect(r.cmd?.length).toBe(1);
    expect(r.params).toBeUndefined();
    expect(r.I80).toBe("RLC");
    expect(r.i80).toBe("rlc");
    expect(r.z80).toBe("rlca");
  })

  it("rrc", () => {
    const r = singleByteOp(0x0F);
    expect(r.code).toBe("rrc");
    expect(r.cmd?.length).toBe(1);
    expect(r.params).toBeUndefined();
    expect(r.I80).toBe("RRC");
    expect(r.i80).toBe("rrc");
    expect(r.z80).toBe("rrca");
  })

  it("ral", () => {
    const r = singleByteOp(0x17);
    expect(r.code).toBe("ral");
    expect(r.cmd?.length).toBe(1);
    expect(r.params).toBeUndefined();
    expect(r.I80).toBe("RAL");
    expect(r.i80).toBe("ral");
    expect(r.z80).toBe("rla");
  })
  it("rar", () => {
    const r = singleByteOp(0x1F);
    expect(r.code).toBe("rar");
    expect(r.cmd?.length).toBe(1);
    expect(r.params).toBeUndefined();
    expect(r.I80).toBe("RAR");
    expect(r.i80).toBe("rar");
    expect(r.z80).toBe("rra");
  })
  it("daa", () => {
    const r = getInfo(new Uint8Array([0x27]), 0);
    expect(r.code).toBe("daa");
    expect(r.cmd?.length).toBe(1);
    expect(r.params).toBeUndefined();
    expect(r.I80).toBe("DAA");
    expect(r.i80).toBe("daa");
    expect(r.z80).toBe("daa");
  })

  it("add HL,r16", () => {
    const buf = new Uint8Array([
      0x09, 0x19, // dad B, dad D
      0x29, 0x39, // dad H, dad SP
    ]);
    let pos = 0;
    let r = getInfo(buf, pos++);
    expect(r.code).toBe("add HL,r16");
    expect(r.cmd?.length).toBe(1);
    expect(r.params).toEqual([0]);
    expect(r.I80).toBe("DAD B");
    expect(r.z80).toBe("add HL, BC");

    r = getInfo(buf, pos++);
    expect(r.params).toEqual([1]);
    expect(r.i80).toBe("dad D");
    expect(r.z80).toBe("add HL, DE");

    r = getInfo(buf, pos++);
    expect(r.i80).toBe("dad H");
    expect(r.z80).toBe("add HL, HL");

    r = getInfo(buf, pos++);
    expect(r.i80).toBe("dad SP");
    expect(r.z80).toBe("add HL, SP");
  });

  it("mov A,[r16]", () => {
    const buf = new Uint8Array([0x0A, 0x1A]);
    let r = getInfo(buf, 0);
    expect(r.code).toBe("mov A,[r16]");
    expect(r.I80).toBe("LDAX B");
    expect(r.z80).toBe("ld A, (BC)");

    r = getInfo(buf, 1);
    expect(r.i80).toBe("ldax D");
    expect(r.z80).toBe("ld A, (DE)");
  });

  it("dec r16", () => {
    const buf = new Uint8Array([0x0B, 0x1B, 0x2B, 0x3B]);
    let pos = 0;
    let r = getInfo(buf, pos++);
    expect(r.code).toBe("dec r16");
    expect(r.I80).toBe("DCX B");
    expect(r.z80).toBe("dec BC");

    r = getInfo(buf, pos++);
    expect(r.i80).toBe("dcx D");
    expect(r.z80).toBe("dec DE");
    r = getInfo(buf, pos++);
    expect(r.I80).toBe("DCX H");
    expect(r.z80).toBe("dec HL");
    r = getInfo(buf, pos++);
    expect(r.i80).toBe("dcx SP");
    expect(r.z80).toBe("dec SP");
  });

  it("mov [i16],HL", () => {
    const buf = new Uint8Array([0x22, 0x34, 0x12]);
    const r = getInfo(buf, 0);
    expect(r.code).toBe("mov [i16],HL");
    expect(r.params).toEqual([0x1234]);
    expect(r.cmd?.length).toBe(3);
    expect(r.I80).toBe("SHLD 1234H");
    expect(r.i80).toBe("shld 1234H");
    expect(r.z80).toBe("ld ($1234), HL");
  })

  it("mov HL,[i16]", () => {
    const buf = new Uint8Array([0x2A, 0x00, 0xB8]);
    const r = getInfo(buf, 0);
    expect(r.code).toBe("mov HL,[i16]");
    expect(r.params).toEqual([0xB800]);
    expect(r.cmd?.length).toBe(3);
    expect(r.I80).toBe("LHLD 0B800H");
    expect(r.i80).toBe("lhld 0B800H");
    expect(r.z80).toBe("ld HL, ($B800)");
  })

  it("not A", () => {
    const r = getInfo(new Uint8Array([0x2F]), 0);
    expect(r.code).toBe("not A");
    expect(r.cmd?.length).toBe(1);
    expect(r.params).toBeUndefined();
    expect(r.I80).toBe("CMA");
    expect(r.i80).toBe("cma");
    expect(r.z80).toBe("cpl");
  })

  it("mov [i16],A", () => {
    const r = getInfo(new Uint8Array([0x32, 0xfe, 0xff]), 0);
    expect(r.code).toBe("mov [i16],A");
    expect(r.cmd?.length).toBe(3);
    expect(r.params).toEqual([0xfffe]);
    expect(r.I80).toBe("STA 0FFFEH");
    expect(r.i80).toBe("sta 0FFFEH");
    expect(r.z80).toBe("ld ($FFFE), A");
  })
  it("mov A,[i16]", () => {
    const r = getInfo(new Uint8Array([0x3A, 4, 0]), 0);
    expect(r.code).toBe("mov A,[i16]");
    expect(r.cmd?.length).toBe(3);
    expect(r.params).toEqual([4]);
    expect(r.I80).toBe("LDA 0004H");
    expect(r.i80).toBe("lda 0004H");
    expect(r.z80).toBe("ld A, ($0004)");
  })

  it("stc", () => {
    const r = getInfo(new Uint8Array([0x37]), 0);
    expect(r.code).toBe("stc");
    expect(r.cmd?.length).toBe(1);
    expect(r.params).toBeUndefined();
    expect(r.I80).toBe("STC");
    expect(r.i80).toBe("stc");
    expect(r.z80).toBe("scf");
  })
  it("cmc", () => {
    const r = getInfo(new Uint8Array([0x3F]), 0);
    expect(r.code).toBe("cmc");
    expect(r.cmd?.length).toBe(1);
    expect(r.params).toBeUndefined();
    expect(r.I80).toBe("CMC");
    expect(r.i80).toBe("cmc");
    expect(r.z80).toBe("ccf");
  })
  it("hlt", () => {
    const r = getInfo(new Uint8Array([0x76]), 0);
    expect(r.code).toBe("hlt");
    expect(r.cmd?.length).toBe(1);
    expect(r.params).toBeUndefined();
    expect(r.I80).toBe("HLT");
    expect(r.i80).toBe("hlt");
    expect(r.z80).toBe("halt");
  })
  it("di", () => {
    const r = singleByteOp(0xF3);
    expect(r.code).toBe("di");
    expect(r.cmd?.length).toBe(1);
    expect(r.params).toBeUndefined();
    expect(r.I80).toBe("DI");
    expect(r.i80).toBe("di");
    expect(r.z80).toBe("di");
  })
  it("ei", () => {
    const r = singleByteOp(0xFB);
    expect(r.code).toBe("ei");
    expect(r.cmd?.length).toBe(1);
    expect(r.params).toBeUndefined();
    expect(r.I80).toBe("EI");
    expect(r.i80).toBe("ei");
    expect(r.z80).toBe("ei");
  })

  it("xchg [SP],HL", () => {
    const r = singleByteOp(0xE3);
    expect(r.code).toBe("xchg [SP],HL");
    expect(r.cmd?.length).toBe(1);
    expect(r.params).toBeUndefined();
    expect(r.I80).toBe("XTHL");
    expect(r.i80).toBe("xthl");
    expect(r.z80).toBe("ex (SP), HL");
  })
  it("xchg DE,HL", () => {
    const r = singleByteOp(0xEB);
    expect(r.code).toBe("xchg DE,HL");
    expect(r.cmd?.length).toBe(1);
    expect(r.params).toBeUndefined();
    expect(r.I80).toBe("XCHG");
    expect(r.i80).toBe("xchg");
    expect(r.z80).toBe("ex DE, HL");
  })

  it("out [i8]", () => {
    const r = twoByteOp(0xD3, 0xAA);
    expect(r.cmd?.length).toBe(2);
    expect(r.params).toEqual([0xAA]);
    expect(r.I80).toBe("OUT 0AAH");
    expect(r.i80).toBe("out 0AAH");
    expect(r.z80).toBe("out ($AA), A");
  })
  it("in [i8]", () => {
    const r = twoByteOp(0xDB, 0xAA);
    expect(r.cmd?.length).toBe(2);
    expect(r.params).toEqual([0xAA]);
    expect(r.I80).toBe("IN 0AAH");
    expect(r.i80).toBe("in 0AAH");
    expect(r.z80).toBe("in A, ($AA)");
  })

  it("ret", () => {
    const r = singleByteOp(0xC9);
    expect(r.code).toBe("ret");
    expect(r.cmd?.length).toBe(1);
    expect(r.I80).toBe("RET");
    expect(r.i80).toBe("ret");
    expect(r.z80).toBe("ret");
  })

  it("ret-con", () => {
    let r = singleByteOp(0xC0);
    expect(r.code).toBe("ret-con");
    expect(r.cmd?.length).toBe(1);
    expect(r.I80).toBe("RNZ");
    expect(r.i80).toBe("rnz");
    expect(r.z80).toBe("ret nz");
    r = singleByteOp(0xC8);
    expect(r.i80).toBe("rz");
    expect(r.z80).toBe("ret z");
    r = singleByteOp(0xD0);
    expect(r.I80).toBe("RNC");
    expect(r.z80).toBe("ret nc");
    r = singleByteOp(0xD8);
    expect(r.i80).toBe("rc");
    expect(r.z80).toBe("ret c");
    r = singleByteOp(0xE0);
    expect(r.i80).toBe("rpo");
    expect(r.z80).toBe("ret po");
    r = singleByteOp(0xE8);
    expect(r.i80).toBe("rpe");
    expect(r.z80).toBe("ret pe");
    r = singleByteOp(0xF0);
    expect(r.I80).toBe("RP");
    expect(r.z80).toBe("ret p");
    r = singleByteOp(0xF8);
    expect(r.i80).toBe("rm");
    expect(r.z80).toBe("ret m");
  });
  it("jmp i16", () => {
    let r = threeByteOp(0xC3, 0xABCD);
    expect(r.code).toBe("jmp i16");
    expect(r.params).toEqual([0xABCD]);
    expect(r.cmd?.length).toBe(3);
    expect(r.I80).toBe("JMP 0ABCDH");
    expect(r.i80).toBe("jmp 0ABCDH");
    expect(r.z80).toBe("jp $ABCD");
  });
  it("jmp [HL]", () => {
    const r = singleByteOp(0xE9);
    expect(r.code).toBe("jmp [HL]");
    expect(r.cmd?.length).toBe(1);
    expect(r.I80).toBe("PCHL");
    expect(r.i80).toBe("pchl");
    expect(r.z80).toBe("jp (HL)");
  })
  it("jmp-con i16", () => {
    let r = threeByteOp(0xC2, 0xABCD);
    expect(r.code).toBe("jmp-con i16");
    expect(r.cmd?.length).toBe(3);
    expect(r.I80).toBe("JNZ 0ABCDH");
    expect(r.i80).toBe("jnz 0ABCDH");
    expect(r.z80).toBe("jp nz, $ABCD");
    r = threeByteOp(0xCA, 0xF000); // 1100 1010 => 11(001)010
    expect(r.params).toEqual([1, 0xF000]);
    expect(r.i80).toBe("jz 0F000H");
    expect(r.z80).toBe("jp z, $F000");
    r = threeByteOp(0xD2, 0);
    expect(r.I80).toBe("JNC 0000H");
    expect(r.z80).toBe("jp nc, $0000");
    r = threeByteOp(0xDA, 0x2222);
    expect(r.i80).toBe("jc 2222H");
    expect(r.z80).toBe("jp c, $2222");
    r = threeByteOp(0xE2, 0x7FFF);
    expect(r.i80).toBe("jpo 7FFFH");
    expect(r.z80).toBe("jp po, $7FFF");
    r = threeByteOp(0xEA, 0x10);
    expect(r.i80).toBe("jpe 0010H");
    expect(r.z80).toBe("jp pe, $0010");
    r = threeByteOp(0xF2, 0x204);
    expect(r.I80).toBe("JP 0204H");
    expect(r.z80).toBe("jp p, $0204");
    r = threeByteOp(0xFA, 0x1234);
    expect(r.i80).toBe("jm 1234H");
    expect(r.z80).toBe("jp m, $1234");
  });
  it("call i16", () => {
    const r = threeByteOp(0xCD, 0x1EEE);
    expect(r.code).toBe("call i16");
    expect(r.cmd?.length).toBe(3);
    expect(r.I80).toBe("CALL 1EEEH");
    expect(r.i80).toBe("call 1EEEH");
    expect(r.z80).toBe("call $1EEE");
  })
  it("call-con i16", () => {
    let r = threeByteOp(0xC4, 0xABCD);
    expect(r.code).toBe("call-con i16");
    expect(r.cmd?.length).toBe(3);
    expect(r.I80).toBe("CNZ 0ABCDH");
    expect(r.i80).toBe("cnz 0ABCDH");
    expect(r.z80).toBe("call nz, $ABCD");
    r = threeByteOp(0xCC, 0xF000);
    expect(r.params).toEqual([1, 0xF000]);
    expect(r.i80).toBe("cz 0F000H");
    expect(r.z80).toBe("call z, $F000");
    r = threeByteOp(0xD4, 0);
    expect(r.I80).toBe("CNC 0000H");
    expect(r.z80).toBe("call nc, $0000");
    r = threeByteOp(0xDC, 0x2222);
    expect(r.i80).toBe("cc 2222H");
    expect(r.z80).toBe("call c, $2222");
    r = threeByteOp(0xE4, 0x7FFF);
    expect(r.i80).toBe("cpo 7FFFH");
    expect(r.z80).toBe("call po, $7FFF");
    r = threeByteOp(0xEC, 0x10);
    expect(r.i80).toBe("cpe 0010H");
    expect(r.z80).toBe("call pe, $0010");
    r = threeByteOp(0xF4, 0x204);
    expect(r.I80).toBe("CP 0204H");
    expect(r.z80).toBe("call p, $0204");
    r = threeByteOp(0xFC, 0x1234);
    expect(r.i80).toBe("cm 1234H");
    expect(r.z80).toBe("call m, $1234");
  });

  it("rst i3", () => {
    let r = singleByteOp(0xC7);
    expect(r.code).toBe("rst i3");
    expect(r.cmd?.length).toBe(1);
    expect(r.I80).toBe("RST 0");
    expect(r.i80).toBe("rst 0");
    expect(r.z80).toBe("rst 0");
    r = singleByteOp(0xCF);
    expect(r.i80).toBe("rst 1");
    expect(r.z80).toBe("rst 1");
    r = singleByteOp(0xD7);
    expect(r.I80).toBe("RST 2");
    expect(r.z80).toBe("rst 2");
    r = singleByteOp(0xDF);
    expect(r.i80).toBe("rst 3");
    expect(r.z80).toBe("rst 3");
    r = singleByteOp(0xE7);
    expect(r.i80).toBe("rst 4");
    expect(r.z80).toBe("rst 4");
    r = singleByteOp(0xEF);
    expect(r.i80).toBe("rst 5");
    expect(r.z80).toBe("rst 5");
    r = singleByteOp(0xF7);
    expect(r.I80).toBe("RST 6");
    expect(r.z80).toBe("rst 6");
    r = singleByteOp(0xFF);
    expect(r.i80).toBe("rst 7");
    expect(r.z80).toBe("rst 7");
  });

  it("pop r16s", () => {
    let r = singleByteOp(0xC1);
    expect(r.code).toBe("pop r16s");
    expect(r.cmd?.length).toBe(1);
    expect(r.I80).toBe("POP B");
    expect(r.i80).toBe("pop B");
    expect(r.z80).toBe("pop BC");
    r = singleByteOp(0xD1);
    expect(r.i80).toBe("pop D");
    expect(r.z80).toBe("pop DE");
    r = singleByteOp(0xE1);
    expect(r.I80).toBe("POP H");
    expect(r.z80).toBe("pop HL");
    r = singleByteOp(0xF1);
    expect(r.i80).toBe("pop PSW");
    expect(r.z80).toBe("pop AF");
  })
  it("push r16s", () => {
    let r = singleByteOp(0xC5);
    expect(r.code).toBe("push r16s");
    expect(r.cmd?.length).toBe(1);
    expect(r.I80).toBe("PUSH B");
    expect(r.i80).toBe("push B");
    expect(r.z80).toBe("push BC");
    r = singleByteOp(0xD5);
    expect(r.i80).toBe("push D");
    expect(r.z80).toBe("push DE");
    r = singleByteOp(0xE5);
    expect(r.I80).toBe("PUSH H");
    expect(r.z80).toBe("push HL");
    r = singleByteOp(0xF5);
    expect(r.i80).toBe("push PSW");
    expect(r.z80).toBe("push AF");
  })

  it("add r8", () => {
    const buf = new Uint8Array([0x80, 0x81, 0x82, 0x83, 0x84, 0x85, 0x86, 0x87]);
    let pos = 0;
    const next = () => getInfo(buf, pos++);
    let r = next();
    expect(r.code).toBe("add r8");
    expect(r.cmd?.length).toBe(1);
    expect(r.i80).toBe("add B");
    expect(r.z80).toBe("add A, B");
    r = next();
    expect(r.I80).toBe("ADD C");
    expect(r.z80).toBe("add A, C");
    r = next();
    expect(r.i80).toBe("add D");
    expect(r.z80).toBe("add A, D");
    r = next();
    expect(r.I80).toBe("ADD E");
    expect(r.z80).toBe("add A, E");
    r = next();
    expect(r.i80).toBe("add H");
    expect(r.z80).toBe("add A, H");
    r = next();
    expect(r.I80).toBe("ADD L");
    expect(r.z80).toBe("add A, L");    
    r = next();
    expect(r.i80).toBe("add M");
    expect(r.z80).toBe("add A, (HL)");
    r = next();
    expect(r.I80).toBe("ADD A");
    expect(r.z80).toBe("add A, A");
  })
  it("add i8", () => {
    let r = twoByteOp(0xC6, 0x88);
    expect(r.code).toBe("add i8");
    expect(r.cmd?.length).toBe(2);
    expect(r.params).toEqual([0x88]);
    expect(r.I80).toBe("ADI 88H");
    expect(r.i80).toBe("adi 88H");
    expect(r.z80).toBe("add A, $88");
  }) 

  it("adc r8", () => {
    const buf = new Uint8Array([0x88, 0x89, 0x8A, 0x8B, 0x8C, 0x8D, 0x8E, 0x8F]);
    let pos = 0;
    const next = () => getInfo(buf, pos++);
    let r = next();
    expect(r.code).toBe("adc r8");
    expect(r.cmd?.length).toBe(1);
    expect(r.i80).toBe("adc B");
    expect(r.z80).toBe("adc A, B");
    r = next();
    expect(r.I80).toBe("ADC C");
    expect(r.z80).toBe("adc A, C");
    r = next();
    expect(r.i80).toBe("adc D");
    expect(r.z80).toBe("adc A, D");
    r = next();
    expect(r.I80).toBe("ADC E");
    expect(r.z80).toBe("adc A, E");
    r = next();
    expect(r.i80).toBe("adc H");
    expect(r.z80).toBe("adc A, H");
    r = next();
    expect(r.I80).toBe("ADC L");
    expect(r.z80).toBe("adc A, L");    
    r = next();
    expect(r.i80).toBe("adc M");
    expect(r.z80).toBe("adc A, (HL)");
    r = next();
    expect(r.I80).toBe("ADC A");
    expect(r.z80).toBe("adc A, A");
  })
  it("adc i8", () => {
    let r = twoByteOp(0xCE, 0x88);
    expect(r.code).toBe("adc i8");
    expect(r.cmd?.length).toBe(2);
    expect(r.params).toEqual([0x88]);
    expect(r.I80).toBe("ACI 88H");
    expect(r.i80).toBe("aci 88H");
    expect(r.z80).toBe("adc A, $88");
  }) 

  it("sub r8", () => {
    const buf = new Uint8Array([0x90, 0x91, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97]);
    let pos = 0;
    const next = () => getInfo(buf, pos++);
    let r = next();
    expect(r.code).toBe("sub r8");
    expect(r.cmd?.length).toBe(1);
    expect(r.i80).toBe("sub B");
    expect(r.z80).toBe("sub B");
    r = next();
    expect(r.I80).toBe("SUB C");
    expect(r.z80).toBe("sub C");
    r = next();
    expect(r.i80).toBe("sub D");
    expect(r.z80).toBe("sub D");
    r = next();
    expect(r.I80).toBe("SUB E");
    expect(r.z80).toBe("sub E");
    r = next();
    expect(r.i80).toBe("sub H");
    expect(r.z80).toBe("sub H");
    r = next();
    expect(r.I80).toBe("SUB L");
    expect(r.z80).toBe("sub L");    
    r = next();
    expect(r.i80).toBe("sub M");
    expect(r.z80).toBe("sub (HL)");
    r = next();
    expect(r.I80).toBe("SUB A");
    expect(r.z80).toBe("sub A");
  })
  it("sub i8", () => {
    let r = twoByteOp(0xD6, 0xFF);
    expect(r.code).toBe("sub i8");
    expect(r.cmd?.length).toBe(2);
    expect(r.params).toEqual([0xFF]);
    expect(r.I80).toBe("SUI 0FFH");
    expect(r.i80).toBe("sui 0FFH");
    expect(r.z80).toBe("sub $FF");
  }) 

  it("sbb r8", () => {
    const buf = new Uint8Array([0x98, 0x99, 0x9A, 0x9B, 0x9C, 0x9D, 0x9E, 0x9F]);
    let pos = 0;
    const next = () => getInfo(buf, pos++);
    let r = next();
    expect(r.code).toBe("sbb r8");
    expect(r.cmd?.length).toBe(1);
    expect(r.i80).toBe("sbb B");
    expect(r.z80).toBe("sbc A, B");
    r = next();
    expect(r.I80).toBe("SBB C");
    expect(r.z80).toBe("sbc A, C");
    r = next();
    expect(r.i80).toBe("sbb D");
    expect(r.z80).toBe("sbc A, D");
    r = next();
    expect(r.I80).toBe("SBB E");
    expect(r.z80).toBe("sbc A, E");
    r = next();
    expect(r.i80).toBe("sbb H");
    expect(r.z80).toBe("sbc A, H");
    r = next();
    expect(r.I80).toBe("SBB L");
    expect(r.z80).toBe("sbc A, L");    
    r = next();
    expect(r.i80).toBe("sbb M");
    expect(r.z80).toBe("sbc A, (HL)");
    r = next();
    expect(r.I80).toBe("SBB A");
    expect(r.z80).toBe("sbc A, A");
  })
  it("sbb i8", () => {
    let r = twoByteOp(0xDE, 0xFF);
    expect(r.code).toBe("sbb i8");
    expect(r.cmd?.length).toBe(2);
    expect(r.params).toEqual([0xFF]);
    expect(r.I80).toBe("SBI 0FFH");
    expect(r.i80).toBe("sbi 0FFH");
    expect(r.z80).toBe("sbc A, $FF");
  }) 

  it("and r8", () => {
    const buf = new Uint8Array([0xA0, 0xA1, 0xA2, 0xA3, 0xA4, 0xA5, 0xA6, 0xA7]);
    let pos = 0;
    const next = () => getInfo(buf, pos++);
    let r = next();
    expect(r.code).toBe("and r8");
    expect(r.cmd?.length).toBe(1);
    expect(r.i80).toBe("ana B");
    expect(r.z80).toBe("and B");
    r = next();
    expect(r.I80).toBe("ANA C");
    expect(r.z80).toBe("and C");
    r = next();
    expect(r.i80).toBe("ana D");
    expect(r.z80).toBe("and D");
    r = next();
    expect(r.I80).toBe("ANA E");
    expect(r.z80).toBe("and E");
    r = next();
    expect(r.i80).toBe("ana H");
    expect(r.z80).toBe("and H");
    r = next();
    expect(r.I80).toBe("ANA L");
    expect(r.z80).toBe("and L");    
    r = next();
    expect(r.i80).toBe("ana M");
    expect(r.z80).toBe("and (HL)");
    r = next();
    expect(r.I80).toBe("ANA A");
    expect(r.z80).toBe("and A");
  })
  it("and i8", () => {
    let r = twoByteOp(0xE6, 0x5A);
    expect(r.code).toBe("and i8");
    expect(r.cmd?.length).toBe(2);
    expect(r.params).toEqual([0x5A]);
    expect(r.I80).toBe("ANI 5AH");
    expect(r.i80).toBe("ani 5AH");
    expect(r.z80).toBe("and $5A");
  }) 

  it("or r8", () => {
    const buf = new Uint8Array([0xB0, 0xB1, 0xB2, 0xB3, 0xB4, 0xB5, 0xB6, 0xB7]);
    let pos = 0;
    const next = () => getInfo(buf, pos++);
    let r = next();
    expect(r.code).toBe("or r8");
    expect(r.cmd?.length).toBe(1);
    expect(r.i80).toBe("ora B");
    expect(r.z80).toBe("or B");
    r = next();
    expect(r.I80).toBe("ORA C");
    expect(r.z80).toBe("or C");
    r = next();
    expect(r.i80).toBe("ora D");
    expect(r.z80).toBe("or D");
    r = next();
    expect(r.I80).toBe("ORA E");
    expect(r.z80).toBe("or E");
    r = next();
    expect(r.i80).toBe("ora H");
    expect(r.z80).toBe("or H");
    r = next();
    expect(r.I80).toBe("ORA L");
    expect(r.z80).toBe("or L");    
    r = next();
    expect(r.i80).toBe("ora M");
    expect(r.z80).toBe("or (HL)");
    r = next();
    expect(r.I80).toBe("ORA A");
    expect(r.z80).toBe("or A");
  })
  it("or i8", () => {
    let r = twoByteOp(0xF6, 0x0F);
    expect(r.code).toBe("or i8");
    expect(r.cmd?.length).toBe(2);
    expect(r.I80).toBe("ORI 0FH");
    expect(r.i80).toBe("ori 0FH");
    expect(r.z80).toBe("or $0F");
  }) 

  it("xor r8", () => {
    const buf = new Uint8Array([0xA8, 0xA9, 0xAA, 0xAB, 0xAC, 0xAD, 0xAE, 0xAF]);
    let pos = 0;
    const next = () => getInfo(buf, pos++);
    let r = next();
    expect(r.code).toBe("xor r8");
    expect(r.cmd?.length).toBe(1);
    expect(r.i80).toBe("xra B");
    expect(r.z80).toBe("xor B");
    r = next();
    expect(r.I80).toBe("XRA C");
    expect(r.z80).toBe("xor C");
    r = next();
    expect(r.i80).toBe("xra D");
    expect(r.z80).toBe("xor D");
    r = next();
    expect(r.I80).toBe("XRA E");
    expect(r.z80).toBe("xor E");
    r = next();
    expect(r.i80).toBe("xra H");
    expect(r.z80).toBe("xor H");
    r = next();
    expect(r.I80).toBe("XRA L");
    expect(r.z80).toBe("xor L");    
    r = next();
    expect(r.i80).toBe("xra M");
    expect(r.z80).toBe("xor (HL)");
    r = next();
    expect(r.I80).toBe("XRA A");
    expect(r.z80).toBe("xor A");
  })
  it("xor i8", () => {
    let r = twoByteOp(0xEE, 0x5A);
    expect(r.code).toBe("xor i8");
    expect(r.cmd?.length).toBe(2);
    expect(r.I80).toBe("XRI 5AH");
    expect(r.i80).toBe("xri 5AH");
    expect(r.z80).toBe("xor $5A");
  }) 

  it("cmp r8", () => {
    const buf = new Uint8Array([0xB8, 0xB9, 0xBA, 0xBB, 0xBC, 0xBD, 0xBE, 0xBF]);
    let pos = 0;
    const next = () => getInfo(buf, pos++);
    let r = next();
    expect(r.code).toBe("cmp r8");
    expect(r.cmd?.length).toBe(1);
    expect(r.i80).toBe("cmp B");
    expect(r.z80).toBe("cp B");
    r = next();
    expect(r.I80).toBe("CMP C");
    expect(r.z80).toBe("cp C");
    r = next();
    expect(r.i80).toBe("cmp D");
    expect(r.z80).toBe("cp D");
    r = next();
    expect(r.I80).toBe("CMP E");
    expect(r.z80).toBe("cp E");
    r = next();
    expect(r.i80).toBe("cmp H");
    expect(r.z80).toBe("cp H");
    r = next();
    expect(r.I80).toBe("CMP L");
    expect(r.z80).toBe("cp L");    
    r = next();
    expect(r.i80).toBe("cmp M");
    expect(r.z80).toBe("cp (HL)");
    r = next();
    expect(r.I80).toBe("CMP A");
    expect(r.z80).toBe("cp A");
  })
  it("cmp i8", () => {
    let r = twoByteOp(0xFE, 0x5A);
    expect(r.code).toBe("cmp i8");
    expect(r.cmd?.length).toBe(2);
    expect(r.I80).toBe("CPI 5AH");
    expect(r.i80).toBe("cpi 5AH");
    expect(r.z80).toBe("cp $5A");
  }) 

  it("mov r8,r8", () => {
    const buf = new Uint8Array([
      0x40, 0x41, 0x42, 0x43, 0x44, 0x45, 0x46, 0x47, // b <- b, c, d, e, h, l, m, a
      0x48, 0x49, 0x4A, 0x4B, 0x4C, 0x4D, 0x4E, 0x4F, // c <- b, c, d, e, h, l, m, a
      0x50, 0x51, 0x52, 0x53, 0x54, 0x55, 0x56, 0x57, // d <- b, c, d, e, h, l, m, a
      0x58, 0x59, 0x5A, 0x5B, 0x5C, 0x5D, 0x5E, 0x5F, // e <- b, c, d, e, h, l, m, a
      0x60, 0x61, 0x62, 0x63, 0x64, 0x65, 0x66, 0x67, // h <- b, c, d, e, h, l, m, a
      0x68, 0x69, 0x6A, 0x6B, 0x6C, 0x6D, 0x6E, 0x6F, // l <- b, c, d, e, h, l, m, a
      0x70, 0x71, 0x72, 0x73, 0x74, 0x75, 0x77, // m <- b, c, d, e, h, l, a
      0x78, 0x79, 0x7A, 0x7B, 0x7C, 0x7D, 0x7E, 0x7F, // a <- b, c, d, e, h, l, m, a
    ])
    let pos = 0;
    const next = () => getInfo(buf, pos++);
    let r = next();
    expect(r.code).toBe("mov r8,r8");
    expect(r.cmd?.length).toBe(1);
    expect(r.I80).toBe("MOV B, B");
    expect(r.i80).toBe("mov B, B");
    expect(r.z80).toBe("ld B, B");

    r = next();
    expect(r.i80).toBe("mov B, C");
    expect(r.z80).toBe("ld B, C");
    expect(next().i80).toBe("mov B, D");
    expect(next().z80).toBe("ld B, E");
    expect(next().I80).toBe("MOV B, H");
    expect(next().z80).toBe("ld B, L");
    r = next();
    expect(r.i80).toBe("mov B, M");
    expect(r.z80).toBe("ld B, (HL)");
    expect(next().z80).toBe("ld B, A");

    expect(next().i80).toBe("mov C, B");
    expect(next().z80).toBe("ld C, C");
    expect(next().I80).toBe("MOV C, D");
    expect(next().z80).toBe("ld C, E");
    expect(next().i80).toBe("mov C, H");
    expect(next().z80).toBe("ld C, L");
    expect(next().i80).toBe("mov C, M");
    pos--;
    expect(next().z80).toBe("ld C, (HL)");
    expect(next().z80).toBe("ld C, A");

    expect(next().i80).toBe("mov D, B");
    expect(next().z80).toBe("ld D, C");
    expect(next().I80).toBe("MOV D, D");
    expect(next().z80).toBe("ld D, E");
    expect(next().i80).toBe("mov D, H");
    expect(next().z80).toBe("ld D, L");
    expect(next().z80).toBe("ld D, (HL)");
    expect(next().i80).toBe("mov D, A");

    expect(next().i80).toBe("mov E, B");
    expect(next().z80).toBe("ld E, C");
    expect(next().I80).toBe("MOV E, D");
    expect(next().z80).toBe("ld E, E");
    expect(next().i80).toBe("mov E, H");
    expect(next().z80).toBe("ld E, L");
    expect(next().i80).toBe("mov E, M");
    expect(next().z80).toBe("ld E, A");

    expect(next().i80).toBe("mov H, B");
    expect(next().z80).toBe("ld H, C");
    expect(next().I80).toBe("MOV H, D");
    expect(next().z80).toBe("ld H, E");
    expect(next().i80).toBe("mov H, H");
    expect(next().z80).toBe("ld H, L");
    expect(next().z80).toBe("ld H, (HL)");
    expect(next().i80).toBe("mov H, A");

    expect(next().i80).toBe("mov L, B");
    expect(next().z80).toBe("ld L, C");
    expect(next().I80).toBe("MOV L, D");
    expect(next().z80).toBe("ld L, E");
    expect(next().i80).toBe("mov L, H");
    expect(next().z80).toBe("ld L, L");
    expect(next().i80).toBe("mov L, M");
    expect(next().z80).toBe("ld L, A");

    expect(next().i80).toBe("mov M, B");
    expect(next().z80).toBe("ld (HL), C");
    expect(next().I80).toBe("MOV M, D");
    expect(next().z80).toBe("ld (HL), E");
    expect(next().i80).toBe("mov M, H");   // <- эти команды вряд ди будут использоваться, но они есть
    expect(next().z80).toBe("ld (HL), L"); // <- 
    // а вот mov M, M - нет
    expect(next().i80).toBe("mov M, A");

    expect(next().i80).toBe("mov A, B");
    expect(next().z80).toBe("ld A, C");
    expect(next().I80).toBe("MOV A, D");
    expect(next().z80).toBe("ld A, E");
    expect(next().i80).toBe("mov A, H");
    expect(next().z80).toBe("ld A, L");
    expect(next().i80).toBe("mov A, M");
    expect(next().z80).toBe("ld A, A");
  })
})