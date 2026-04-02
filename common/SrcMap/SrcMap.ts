import { CharsetName } from "../charset";

export type SyntaxId = "intel" | "zilog";

export type DataType = "byte" | "word" | "zstring";

export type UseType = "addr" | "relativeAddr" | "char" | "decByte" | "decWord";

export type SrcMapItem = {
  label?: string;
  prefix?: string[];
  inlineComment?: string;
  equ?: boolean;
  entry?: boolean;
  dataType?: DataType;
  length?: number;
  use?: UseType;
  relativeAddr?: number;
}

export interface SrcMap {
  org: number; // стартовый адрес
  syntax?: SyntaxId;
  charset?: CharsetName;
  addrMap: Map<number, SrcMapItem>;
}

export const createSrcMap = (org: number): SrcMap => ({
  org,
  addrMap: new Map(),
})