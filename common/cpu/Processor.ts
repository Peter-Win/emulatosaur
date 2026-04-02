export interface Processor {
  readonly name: string;
  // INTE (interrupt enabled) — выход, отражающий готовность процессора принять прерывание.
  readonly intEnabled: boolean;
  enableInt(enable: boolean): void;

  readPort?(portIndex: number): number;
  writePort?(portIndex: number, byte: number): void;
}