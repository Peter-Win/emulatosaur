import { ReasmBlock } from "./ReasmBlock";
import { delay } from "../../delay";
import { SrcMap } from "../../SrcMap/SrcMap";
import { AbsCmd } from "./AbsCmd";
import { appendPrefixLines } from "./appendPrefixCommands";


export type ParamsBuildBlocks = {
  srcMap: SrcMap,
  getCodeEntries: () => number[];
  getInitialBlocks: () => ReasmBlock[];
  workTime: number;
  waitTime: number;
  timestamp: () => number;
  getCommand: (addr: number) => AbsCmd;
  end: number; // Конец анализируемого кода
}

/**
 * Абстрактный алгоритм анализа кода.
 * Позволяет делать перерывы, чтобы не перегружать основной поток браузера.
 * @param params 
 * @returns 
 */
export const buildBlocks = async (params: ParamsBuildBlocks): Promise<ReasmBlock[]> => {
  const queue: number[] = params.getCodeEntries();
  const blocks: ReasmBlock[] = params.getInitialBlocks();
  sortBlocks(blocks);
  let t0 = params.timestamp();
  while (queue.length) {
    if (params.timestamp() - t0 > params.workTime) {
      await delay(params.waitTime);
      t0 = params.timestamp();
    }

    const blockBeginAddr = queue.shift();
    if (blockBeginAddr === undefined) break;

    const exists = findBlock(blocks, blockBeginAddr);
    if (exists) {
      continue;
    }

    const newBlock: ReasmBlock = {
      begin: blockBeginAddr,
      end: blockBeginAddr,
      lines: [],
    }
    blocks.push(newBlock);
    sortBlocks(blocks);

    for (let addr = blockBeginAddr; addr < params.end;) {
      const cmd = params.getCommand(addr);
      const {src} = cmd;
      if (src) {
        appendPrefixLines(newBlock.lines, src, addr);
      }
      newBlock.lines.push({type: "code", addr, src});
      if (cmd.altAddr) {
        queue.push(cmd.altAddr);
      }

      addr += cmd.length;
      newBlock.end = addr;

      // поиск блока
      const otherBlock = findBlock(blocks, addr);
      if (otherBlock) {
        // Дошли до другого блока
        // TODO: можно было бы объединить. Но в принципе должно и так быть норм.
        // PS. Теоретически, если otherBlock.begin !== addr, то это ошибочная ситуация,
        // означающая что часть текущей команды попала в другой блок.
        break;
      }

      if (cmd.isFinal) break;
    }
  }
  sortBlocks(blocks);
  return blocks;
}

export const sortBlocks = (blocks: ReasmBlock[]) =>
  blocks.sort((a, b) => a.begin - b.begin);

const findBlock = (blocks: ReasmBlock[], addr: number): ReasmBlock | undefined =>
  blocks.find(({begin, end}) => begin <= addr && addr < end);