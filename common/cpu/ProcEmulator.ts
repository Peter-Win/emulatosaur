export interface ProcEmulator {
  readonly running: boolean;
  start(): void;
  pause(): void;

  step(): void;
  stepIn(): void;
  stepOver(): void;
  stepOut(): void; // В нашем случае это значит: выполнять до ближайшей команды ret

  checkBreakpoints(): void;
  readonly tmpBreakpoint: number | null;
  setTmpBreakpoint(addr: number | null): void;
  breakpoints: Set<number>; // Пока не будем делать дополнительных условий.

  setHook?(addr: number, hook: null | (() => void)): void; // Вызов указанной функции ПЕРЕД выполнением команды. Для отладки.
}

export const runTo = (emulator: ProcEmulator, addr: number) => {
  emulator.setTmpBreakpoint(addr);
  if (!emulator.running) {
    emulator.start();
  }
}

export const toggleBreakpoint = ({breakpoints}: ProcEmulator, addr: number) => {
  if (breakpoints.has(addr)) {
    breakpoints.delete(addr);
  } else {
    breakpoints.add(addr);
  }
}