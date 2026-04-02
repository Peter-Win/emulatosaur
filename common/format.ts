export const hexByte = (b: number): string =>
  b.toString(16).toUpperCase().padStart(2, "0");

export const hexWord = (w: number): string =>
  w.toString(16).toUpperCase().padStart(4, "0");

export const hexDump = (buffer: Uint8Array, divider = "", count?: number, offset?: number): string => {
  let result = "";
  let pos = offset ?? 0;
  const end = Math.min(buffer.length, pos + (count ?? buffer.length));
  if (pos < end) {
    result += hexByte(buffer[pos++]!);
  }
  while (pos < end) {
    result += divider;
    result += hexByte(buffer[pos++]!);
  }
  return result;
}

export const rxHexWord = /^[\dA-F]{1,4}$/i;

export const parseHexWord = (value: string, errorMsg?: string): number => {
  if (!rxHexWord.test(value)) throw Error(errorMsg ?? `Invalid hex value: ${value}`);
  return Number.parseInt(value, 16);
}

export const testHexWord = (value: string): number | null =>
  rxHexWord.test(value) ? Number.parseInt(value, 16) : null;

