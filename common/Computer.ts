import { Memory } from "./memory/Memory";

export interface Computer {
  memory: Memory;
  step(): void;
}

