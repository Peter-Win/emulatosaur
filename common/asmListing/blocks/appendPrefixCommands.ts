import { SrcMapItem } from "../../SrcMap/SrcMap";
import { AsmLine } from "../AsmLine";

export const appendPrefixLines = (cmdList: AsmLine[], src: SrcMapItem, addr: number) => {
  src.prefix?.forEach((_comm, i) => cmdList.push({type: "comm", addr, i, src}));
  if (src.label) cmdList.push({type: "label", addr, src});
}