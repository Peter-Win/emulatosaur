import * as React from "react";
import * as styles from "./DebuggerGrid80.module.less";
import { observer } from "mobx-react-lite";
import { Proc80Store } from "../Proc80Store";
import { RichAsm80 } from "../RichAsm80";
import { Registers8View } from "../Registers8View";
import { MemoryView } from "../MemoryView";
import { Stack16View } from "../Stack16View";

type PropsDebuggerGrid80 = {
  store: Proc80Store;
}

export const DebuggerGrid80: React.FC<PropsDebuggerGrid80> = observer((props) => {
  const {store } = props;
  return (
    <div className={styles.frame}>
      <div className={styles.asm}>
        <RichAsm80 store={store} />
      </div>
      <div className={styles.reg}>
        <Registers8View regs={store.cpu.regs} memory={store.memory} />
      </div>
      <div className={styles.mem}>
        <MemoryView memory={store.comp.memory} />
      </div>
      <div className={styles.stk}>
        <Stack16View store={store} />
      </div>
    </div>
  );
});