import { Memory } from "common/memory/Memory";

export interface Stack16Store {
  memory: Memory;
  readonly currentSP: number | null;
}