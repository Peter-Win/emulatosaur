import {hexWord} from "../format";
import {calcCheckSumXor2} from "./TapeRecorder";

test("calcCheckSumXor2", () => {
  const buf = new Uint8Array([0x41, 0x42, 0x43, 0x44, 0x45, 0x46]);
  expect(hexWord(calcCheckSumXor2(buf, 0, 1))).toBe("0041");
  expect(hexWord(calcCheckSumXor2(buf, 0, 2))).toBe("4241");
  expect(hexWord(calcCheckSumXor2(buf, 0, 4))).toBe("0602");
  expect(hexWord(calcCheckSumXor2(buf, 0, 6))).toBe("4047");
})