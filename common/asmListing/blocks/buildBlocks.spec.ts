import { createSrcMap, SrcMap } from "../../SrcMap/SrcMap";
import { parseSrcMap } from "../../SrcMap/parseSrcMap";
import { AbsCmd } from "./AbsCmd";
import { buildBlocks, ParamsBuildBlocks } from "./buildBlocks";
import { ReasmBlock } from "./ReasmBlock";

type TestCmd = AbsCmd & {
  cmd: string;
}

type TestData = {
  cmdList: TestCmd[];
  srcMap: SrcMap;
}

const mkParams = ({cmdList, srcMap}: TestData): ParamsBuildBlocks => {
  const start = srcMap.org;
  const codeEntries: number[] = Array.from(srcMap.addrMap.entries())
    .filter(([, it]) => !!it.entry)
    .map(([addr,]) => addr);
  if (codeEntries.length === 0) codeEntries.push(start);
  const dataBlocks: ReasmBlock[] = [];
  let tmpAddr = start;
  cmdList.forEach(({length}) => {
    const si = srcMap.addrMap.get(tmpAddr);
    const tmpEnd = tmpAddr + length;
    if (si?.dataType) {
      dataBlocks.push({begin: tmpAddr, end: tmpEnd, isData: true, lines: [{
        addr: tmpAddr, type: "data", src: si
      }]})
    }
    tmpAddr = tmpEnd;
  });
  return {
    srcMap,
    waitTime: 0,
    workTime: 0,
    timestamp: () => 0,
    getInitialBlocks: () => dataBlocks,
    getCodeEntries: () => codeEntries,
    end: calcEnd(cmdList, start),
    getCommand: (addr) => {
      const cmd = findCmd(addr, cmdList, start);
      if (!cmd) throw Error(`Not found cmdAddr ${addr}`);
      const src = srcMap.addrMap.get(addr);
      return {...cmd, src};
    },
  }
}

describe("buildBlocks", () => {

  // Простейший случай. Один блок из трёх команд
  it("single block", async () => {
    const p = mkParams({
      cmdList: [
        { cmd: "mov a, 80h", length: 2 },
        { cmd: "sta 7000h", length: 3 },
        { cmd: "ret", length: 1, isFinal: true },
      ],
      srcMap: createSrcMap(0),
    });
    const blocks = await buildBlocks(p);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toEqual({
      begin: 0,
      end: 6,
      lines: [
        {type: "code", addr: 0, src: undefined},
        {type: "code", addr: 2, src: undefined},
        {type: "code", addr: 5, src: undefined},
      ],
    } satisfies ReasmBlock);
  });


  it("two blocks, single entry", async () => {
    const cmdList: TestCmd[] = [
      { cmd: "cmp a, 80", length: 2 }, // 100
      { cmd: "jc 110", length: 3, altAddr: 110 }, // 102
      { cmd: "ret", length: 1, isFinal: true }, // 105
      { cmd: "nop", length: 4 }, // 106,
      { cmd: "xor a", length: 1 }, // 110
      { cmd: "ret", length: 1, isFinal: true}, // 111
    ];
    const p = mkParams({cmdList, srcMap: createSrcMap(100)});
    expect(p.end).toBe(112);
    const blocks = await buildBlocks(p);
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toEqual({
      begin: 100,
      end: 106,
      lines: [
        { addr: 100, type: "code", src: undefined },
        { addr: 102, type: "code", src: undefined },
        { addr: 105, type: "code", src: undefined },
      ],
    } satisfies ReasmBlock);
    expect(blocks[1]).toEqual({
      begin: 110,
      end: 112,
      lines: [
        { addr: 110, type: "code", src: undefined },
        { addr: 111, type: "code", src: undefined },
      ],
    } satisfies ReasmBlock);
  });

  it("with data block", async () => {
    const cmdList: TestCmd[] = [
      { cmd: "jmp 110", length: 3, isFinal: true, altAddr: 110 }, // 100
      { cmd: 'db "Hello!", 0', length: 7}, // 103
      { cmd: "lxi H, 103", length: 3}, // 110
      { cmd: "ret", length: 1, isFinal: true}, // 113
    ];
    const srcMap = createSrcMap(100);
    srcMap.addrMap.set(100, {entry: true})
    srcMap.addrMap.set(103, {dataType: "zstring"});
    const blocks = await buildBlocks(mkParams({cmdList, srcMap}));
    expect(blocks).toHaveLength(3);
    expect(blocks[0]).toEqual({
      begin: 100,
      end: 103,
      lines: [{addr: 100, type: "code", src: {entry: true}}],
    } satisfies ReasmBlock)
  });

  it("comments and label", async () => {
    const cmdList: TestCmd[] = [
      { cmd: "ret", length: 1, isFinal: true}
    ];
    const srcMap = parseSrcMap(`
      org 1000
      1000
        ; First line
        ; Second line
        mainLabel:
        entry
    `);
    const addr = 0x1000;
    const src = srcMap.addrMap.get(addr);
    expect(src?.label).toBe("mainLabel");
    const blocks = await buildBlocks(mkParams({cmdList, srcMap}));
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toEqual({
      begin: 0x1000,
      end: 0x1001,
      lines: [
        {type: "comm", addr, src, i:0},
        {type: "comm", addr, src, i:1},
        {type: "label", addr, src},
        {type: "code", addr, src},
      ],
    } satisfies ReasmBlock);
  });
})

const calcEnd = (cmdList: AbsCmd[], start = 0): number =>
  cmdList.reduce((acc, {length}) => acc + length, start);

const findCmd = (cmdAddr: number, cmdList: AbsCmd[], start = 0): AbsCmd | undefined => {
  let addr = start;
  for (let cmd of cmdList) {
    if (addr === cmdAddr) return cmd;
    addr += cmd.length;
  }
  return undefined;
}