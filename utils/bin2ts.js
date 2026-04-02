/**
 * Конвертирование бинарников в ts - это не самое лучшее решение.
 * Но прямые способы импорта зависят от сборщика бандла (webpack).
 * А для Node при использовании tsc такого механизма нет.
 * Поэтому было решено использовать железобетонный вариант.
 * 
 * Предполагается, что ТС будет лежать в той же папке с нужным бинарником
 * Example:
 * node ..\..\..\utils\bin2ts.js .\microshaMonitor.bin
 */

const fs = require("node:fs");
const path = require("node:path");

let srcFileName;
let mode;
let varName;

process.argv.slice(2).forEach(cmd => {
  if (cmd[0] === "-") {
    mode = cmd;
  } else if (mode) {
    if (mode === "-var") {
      varName = cmd;
    }
    mode = "";
  } else if (!srcFileName) {
    srcFileName = cmd
  } else {
    throw Error(`Unknown parameter: ${cmd}`);
  }
})
if (!srcFileName) {
  throw Error("Expected binary file name");
}
console.log("Read file ", srcFileName);
const bin = fs.readFileSync(srcFileName);
if (!(bin instanceof Uint8Array)) {
  throw Error(`File content must be Uint8Array`);
}
const res = path.parse(srcFileName);
if (!varName) varName = res.name;
const dstFileName = res.dir + path.sep + res.name + ".ts";
console.log("write to", dstFileName);
let text = `export const ${varName} = new Uint8Array([\n`;
let pos = 0;
while (pos < bin.length) {
  const row = bin.slice(pos, pos+16);
  text += "  ";
  text += Array.from(row).map(n => "0x" + n.toString(16).toUpperCase().padStart(2, "0") + ", ").join("")
  text += "\n";
  pos += 16;
}
text += `]);`;
fs.writeFileSync(dstFileName, text, {encoding: "utf8"});
console.log("OK");