import { CharsetName, charsets } from "../charset";
import { parseHexWord } from "../format";
import { SrcMap, SrcMapItem } from "./SrcMap";

export const parseSrcMap = (text: string): SrcMap => {
  const lines = text.split("\n").map(s => s.trim());
  let org: number | undefined;
  const result: Omit<SrcMap, "org"> = {
    addrMap: new Map(),
  }
  let curAddr: SrcMapItem | undefined;
  const labels: Record<string, number> = {};

  lines.forEach((line, i) => {
    if (!line) return;
    const errMsg = (msg: string) => `${msg} in line ${i+1}: ${line}`;
    const error = (msg: string) => {
      throw Error(errMsg(msg));
    }
    const onCurAddr = (fn: (item: SrcMapItem) => void) => {
      if (!curAddr) {
        error(`Current address is not defined`);
      } else {
        fn(curAddr);
      }
    }
    
    // org
    const orgRes = /^org\s+(.+)$/i.exec(line);
    if (orgRes) {
      if (typeof org === "number") error(`Duplicated org`);
      org = parseHexWord(orgRes[1]!, errMsg(`Invalid org value ${orgRes[1]}`));
      return;
    }

    // syntax
    const syntax = /^syntax\s+(.*)$/i.exec(line);
    if (syntax) {
      result.syntax = /^z/i.test(syntax[1]!) ? "zilog" : "intel";
      return;
    }

    // charset
    const charset = /^charset\s+(.*)$/.exec(line);
    if (charset) {
      const charsetName = charset[1]!;
      if (charsetName in charsets) {
        result.charset = charsetName as CharsetName; // Странно, что ТС не делает автотипизацию для такого случая
      } else {
        error(`Invalid charset name '${charsetName}'`);
      }
      return;
    }

    // address
    if (/^[\da-f]{4}$/i.test(line)) {
      const addr = parseInt(line, 16);
      if (addr in result.addrMap) error(`Duplicated address ${line}`);
      curAddr = {};
      result.addrMap.set(addr, curAddr);
      return;
    }

    // label
    if (line.endsWith(":")) return onCurAddr(rec => {
      let label = line.slice(0,-1);
      if (label[0] === "=") {
        label = label.slice(1);
        rec.equ = true;
      }
      const prev = labels[label];
      if (prev) error(`Duplicated label '${label}' (First in line ${prev})`);
      rec.label = label;
      labels[label] = i+1;
    });

    // entry
    if (line === "entry") return onCurAddr(rec => {
      rec.entry = true;
    });

    // inline comment
    if (line.startsWith(";;")) return onCurAddr(rec => {
      rec.inlineComment = line.slice(2).trim();
    });

    // prefix comment
    if (line.startsWith(";")) return onCurAddr(rec => {
      rec.prefix = rec.prefix || [];
      rec.prefix.push(line);
    })

    // use
    const rUse = /^use\s+(.+)/i.exec(line);
    if (rUse) return onCurAddr(rec => {
      const u = rUse[1]!;
      const rel = /^relativeAddr\s+([\dA-F]+)$/i.exec(u);
      if (rel) {
        rec.use = "relativeAddr";
        rec.relativeAddr = parseInt(rel[1]!, 16);
      } else if (u==="addr" || u==="char" || u==="decByte" || u==="decWord") {
        rec.use = u;
      } else {
        error(`Unknown use '${u}'`);
      }
    });

    if (line === "zstring" || line === "byte" || line === "word") {
      return onCurAddr(rec => {
        rec.dataType = line;
      });
    }

    // length. для данных
    const rLen = /^length\s+(\d+)$/.exec(line);
    if (rLen) return onCurAddr(rec => {
      rec.length = +(rLen[1]!);
    })
    
    error(`Invalid source map command`);
  });
  if (typeof org !== "number") throw Error("Expected org value"); 
  return {...result, org};
}