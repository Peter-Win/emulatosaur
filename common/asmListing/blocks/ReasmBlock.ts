import { AsmLine } from "../AsmLine"

export type ReasmBlock = {
  begin: number;
  end: number;
  lines: AsmLine[];
  isData?: boolean;
}
// важно, что все линии находятся строго между begin и end, без промежутков

export const addLineToBlock = (block: ReasmBlock, line: AsmLine, cmdLength: number): void => {
  block.lines.push(line);
  block.end += cmdLength;
}