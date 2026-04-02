import { AsmLine } from "common/asmListing/AsmLine";
import { Computer } from "common/Computer";
import { Proc8080 } from "common/cpu/i8080/Proc8080"
import { Syntax8080 } from "common/cpu/i8080/syntax8080";
import { ProcEmulator } from "common/cpu/ProcEmulator";
import { SyntaxZ80 } from "common/cpu/z80/syntaxZ80";
import { SrcMap, SyntaxId } from "common/SrcMap/SrcMap";

export type RichAsm80Store = {
  srcMap: SrcMap;
  comp: Computer;
  cpu: Proc8080;
  codeLines: AsmLine[];
  codeAddrMap: Record<number, number>; // addr => index of codeLines
  labelsMap: Record<string, number>; // label => index
  buildCodeLines(): Promise<void>;
  buildUnknownCode(addr: number): Promise<void>;

  syntaxId: SyntaxId;
  setSyntaxId(id: SyntaxId): void;
  readonly syntax: Syntax8080 | SyntaxZ80;

  // Для установки начала просмотра
  visibleCodeBegin: number | null;
  setVisibleCodeBegin(index: number | null): void;
  setVisibleCodeBeginByAddr(addr: number): void;

  emulator: ProcEmulator;
  readonly currentPC: number | null;

  readonly charset: string[] | undefined;
  readonly buzy: boolean;
}