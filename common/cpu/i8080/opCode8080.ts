const c: (string | null)[] = [];
c[0x00] = "nop";
c[0x01] = "mov r16,i16";
c[0x02] = "mov [r16],A";
c[0x03] = "inc r16";
c[0x04] = "inc r8";
c[0x05] = "dec r8";
c[0x06] = "mov r8,i8";
c[0x07] = "rlc";
c[0x08] = null
c[0x09] = "add HL,r16";
c[0x0A] = "mov A,[r16]";
c[0x0B] = "dec r16";
c[0x0C] = "inc r8";
c[0x0D] = "dec r8";
c[0x0E] = "mov r8,i8";
c[0x0F] = "rrc";
// 10 - нет операции для 8080
c[0x10] = null
c[0x11] = "mov r16,i16";
c[0x12] = "mov [r16],A";
c[0x13] = "inc r16";
c[0x14] = "inc r8";
c[0x15] = "dec r8";
c[0x16] = "mov r8,i8";
c[0x17] = "ral";
// 18 - нет операции для 8080
c[0x18] = null
c[0x19] = "add HL,r16";
c[0x1A] = "mov A,[r16]";
c[0x1B] = "dec r16";
c[0x1C] = "inc r8";
c[0x1D] = "dec r8";
c[0x1E] = "mov r8,i8";
c[0x1F] = "rar";
// 20 - нет операции для 8080
c[0x20] = null
c[0x21] = "mov r16,i16";
c[0x22] = "mov [i16],HL";
c[0x23] = "inc r16";
c[0x24] = "inc r8";
c[0x25] = "dec r8";
c[0x26] = "mov r8,i8";
c[0x27] = "daa";
// 28 - нет операции для 8080
c[0x28] = null
c[0x29] = "add HL,r16";
c[0x2A] = "mov HL,[i16]";
c[0x2B] = "dec r16";
c[0x2C] = "inc r8";
c[0x2D] = "dec r8";
c[0x2E] = "mov r8,i8";
c[0x2F] = "not A";
// 30 - нет операции для 8080
c[0x30] = null
c[0x31] = "mov r16,i16";
c[0x32] = "mov [i16],A";
c[0x33] = "inc r16";
c[0x34] = "inc r8";
c[0x35] = "dec r8";
c[0x36] = "mov r8,i8";
c[0x37] = "stc";
// 38 - нет операции для 8080
c[0x38] = null
c[0x39] = "add HL,r16";
c[0x3A] = "mov A,[i16]";
c[0x3B] = "dec r16";
c[0x3C] = "inc r8";
c[0x3D] = "dec r8";
c[0x3E] = "mov r8,i8";
c[0x3F] = "cmc";
for (let code=0x40; code <= 0x7F; code++) if (code !== 0x76) c[code] = "mov r8,r8";
c[0x76] = "hlt";
for (let code=0x80; code <= 0x87; code++) c[code] = "add r8";
for (let code=0x88; code <= 0x8F; code++) c[code] = "adc r8";
for (let code=0x90; code <= 0x97; code++) c[code] = "sub r8";
for (let code=0x98; code <= 0x9F; code++) c[code] = "sbb r8";
for (let code=0xA0; code <= 0xA7; code++) c[code] = "and r8";
for (let code=0xA8; code <= 0xAF; code++) c[code] = "xor r8";
for (let code=0xB0; code <= 0xB7; code++) c[code] = "or r8";
for (let code=0xB8; code <= 0xBF; code++) c[code] = "cmp r8";
c[0xC0] = "ret-con";
c[0xC1] = "pop r16s";
c[0xC2] = "jmp-con i16";
c[0xC3] = "jmp i16";
c[0xC4] = "call-con i16";
c[0xC5] = "push r16s";
c[0xC6] = "add i8";
c[0xC7] = "rst i3";
c[0xC8] = "ret-con";
c[0xC9] = "ret";
c[0xCA] = "jmp-con i16";
// CB  - нет операции для 8080
c[0xCB] = null
c[0xCC] = "call-con i16";
c[0xCD] = "call i16";
c[0xCE] = "adc i8";
c[0xCF] = "rst i3";
c[0xD0] = "ret-con";
c[0xD1] = "pop r16s";
c[0xD2] = "jmp-con i16";
c[0xD3] = "out [i8]";
c[0xD4] = "call-con i16";
c[0xD5] = "push r16s";
c[0xD6] = "sub i8";
c[0xD7] = "rst i3";
c[0xD8] = "ret-con";
// D9  - нет операции для 8080
c[0xD9] = null
c[0xDA] = "jmp-con i16";
c[0xDB] = "in [i8]";
c[0xDC] = "call-con i16";
// DD  - нет операции для 8080
c[0xDD] = null
c[0xDE] = "sbb i8";
c[0xDF] = "rst i3";
c[0xE0] = "ret-con";
c[0xE1] = "pop r16s";
c[0xE2] = "jmp-con i16";
c[0xE3] = "xchg [SP],HL";
c[0xE4] = "call-con i16";
c[0xE5] = "push r16s";
c[0xE6] = "and i8";
c[0xE7] = "rst i3";
c[0xE8] = "ret-con";
c[0xE9] = "jmp [HL]";
c[0xEA] = "jmp-con i16";
c[0xEB] = "xchg DE,HL";
c[0xEC] = "call-con i16";
// ED  - нет операции для 8080
c[0xED] = null
c[0xEE] = "xor i8";
c[0xEF] = "rst i3";
c[0xF0] = "ret-con";
c[0xF1] = "pop r16s";
c[0xF2] = "jmp-con i16";
c[0xF3] = "di";
c[0xF4] = "call-con i16";
c[0xF5] = "push r16s";
c[0xF6] = "or i8";
c[0xF7] = "rst i3";
c[0xF8] = "ret-con";
c[0xF9] = "mov SP,HL";
c[0xFA] = "jmp-con i16";
c[0xFB] = "ei";
c[0xFC] = "call-con i16";
// FD  - нет операции для 8080
c[0xFD] = null
c[0xFE] = "cmp i8";
c[0xFF] = "rst i3";

export const opCode8080 = c;