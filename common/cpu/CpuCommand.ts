export type UsageType = "i8" | "i16" | "r8" | "r16" | "addr:2" | "addr:1" | "code" | "cond" | undefined;

export interface CpuCommand {
  readonly length: number;
  params?(buffer: Uint8Array, offset: number): number[];
  readonly usage?: UsageType[];
  readonly isFinal?: boolean;
}