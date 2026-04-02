import * as React from "react";
import * as styles from "./MicroshaView.module.less";
import { observer } from "mobx-react-lite";
import { Microsha } from "common/computer/Microsha";
import { microshaSrcMap } from "common/computer/Microsha/microshaSrcMap";
import { parseSrcMap } from "common/SrcMap/parseSrcMap";
import { Proc80Store } from "../../Proc80Store";
import { createSrcMap, SrcMap } from "common/SrcMap/SrcMap";
import { DebuggerGrid80 } from "../../DebuggerGrid80";
import { useEmulator } from "src/utils/useEmulator";
import { createCtrMicrosha } from "common/Computer/Microsha/CrtMicrosha";
import { Display } from "src/components/Display";
import { MicroshaKeyboardView } from "./MicroshaKeyboardView";
import { hexByte } from "common/format";
import { TapeRecorderView } from "src/components/TapeRecorderView";
import { I8255Port } from "common/controller/Intel8255";
import { CrtFontView } from "src/components/CrtFontView";
import { microshaFontSet } from "common/Computer/Microsha/microshaFontSet";
import { TapeRecorderStore } from "src/components/TapeRecorderView/TapeRecorderStore";
import { TapeRecorder } from "common/devices/TapeRecorder";

export const MicroshaView: React.FC = observer(() => {
  const comp = React.useMemo(() => new Microsha(), []);
  const store = React.useMemo(() => {
    let srcMap: SrcMap;
    try {
      srcMap = parseSrcMap(microshaSrcMap)
    } catch (e) {
      console.error(e);
      srcMap = createSrcMap(0xF800);
    }
    const res = new Proc80Store(comp, comp.cpu, srcMap, [0xF800, 0x10000]);
    res.setCharsetName("МИКРОША");

    // res.emulator.setHook?.(0xFC23, () => {
    //   console.log("FC23: first bit=", hexByte(comp.cpu.regs.getA()));
    // });

    return res;
  }, []);
  const tapeRecStore = React.useMemo(() => {
    const recorder = new TapeRecorder();
    return new TapeRecorderStore(recorder, comp.memory, comp.ctrlKbd, comp.cpu);
  }, []);

  useEmulator(store.emulator);

  React.useEffect(() => {
    return () => store.done();
  }, []);

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

  const [sound, setSound] = React.useState(false);
  React.useEffect(() => {
    const {ctrlKbd} = comp;
    const onChange = (port: I8255Port) => {
      if (port === "C") {
        setSound(!!(ctrlKbd.c & 2));
      }
    }
    ctrlKbd.change.add(onChange);
    return () => ctrlKbd.change.remove(onChange);
  }, []);

  return (
    <div className={styles.frame}>
      <div className={styles.disp}>
        <Display crt={crt} tools={<CrtFontView fontData={microshaFontSet} glyphHeights={[8, 12, 16]} />} />
      </div>
      <div className={styles.tap}>
        <TapeRecorderView soundOn={sound} store={tapeRecStore} />
      </div>
      <div className={styles.kbd}>
        <MicroshaKeyboardView kbd={comp.keyboard} />
      </div>
      <div className={styles.debug}>
        <DebuggerGrid80 store={store} />
      </div>
    </div>
  )
})