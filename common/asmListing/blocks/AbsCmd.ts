import { CpuCommand } from "../../cpu/CpuCommand";
import { SrcMapItem } from "../../SrcMap/SrcMap";

export type AbsCmd = Pick<CpuCommand, "length" | "isFinal"> & {
  altAddr?: number;
  src?: SrcMapItem;
}
