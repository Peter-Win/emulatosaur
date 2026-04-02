import { koi7H0, koi7H1, koi7H2 } from "./koi7";
import { microshaCharset } from "./microshaCharset";

export type CharsetName = "КОИ-7 Н0" | "КОИ-7 Н1" | "КОИ-7 Н2" | "МИКРОША";

export const charsets: Record<CharsetName, string[]> = {
  "КОИ-7 Н0": koi7H0,
  "КОИ-7 Н1": koi7H1,
  "КОИ-7 Н2": koi7H2,
  "МИКРОША": microshaCharset,
}
