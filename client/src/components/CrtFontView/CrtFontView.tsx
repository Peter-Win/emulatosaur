import { FontSizeOutlined } from "@ant-design/icons";
import { Button, Modal } from "antd";
import * as React from "react";

type PropsCrtFontView = {
  fontData: Uint8Array;
  glyphHeights: number[];
}

export const CrtFontView: React.FC<PropsCrtFontView> = (props) => {
  const {fontData, glyphHeights} = props;
  const glyphSize = glyphHeights.reduce((sum, h) => sum + h, 0);
  const glyphsCount = glyphSize ? fontData.length / glyphSize : 0;
  const rowHeight = glyphHeights.reduce((acc, h) => Math.max(acc, h), 0);
  const rowsCount = (glyphsCount + 15) >> 4;
  const cellWidth = 8 * glyphHeights.length;
  const pixWidth = 16 * cellWidth;
  const pixHeight = rowsCount * rowHeight;
  const [open, setOpen] = React.useState(false);
  const refCanvas = React.useRef<HTMLCanvasElement>(null);
  React.useEffect(() => {
    console.log("Canvas", refCanvas.current);
  }, [refCanvas.current]);


  const draw = () => {
    const ctx = refCanvas.current?.getContext("2d");
    if (!ctx) return;
    const img = ctx.createImageData(pixWidth, pixHeight);
    const {data} = img;

    let dst = 0;
    let src = 0;
    for (let count=pixWidth*pixHeight; count>0; count--) {
      data[dst++] = 0;
      data[dst++] = 0;
      data[dst++] = 16;
      data[dst++] = 255;
    }

    for (let i=0; i<glyphsCount; i++) {
      const x0 = (i & 0xF) * cellWidth;
      const y0 = (i >> 4) * rowHeight;
      dst = (y0 * pixWidth + x0) * 4;
      glyphHeights.forEach((h, j) => {
        let rowBegin = dst + j * 8 * 4;
        for (let row=0; row<h; row++) {
          const d = fontData[src++]!;
          let outPos = rowBegin;
          for (let m=0x80; m>0; m = m >> 1) {
            if (m & d) {
              data[outPos++] = 255;
              data[outPos++] = 255;
              data[outPos++] = 255;
              outPos++;
            } else {
              outPos += 4;
            }
          }
          rowBegin += pixWidth * 4;
        }
      });
    }
    ctx.putImageData(img, 0, 0);
  }

  return <>
    <Button 
      size="small" 
      icon={<FontSizeOutlined />} 
      title="Show font"
      onClick={() => setOpen(true)}
    />
    <Modal
      open={open}
      onCancel={() => setOpen(false)}
      footer={null}
      title="Font"
      centered
      afterOpenChange={(open) => {
        if (open) draw();
      }}
    >
      <canvas ref={refCanvas} width={pixWidth} height={pixHeight} style={{width: pixWidth, height: pixHeight}} />
    </Modal>
  </>
}

