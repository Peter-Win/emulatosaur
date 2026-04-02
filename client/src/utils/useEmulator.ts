import { ProcEmulator } from "common/cpu/ProcEmulator";
import * as React from "react";
/**
 * React hook
 */
export const useEmulator = (emulator: ProcEmulator) => {
  React.useEffect(() => {
    const interval = setInterval(() => {
      if (emulator.running) {
        const start = window.performance.now();
        while (emulator.running && window.performance.now() - start < activeDelay) {
          emulator.step();
          emulator.checkBreakpoints();
        }
      }
    }, stepDelay);
    return () => {
      emulator.pause();
      clearInterval(interval);
    }
  }, []);
}
const stepDelay = 2;
const activeDelay = 1;


export const useEmulator2 = (emulator: ProcEmulator) => {
  const t = 0;
  React.useEffect(() => {
    const idle = () => {
      if (emulator.running) {
        emulator.step();
        emulator.checkBreakpoints();
      }
      timer = setTimeout(idle, t);
    }
    let timer = setTimeout(idle, t);
    return () => {
      emulator.pause();
      clearTimeout(timer);
    }
  }, []);
}
