import { makeAutoObservable } from "mobx";
import { RichAsm80Store } from "./RichAsm80/RichAsm80Store";
import { Computer } from "common/Computer";
import { Proc8080 } from "common/cpu/i8080/Proc8080";
import { createSrcMap, SrcMap, SyntaxId } from "common/SrcMap/SrcMap";
import { AsmLine } from "common/asmListing/AsmLine";
import { buildBlocks, ParamsBuildBlocks, sortBlocks } from "common/asmListing/blocks/buildBlocks";
import { createProc80Emulator } from "common/cpu/i8080/createProc80Emulator";
import { ProcEmulator } from "common/cpu/ProcEmulator";
import { syntaxZ80 } from "common/cpu/z80/syntaxZ80";
import { syntax8080 } from "common/cpu/i8080/syntax8080";
import { CharsetName, charsets } from "common/charset";
import { Stack16Store } from "./Stack16View/Stack16Store";
import { AbsCmd } from "common/asmListing/blocks/AbsCmd";
import { Memory } from "common/memory/Memory";
import { ReasmBlock } from "common/asmListing/blocks/ReasmBlock";

export class Proc80Store 
implements RichAsm80Store, Stack16Store
{
  constructor(
    public comp: Computer,
    public cpu: Proc8080,
    public srcMap: SrcMap,
    public codeRange: [number, number],
  ) {
    this.emulator = createProc80Emulator(cpu, comp);
    if (srcMap.syntax === "zilog") {
      this.syntaxId = "zilog";
    }
    this.hInterval = setInterval(() => {
      const {emulator: {running}, cpu: {regs}} = this;
      this.setCurrentPC(running ? null : regs.getPC());
      this.setCurrentSP(running ? null : regs.getSP());
    }, 200);
    
    makeAutoObservable(this);
  }

  currentPC: number | null = null;
  setCurrentPC(value: number | null) {
    this.currentPC = value;
  }

  currentSP: number | null = null;
  setCurrentSP(value: number | null) {
    this.currentSP = value;
  }

  protected hInterval: ReturnType<typeof setInterval> | null = null;

  done() {
    if (this.hInterval) {
      clearInterval(this.hInterval);
      this.hInterval = null;
    }
  }

  emulator: ProcEmulator;

  get memory() {
    return this.comp.memory;
  }

  syntaxId: SyntaxId = "intel";
  setSyntaxId(id: SyntaxId): void {
    this.syntaxId = id;
  }
  get syntax() {
    return this.syntaxId === "zilog" ? syntaxZ80 : syntax8080;
  }

  // addr => index of codeLines
  get codeAddrMap(): Record<number, number> {
    const dict: Record<number, number> = {};
    this.codeLines.forEach(({addr}, index) => {
      if (typeof addr === "number") {
        dict[addr] = index;
      }
    });
    return dict;
  }
  // label => index, 
  get labelsMap(): Record<string, number> {
    const dict: Record<string, number> = {}
    Array.from(this.srcMap.addrMap.entries()).forEach(([addr, {label}]) => {
      if (label) {
        const index = this.codeAddrMap[addr];
        if (typeof index === "number") {
          dict[label] = index;
        }
      }
    })
    return dict;
  }

  visibleCodeBegin: number | null = null;
  setVisibleCodeBegin(addr: number | null) {
    this.visibleCodeBegin = addr;
  }
  setVisibleCodeBeginByAddr(addr: number): void {
    const index = this.codeAddrMap[addr];
    if (typeof index === "number") {
      this.setVisibleCodeBegin(Math.max(index - 1, 0));
    }
  }
  

  charsetName: CharsetName | null = null;
  setCharsetName(name: CharsetName | null) {
    this.charsetName = name;
  }
  get charset(): string[] | undefined {
    const {charsetName} = this;
    return charsetName ? charsets[charsetName] : undefined;
  }

  buzy = false;
  setBuzy(value: boolean) {
    this.buzy = value;
  }

  get codeLines(): AsmLine[] {
    return this.blocks.flatMap(({lines}) => lines);    
  }

  blocks: ReasmBlock[] = [];
  updateBlocks(newBlocks: ReasmBlock[]) {
    // TODO: пока без контроля перекрытия новых и существующих
    const result = [...this.blocks, ...newBlocks];
    sortBlocks(result);
    this.blocks = result;
  }


  protected async longTask(task: () => Promise<void>) {
    try {
      this.setBuzy(true);
      await task();
    } finally {
      this.setBuzy(false);
    }
  }

  // Если выполнен переход по адресу, который не попадает в существующие блоки
  async buildUnknownCode(addr: number) {
    await this.longTask(async () => {
      const tmpBuf = new Uint8Array(3);
      const {comp, cpu} = this;
      const {memory} = comp;
      // const addr = cpu.regs.getPC();
      const srcMap = createSrcMap(addr);
      // Поиск ближайшего блока. Не оптимально, но для начала сойдёт
      let end = 0x10000;
      for (let {begin} of this.blocks) {
        if (begin > addr) {
          end = Math.min(begin, end);
        }
      }

      const blocks = await buildBlocks({
        srcMap,
        getCodeEntries: () => [addr],
        getInitialBlocks: () => [],
        workTime: 40,
        waitTime: 10,
        timestamp: () => window.performance.now(),
        getCommand: (addr: number) => makeCommand({ addr, cpu, memory, srcMap, tmpBuf }),
        end,
      });
      this.updateBlocks(blocks);      
    })
  }

  async buildCodeLines() {
    await this.longTask(async () => {
      const tmpBuf = new Uint8Array(3);
      const {srcMap, comp, cpu, codeRange} = this;
      const {memory} = comp;
      const codeEntries: number[] = [];
      Array.from(srcMap.addrMap.entries()).forEach(([addr, {entry, dataType}]) => {
        if (entry) {
          if (!dataType) codeEntries.push(addr);
        }
      });
      if (codeEntries.length === 0) {}
      const params: ParamsBuildBlocks = {
        srcMap,
        end: codeRange[1],
        workTime: 40,
        waitTime: 10,
        timestamp: () => window.performance.now(),
        getCodeEntries: () => codeEntries,
        getInitialBlocks: () => [], // Заглушка! Тут должны быть блоки данных, полученные из srcMap
        getCommand: (addr) => makeCommand({ addr, codeRange, cpu, memory, srcMap, tmpBuf }),
      }
      const blocks = await buildBlocks(params);
      this.updateBlocks(blocks);
    });
  }
}

const makeCommand = (params: {
  addr: number;
  srcMap?: SrcMap;
  memory: Memory;
  cpu: Proc8080;
  tmpBuf: Uint8Array;
  codeRange?: [number, number];
}): AbsCmd => {
  const {addr, srcMap, memory, cpu, tmpBuf, codeRange} = params;
  const src = srcMap?.addrMap.get(addr);
  let length = 1;
  let isFinal: boolean | undefined;
  let altAddr: number | undefined;
  const opCode = memory.getByte(addr);
  const cmdId = cpu.opCodes[opCode];
  if (cmdId) {
    const cmd = cpu.cmdMap[cmdId];
    if (cmd) {
      length = cmd.length;
      isFinal = cmd.isFinal;
      cmd.usage?.forEach((u, i) => {
        if (u === "code") {
          tmpBuf[0] = opCode;
          tmpBuf[1] = memory.getByte(addr + 1);
          tmpBuf[2] = memory.getByte(addr + 2);
          altAddr = cmd.params?.(tmpBuf, 0)[i];
          if (altAddr && (!codeRange || (altAddr < codeRange[0] || altAddr >= codeRange[1]))) {
            altAddr = undefined;
          }
        }
      })
    }
  }
  return {src, length, isFinal, altAddr}
}