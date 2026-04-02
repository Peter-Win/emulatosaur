import { SrcMapItem } from "../SrcMap/SrcMap";

type AsmLineType = "code" | "data" | "comm" | "label";

export type AsmLine = {
  type: AsmLineType;
  addr?: number;
  src?: SrcMapItem;
  i?: number;
}