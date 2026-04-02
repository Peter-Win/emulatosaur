import * as React from "react";
import * as styles from "./Display.module.less";
import { Crt } from "common/Crt";

type PropsDisplay = {
  crt: Crt;
  tools?: React.ReactNode | React.ReactNode[];
}

export const Display: React.FC<PropsDisplay> = (props) => {
  const { crt, tools } = props;
  const { width, height, render } = crt;
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  // Сейчас полная перерисовка происходит на каждом фрейме браузера
  React.useEffect(() => {
    let active = true;
    if (canvasRef.current?.getContext) {
      const ctx = canvasRef.current.getContext("2d");
      if (ctx) {
        const image = ctx.createImageData(width, height);
        const draw = () => {
          render(image);
          ctx.putImageData(image, 0, 0);
          if (active) {
            requestAnimationFrame(draw);
          }
        }
        requestAnimationFrame(draw);
      }
    }
    return () => {
      active = false;
    }
  }, [width, height]);
  return (
    <div className={styles.box}>
      <div className={styles.crt}>
        <canvas 
          ref={canvasRef} 
          width={width} 
          height={height}
          style={{ width, height }}
        />
      </div>
      <div className={styles.tools}>
        {tools}
      </div>
    </div>
  )
}
