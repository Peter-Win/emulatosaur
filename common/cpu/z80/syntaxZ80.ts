export const syntaxZ80 = {
  r8name: ["B", "C", "D", "E", "H", "L", "(HL)", "A"],
  r16name: ["BC", "DE", "HL", "SP"],
  r16sName: ["BC", "DE", "HL", "AF"],
  conName: ["nz", "z", "nc", "c", "po", "pe", "p", "m"],
  opName: (name: string) => name,
  cond(code: number) {
    return this.opName(this.conName[code]!);
  }, 
  r8(r: number | string): string {
    return typeof r === "number" ? this.r8name[r]! : r;
  },
  r16(rr: number | string): string {
    return typeof rr === "number" ? this.r16name[rr]! : rr;
  },
  r16s(rr: number | string): string {
    return typeof rr === "number" ? this.r16sName[rr]! : rr;
  },
  hex(value: number, bytesCount: number) {
    let h = value.toString(16).padStart(bytesCount*2, "0").toUpperCase();
    return `$${h}`;
  },
  i16(nn: number | string) {
    return typeof nn === "number" ? this.hex(nn, 2) : nn;
  },
  i8(n: number | string) {
    return typeof n === "number" ? this.hex(n, 1) : n;
  },
  cmd1(op: string, param: string) {
    return `${this.opName(op)} ${param}`
  },
  cmd2(op: string, p1: string, p2: string) {
    return `${this.opName(op)} ${p1}, ${p2}`
  },
  indirect(param: string) {
    return `(${param})`;
  },


  // Некоторые команды могут отсутствовать. Н.р. nop. В таком случае они соответствуют своим символам
  
  "mov r16,i16"(a: number | string, b: number | string) {
    return this.cmd2("ld", this.r16(a), this.i16(b));
  },
  "mov [r16],A"(a: number | string) {
    return this.cmd2("ld", this.indirect(this.r16(a)), this.r8("A"));
  },
  "mov SP,HL"() {
    return this.cmd2("ld", this.r16("SP"), this.r16("HL"));
  },
  "inc r16"(a: number | string) {
    return this.cmd1("inc", this.r16(a));
  },
  "inc r8"(a: number | string) {
    return this.cmd1("inc", this.r8(a));
  },
  "dec r8"(a: number | string) {
    return this.cmd1("dec", this.r8(a));
  },
  "dec r16"(a: number | string) {
    return this.cmd1("dec", this.r16(a));
  },
  "mov r8,i8"(a: number | string, b: number | string) {
    return this.cmd2("ld", this.r8(a), this.i8(b));
  },
  "rlc"() {
    return this.opName("rlca");
  },
  "rrc"() {
    return this.opName("rrca");
  },
  "ral"() {
    return this.opName("rla");
  },
  "rar"() {
    return this.opName("rra");
  },
  "add HL,r16"(a: number | string) {
    return this.cmd2("add", this.r16("HL"), this.r16(a));
  },
  "mov A,[r16]"(a: number | string) {
    return this.cmd2("ld", this.r8("A"), `(${this.r16(a)})`);
  },
  "mov [i16],HL"(a: number | string) {
    return this.cmd2("ld", this.indirect(this.i16(a)), this.r16("HL"));
  },
  "mov HL,[i16]"(a: number | string) {
    return this.cmd2("ld", this.r16("HL"), this.indirect(this.i16(a)));
  },
  "not A"() {
    return this.opName("cpl");
  },
  "mov [i16],A"(a: number | string) {
    return this.cmd2("ld", this.indirect(this.i16(a)), this.r8("A"));
  },
  "mov A,[i16]"(a: number | string) {
    return this.cmd2("ld", this.r8("A"), this.indirect(this.i16(a)));
  },
  stc() {
    return this.opName("scf");
  },
  cmc() {
    return this.opName("ccf");
  },
  "mov r8,r8"(a: number | string, b: number | string) {
    return this.cmd2("ld", this.r8(a), this.r8(b));
  },
  hlt() {
    return this.opName("halt");
  },
  "add r8"(a: number | string) {
    return this.cmd2("add", this.r8("A"), this.r8(a));
  },
  "add i8"(a: number | string) {
    return this.cmd2("add", this.r8("A"), this.i8(a));
  },
  "adc r8"(a: number | string) {
    return this.cmd2("adc", this.r8("A"), this.r8(a));
  },
  "adc i8"(n: number | string) {
    return this.cmd2("adc", this.r8("A"), this.i8(n));
  },
  // Это немного странно. Но в отличие от сложения (и даже от вычитания с переносом sbc), 
  // у вычитания указывается только один регистр
  // Проверено в нескольких источниках.
  "sub r8"(a: number | string) {
    return this.cmd1("sub", this.r8(a));
  },
  "sub i8"(n: number | string) {
    return this.cmd1("sub", this.i8(n));
  },
  // здесь два параметра
  "sbb r8"(a: number | string) {
    return this.cmd2("sbc", this.r8("A"), this.r8(a));
  },
  "sbb i8"(n: number | string) {
    return this.cmd2("sbc", this.r8("A"), this.i8(n));
  },
  // у всех трёх логических операций указывается один параметр, как у SUB
  "and r8"(a: number | string) {
    return this.cmd1("and", this.r8(a));
  },
  "and i8"(n: number | string) {
    return this.cmd1("and", this.i8(n));
  },
  "or r8"(a: number | string) {
    return this.cmd1("or", this.r8(a));
  },
  "or i8"(n: number | string) {
    return this.cmd1("or", this.i8(n));
  },
  "xor r8"(a: number | string) {
    return this.cmd1("xor", this.r8(a));
  },
  "xor i8"(n: number | string) {
    return this.cmd1("xor", this.i8(n));
  },
  "cmp r8"(a: number | string) {
    return this.cmd1("cp", this.r8(a));
  },
  "cmp i8"(n: number | string) {
    return this.cmd1("cp", this.i8(n));
  },
  "ret-con"(con: number) {
    return this.cmd1("ret", this.cond(con))
  },
  "jmp i16"(addr: number | string) {
    return this.cmd1("jp", this.i16(addr))
  },
  "jmp [HL]"() {
    return this.cmd1("jp", this.indirect(this.r16("HL")));
  },
  "jmp-con i16"(con: number, addr: number | string) {
    return this.cmd2("jp", this.cond(con), this.i16(addr));
  },
  "call i16"(addr: number | string) {
    return this.cmd1("call", this.i16(addr));
  },
  "call-con i16"(cc: number, addr: number | string) {
    return this.cmd2("call", this.cond(cc), this.i16(addr));
  },
  "pop r16s"(a: number | string) {
    return this.cmd1("pop", this.r16s(a));
  },
  "push r16s"(a: number | string) {
    return this.cmd1("push", this.r16s(a));
  },
  "rst i3"(n: number) {
    return this.cmd1("rst", String(n))
  },
  "out [i8]"(n: number | string) {
    return this.cmd2("out", this.indirect(this.i8(n)), this.r8("A"));
  },
  "in [i8]"(n: number | string) {
    return this.cmd2("in", this.r8("A"), this.indirect(this.i8(n)));
  },
  "xchg [SP],HL"() {
    return this.cmd2("ex", this.indirect(this.r16("SP")), this.r16("HL"));
  },
  "xchg DE,HL"() {
    return this.cmd2("ex", this.r16("DE"), this.r16("HL"));
  },
}

export type SyntaxZ80 = typeof syntaxZ80;