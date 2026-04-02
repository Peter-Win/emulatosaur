import {Crt} from "../../Crt";
import {CrtIntel8275, CursorFmt, Blinking} from "../../controller/CrtIntel8275";
import {Memory} from "../../memory/Memory";
import {microshaFontSet} from "./microshaFontSet";

const srcStart = 0x76D0;

export const createCtrMicrosha = (ctrl: CrtIntel8275, memory: Memory, getPart: () => number): Crt => {
  const {charsPerRow, verticalRows, linesPerChar, horizontalRetraceCount } = ctrl;
  // Для Микроши xOffset = 8
  const xOffset = horizontalRetraceCount;
  // К сожалению, пока не понятно, откуда берётся 3, т.к. verticalRetraceRowCount=1
  // Поэтому хардкод
  const yOffset = 3;
  const visibleCharsPerRow = charsPerRow - xOffset;
  const visibleRows = verticalRows - yOffset;
  const width = Math.max(visibleCharsPerRow * 8, 256);
  const height =  Math.max(visibleRows * linesPerChar, 256);
  const time0 = window.performance.now();
  const render = (image: ImageData) => {
    const {displayOn} = ctrl;
    const {data} = image;
    let pos = 0;
    // залить фон
    let counter = image.height * image.width;
    while (counter--) {
      data[pos++] = 0;
      data[pos++] = 0;
      data[pos++] = 128;
      data[pos++] = 0xFF;
    }
    if (displayOn) {
      const partIndex = getPart();
      const glyphSize = 8 + 12 + 16;
      const fontPartOffset = glyphSize * 128;
      const scanPitch = width * 4;
      const rowPitch = scanPitch * linesPerChar;
      for (let row = yOffset; row < verticalRows; row++) {
        let srcPos = srcStart + row * charsPerRow + xOffset;
        const dstRowBegin = (row-yOffset) * rowPitch;
        for (let col=0; col<visibleCharsPerRow; col++) {
          const ch = memory.getByte(srcPos++);
          if (ch) {
            let dstPos = dstRowBegin + col * 32;
            let gPos = ch * glyphSize;
            gPos += partIndex * fontPartOffset;
            for (let y=0; y<8; y++) {
              let pos = dstPos;
              const charLine = microshaFontSet[gPos++]!;
              for (let x=0; x<8; x++) {
                if (charLine & (0x80 >> x)) {
                  data[pos++] = 0xFF;
                  data[pos++] = 0xFF;
                  data[pos++] = 0xFF;
                  pos++
                } else {
                  pos += 4;
                }
              }
              dstPos += scanPitch;
            }
          }
        }
      }
      // cursor
      const {cursorX, cursorY, cursorFmt, cursorBlinking} = ctrl;
      if (cursorBlinking === Blinking.blinking) {
        const dt = window.performance.now() - time0;
        const i = Math.floor(dt/500);
        if (i & 1) return;
      }
      let cPos = (cursorY - yOffset) * rowPitch + Math.max(cursorX - xOffset, 0) * 32;
      if (cursorFmt === CursorFmt.underline) {
        // underline
        cPos += scanPitch * (linesPerChar - 1);
        for (let x=0; x<8; x++) {
          data[cPos++] = 255;
          data[cPos++] = 255;
          data[cPos++] = 255;
          cPos++;
        }
      } else {
        // reverse
        for (let y=0; y<linesPerChar; y++) {
          let rowPos = cPos;
          for (let x=0; x<8; x++) {
            data[rowPos++] = 255-data[rowPos]!; 
            data[rowPos++] = 255-data[rowPos]!; 
            data[rowPos++] = 255-data[rowPos]!; 
            rowPos++;
          }
          cPos += scanPitch;
        }
      }
    }
  }
  return {width, height, render};
}