/**
 * Числовой код 16-разрядного регистра для команд типа lxi, stax, inx, dad,...
 * А так же подходит для стековых регистров н.р для pop PSW (pop AF)
 */
export const getReg16 = (buffer: Uint8Array, offset: number): number => (buffer[offset]! >> 4) & 3;

export const getSrcReg8 = (buffer: Uint8Array, offset: number): number => buffer[offset]! & 7;

// Либо 8-битный регистр назначения, либо условие
export const getDstReg8 = (buffer: Uint8Array, offset: number): number => (buffer[offset]! >> 3) & 7;

export const getWord = (buffer: Uint8Array, offset: number): number => buffer[offset]! + (buffer[offset+1]! << 8);
