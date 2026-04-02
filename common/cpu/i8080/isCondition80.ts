import {P80FlagMask} from "./Registers80";

export const isCondition80 = (flags: number, opCode: number): boolean => {
  const cond = (opCode >> 3) & 7;
  switch (cond) {
    case 0: // NZ
      return !(flags & P80FlagMask.Z);
    case 1: // Z
      return !!(flags & P80FlagMask.Z);
    case 2: // NC
      return !(flags & P80FlagMask.C);
    case 3: // C
      return !!(flags & P80FlagMask.C);
    case 4: // PO
      return !(flags & P80FlagMask.P);
    case 5: // PE
      return !!(flags & P80FlagMask.P);
    case 6: // P
      return !(flags & P80FlagMask.S);
    case 7: // M
      return !!(flags & P80FlagMask.S);
  }
  return false;
}