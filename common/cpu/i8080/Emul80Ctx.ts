import {Computer} from "../../Computer";
import { Processor } from "../Processor";
import {Registers80} from "./Registers80";

export type Emul80Ctx = {
  comp: Computer;
  cpu: Processor;
  regs: Registers80;
}

/**
 * Эмуляция операции процессора.
 * На выходе - увеличение ре-ра PC
 */
export type Emul80Op = (ctx: Emul80Ctx, buffer: Uint8Array, pos: number) => number;