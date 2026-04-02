import { Computer } from "../../Computer";
import { ProcEmulator } from "../ProcEmulator"
import { Emul80Ctx } from "./Emul80Ctx";
import { Proc8080 } from "./Proc8080";

export const createProc80Emulator = (cpu: Proc8080, comp: Computer): ProcEmulator => {
  const {regs, opCodes, cmdMap, emulMap, cmdCache} = cpu;
  const {memory} = comp;
  const ctx: Emul80Ctx = {comp, cpu, regs};
  const hooks: Record<number, null | (()=>void)> = {}
  const step = () => {
    let cmdPos = regs.getPC();

    hooks[cmdPos]?.(); // Возможный вызов хука перед выполнением команды

    const opCode = memory.getByte(cmdPos++);
    const cmdId = opCodes[opCode];
    let offset = 1;
    if (cmdId) {
      const cmd = cmdMap[cmdId];
      if (cmd) {
        const {length} = cmd;
        cmdCache[0] = opCode;
        if (length > 1) cmdCache[1] = memory.getByte(cmdPos++);
        if (length > 2) cmdCache[2] = memory.getByte(cmdPos);
        const emulOp = emulMap[cmdId];
        if (emulOp) {
          offset = emulOp(ctx, cmdCache, 0); // <-- выполнение текущей команды
        } else {
          console.log(`Не найден эмулятор команды ${cmdId}`);
        }
      }
    } else {
      // Если для кода отсутствует операция.
      // Для 8080 таких кодов 12.
      // Считаем их аналогом NOP.
      offset = 1;
    }
    regs.setPC(regs.getPC() + offset);
  }
  const inst = {
    running: false,
    start(): void {
      this.running = true;
    },
    pause(): void {
      this.setTmpBreakpoint(null);
      this.running = false;
    },
    step() {
      step();
    },
    stepIn(): void {
      step();
    },
    stepOver(): void {
      this.stepIn();
    },
    // В нашем случае это значит: выполнять до ближайшей команды ret
    stepOut(): void {

    },
    tmpBreakpoint: null as null | number,
    setTmpBreakpoint(addr: number | null) {
      this.tmpBreakpoint = addr;
    },
    checkBreakpoints() {
      if (this.running) {
        const addr = regs.getPC();
        if (addr === this.tmpBreakpoint) {
          this.setTmpBreakpoint(null);
          this.pause();
          return;
        }
        if (this.breakpoints.has(addr)) {
          this.pause();
          return;
        }
      }
    },
    breakpoints: new Set<number>,
    setHook(addr: number, hook: null | (() => void)) {
      hooks[addr] = hook;
    },
  };
  return inst;
}