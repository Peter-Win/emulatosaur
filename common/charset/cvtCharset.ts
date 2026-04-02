export const cvtCharset = (offset: number, src: string): string[] => {
  const res: string[] = [];
  Array.from(src).forEach((char, i) => {
    res[i + offset] = char;
  });
  return res;
}