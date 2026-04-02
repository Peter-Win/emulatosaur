import * as React from "react";
import * as styles from "./DebuggerGrid.module.less";
import { Computer } from "common/Computer";
import { Proc8080 } from "common/cpu/i8080/Proc8080";
import { PureAsm80 } from "../PureAsm80";
import { MemoryView } from "../MemoryView";
import { CharsetName } from "common/charset";
import { Registers8View } from "../Registers8View";
import { ProcEmulator } from "common/cpu/ProcEmulator";
import { useEmulator } from "src/utils/useEmulator";
import { Microsha } from "common/computer/Microsha";
import { MicroshaKeyboardView } from "../computers/MicroshaView/MicroshaKeyboardView";
import { Display } from "../Display";
import { Crt } from "common/Crt";
import { createCtrMicrosha } from "common/Computer/Microsha/CrtMicrosha";

type PropsDebuggerGrid = {
  comp: Microsha; // TODO <--- временно?
  cpu: Proc8080;
  emulator: ProcEmulator;
  startAddr: number;
  defaultCharset: CharsetName;
}

const defaultCrt: Crt = {
  width: 256,
  height: 256,
  render: (image) => {
    const {data} = image;
    let pos = 0;
    let counter = image.height * image.width;
    while (counter--) {
      data[pos++] = 0;
      data[pos++] = 16;
      data[pos++] = 0;
      data[pos++] = 0xFF;
    }
  }
}

export const DebuggerGrid: React.FC<PropsDebuggerGrid> = (props) => {
  const {comp, cpu, emulator, startAddr, defaultCharset} = props;
  useEmulator(emulator);
  const getCharsetPart = () => comp.ctrlIo.b ? 1 : 0;
  const [crt, setCrt] = React.useState(createCtrMicrosha(comp.ctrlVideo, comp.memory, getCharsetPart));
  React.useEffect(() => {
    comp.ctrlVideo.onChange = (cmd) => {
      if (cmd === 0) {
        setCrt(createCtrMicrosha(comp.ctrlVideo, comp.memory, getCharsetPart));
      }
    }
    return () => {
      comp.ctrlVideo.onChange = undefined;
    }
  });

  return (
    <div className={styles.frame}>
      <div className={styles.display}>
        <Display crt={crt} />
      </div>
      <div className={styles.asm}>
        <PureAsm80
          comp={comp}
          cpu={cpu}
          emulator={emulator}
        />
      </div>
      <div className={styles.regs}>
        <Registers8View regs={cpu.regs} memory={comp.memory} />
      </div>
      <div className={styles.memory}>
        <MemoryView 
          memory={comp.memory} 
          startAddr={startAddr} 
          defaultCharset={defaultCharset}
        />
      </div>
      <div className={styles.kbd}>
        <MicroshaKeyboardView kbd={comp.keyboard} />
      </div>
    </div>
  );
}