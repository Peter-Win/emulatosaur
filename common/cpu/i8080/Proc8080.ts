import { Processor } from "../Processor";
import { P80FlagMask, Registers80 } from "./Registers80";
import { opCode8080 } from "./opCode8080";
import { CpuCommand } from "../CpuCommand";
import { cmd8080 } from "./cmd8080";
import { Emul80Op } from "./Emul80Ctx";
import { opEmul8080 } from "./opEmul8080";

export class Proc8080 implements Processor {
  constructor(params?: {
    name?: string;
    opCodes?: (string | null)[]; 
    cmdMap?: Record<string, CpuCommand>;
    emulMap?: Record<string, Emul80Op>;
  }) {
    this.name = params?.name ?? "Intel 8080";
    this.opCodes = params?.opCodes ?? opCode8080;
    this.cmdMap = params?.cmdMap ?? cmd8080;
    this.emulMap = params?.emulMap ?? opEmul8080;
    this.regs.setFlags(P80FlagMask.Default); // бит 2 всегда установлен у 8080
  }
  name: string;
  regs = new Registers80();
  opCodes: (string|null)[];
  cmdMap: Record<string, CpuCommand>;
  emulMap: Record<string, Emul80Op>;

  // Изначально казалось хорошей идеей не читать команды, а прямо использовать буфер памяти.
  // Но память разделяется на отдельные куски. Н.р. RAM, ROM, video... 
  // И нет гарантии, что команда из 2 или 3 байт не попадёт на границу разделов.
  // Поэтому единственным надёжным доступом остаётся побайтовое чтение в кеш команды.
  cmdCache = new Uint8Array(3);

  eint: boolean = true;
  get intEnabled() {
    return this.eint;
  }
  enableInt(enable: boolean): void {
    this.eint = enable;
  }
}