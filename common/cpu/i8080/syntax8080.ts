export const syntax8080 = {
  opName: (name: string) => name,
  r8name: ["B", "C", "D", "E", "H", "L", "M", "A"],
  r16name: ["B", "D", "H", "SP"],
  r16sName: ["B", "D", "H", "PSW"],
  conName: ["nz", "z", "nc", "c", "po", "pe", "p", "m"],
  r8(r: number | string): string {
    return typeof r === "number" ? this.r8name[r]! : r;
  },
  r16(rr: number | string): string {
    return typeof rr === "number" ? this.r16name[rr]! : rr;
  },
  r16s(rr: number | string): string {
    return typeof rr === "number" ? this.r16sName[rr]! : rr;
  },
  hex(value: number, bytesCount: number): string {
    let h = value.toString(16).padStart(bytesCount*2, "0").toUpperCase();
    if (!(h[0]! >= "0" && h[0]! <= "9")) h = `0${h}`;
    return `${h}H`;
  },
  i16(nn: number | string): string {
    return typeof nn === "number" ? this.hex(nn, 2) : nn;
  },
  i8(n: number | string): string {
    return typeof n === "number" ? this.hex(n, 1) : n;
  },
  cmd1(op: string, param: string): string {
    return `${this.opName(op)} ${param}`
  },
  cmd2(op: string, p1: string, p2: string): string {
    return `${this.opName(op)} ${p1}, ${p2}`
  },

  // Некоторые команды могут отсутствовать. 
  // Н.р. nop. В таком случае они соответствуют своим символам
  // Для получения их кода нужно использовать opName(code)

  "mov r16,i16"(a: string | number, b: string | number) {
    return this.cmd2("lxi", this.r16(a), this.i16(b));
  },

  "mov [r16],A"(a: string | number) {
    return this.cmd1("stax", this.r16(a));
  },
  "mov SP,HL"() {
    return this.opName("sphl");
  },

  "inc r16"(a: string | number) {
    return this.cmd1("inx", this.r16(a));
  },
  "inc r8"(a: string | number) {
    return this.cmd1("inr", this.r8(a));
  },
  "dec r8"(a: string | number) {
    return this.cmd1("dcr", this.r8(a));
  },
  "dec r16"(a: string | number) {
    return this.cmd1("dcx", this.r16(a));
  },
  "mov r8,i8"(a: string | number, b: string | number) {
    return this.cmd2("mvi", this.r8(a), this.i8(b));
  },
  "rlc"() {
    return this.opName("rlc");
  },
  "rrc"() {
    return this.opName("rrc");
  },
  "add HL,r16"(a: string | number) {
    return this.cmd1("dad", this.r16(a));
  },
  "mov A,[r16]"(a: string | number) {
    return this.cmd1("ldax", this.r16(a));
  },
  "mov [i16],HL"(a: string | number) {
    return this.cmd1("shld", this.i16(a));
  },
  "mov HL,[i16]"(a: string | number) {
    return this.cmd1("lhld", this.i16(a));
  },
  "not A"() {
    return this.opName("cma");
  },
  "mov [i16],A"(a: string | number) {
    return this.cmd1("sta", this.i16(a));
  },
  "mov A,[i16]"(a: string | number) {
    return this.cmd1("lda", this.i16(a));
  },
  "mov r8,r8"(a: string | number, b: string | number) {
    return this.cmd2("mov", this.r8(a), this.r8(b));
  },
  "add r8"(a: string | number) {
    return this.cmd1("add", this.r8(a));
  },
  "add i8"(a: string | number) {
    return this.cmd1("adi", this.i8(a));
  },
  "adc r8"(a: string | number) {
    return this.cmd1("adc", this.r8(a));
  },
  "adc i8"(n: string | number) {
    return this.cmd1("aci", this.i8(n));
  },
  "sub r8"(a: string | number) {
    return this.cmd1("sub", this.r8(a));
  },
  "sub i8"(n: string | number) {
    return this.cmd1("sui", this.i8(n));
  },
  "sbb r8"(a: string | number) {
    return this.cmd1("sbb", this.r8(a));
  },
  "sbb i8"(n: string | number) {
    return this.cmd1("sbi", this.i8(n));
  },
  "and r8"(a: string | number) {
    return this.cmd1("ana", this.r8(a));
  },
  "and i8"(n: string | number) {
    return this.cmd1("ani", this.i8(n));
  },  
  "or r8"(a: string | number) {
    return this.cmd1("ora", this.r8(a));
  },
  "or i8"(n: string | number) {
    return this.cmd1("ori", this.i8(n));
  },
  "xor r8"(a: string | number) {
    return this.cmd1("xra", this.r8(a));
  },
  "xor i8"(n: string | number) {
    return this.cmd1("xri", this.i8(n));
  },
  "cmp r8"(a: string | number) {
    return this.cmd1("cmp", this.r8(a));
  },
  "cmp i8"(n: string | number) {
    return this.cmd1("cpi", this.i8(n));
  },
  condOp(opPrefix: string, conCode: number, addr?: number | string) {
    const name = `${opPrefix}${this.conName[conCode]}`;
    return addr === undefined ? this.opName(name) : this.cmd1(name, this.i16(addr));
  },
  "ret-con"(cc: number) {
    return this.condOp("r", cc);
  },
  "jmp-con i16"(cc: number, addr: number | string) {
    return this.condOp("j", cc, addr);
  },
  "jmp i16"(addr: number | string) {
    return this.cmd1("jmp", this.i16(addr));
  },
  "jmp [HL]"() {
    return this.opName("pchl");
  },
  "call i16"(addr: string | number) {
    return this.cmd1("call", this.i16(addr));
  },
  "call-con i16"(cc: number, addr: string | number) {
    return this.condOp("c", cc, addr);
  },
  "pop r16s"(a: string | number) {
    return this.cmd1("pop", this.r16s(a));
  },
  "push r16s"(a: string | number) {
    return this.cmd1("push", this.r16s(a));
  },
  "rst i3"(n: number) {
    return this.cmd1("rst", String(n))
  },
  "out [i8]"(n: string | number) {
    return this.cmd1("out", this.i8(n));
  },
  "in [i8]"(n: string | number) {
    return this.cmd1("in", this.i8(n));
  },
  "xchg [SP],HL"() {
    return this.opName("xthl");
  },
  "xchg DE,HL"() {
    return this.opName("xchg");
  },
}
export type Syntax8080 = typeof syntax8080;

type SyntaxOptions = {
  opUp?: boolean;
}

/**
 * Модифицированный синтакс
 * @param {object} settings Настройки
 * @param {boolean?} settings.opUp Названия команд в UpperCase
 */
export const syntax8080ext = (settings: SyntaxOptions): Syntax8080 => {
  const res = {...syntax8080};
  if (settings.opUp) {
    res.opName = (name) => name.toUpperCase();
  }
  return res;
}

