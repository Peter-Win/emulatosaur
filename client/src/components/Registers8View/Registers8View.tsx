import * as React from "react";
import * as styles from "./Registers8View.module.less";
import { P80FlagMask, P80Reg16Name, P80Reg8Name, Registers80 } from "common/cpu/i8080/Registers80";
import { Frame } from "../Frame";
import { hexByte, hexWord } from "common/format";
import { Memory } from "common/memory/Memory";
import { classNames } from "src/utils/classNames";
import { DropdownEditor } from "../DropdownEditor";

type PropsRegisters8View = {
  regs: Registers80;
  memory: Memory;
}

export const Registers8View: React.FC<PropsRegisters8View> = (props) => {
  const {regs, memory} = props;
  const [counter, setCounter] = React.useState(0);
  React.useEffect(() => {
    const h = setInterval(() => {
      setCounter(prev => prev + 1);
    }, 800);
    return () => clearInterval(h);
  }, []);
  return (
    <Frame
      title="Registers"
      tools={<></>}
    >
      <div className={styles.frame}>
        <div className={styles.regsFrame}>
          <div className={styles.regsContent}>
            {(["A", "B", "C", "D", "E", "H", "L", "M"] as const).map((id: P80Reg8Name) => (
              <RegView
                key={id}
                name={id}
                value={regs.get8id(id, memory)}
                onChange={(val) => regs.set8id(id, val, memory)}
              />
            ))}
            <RegView name="F" value={regs.getFlags()} onChange={v => regs.setFlags(v)} />
            <hr />
            {(["PSW", "BC", "DE", "HL", "SP", "PC"] as const).map((id: P80Reg16Name) => (
              <RegView
                key={id}
                name={id === "PSW" ? "AF" : id}
                value={regs.get16id(id)}
                onChange={v => regs.set16id(id, v)}
                isWord
              />
            ))}
          </div>
        </div>
        <div className={styles.flags}>
          <Flag name="S" mask={P80FlagMask.S} regs={regs} />
          <Flag name="Z" mask={P80FlagMask.Z} regs={regs} />
          <Flag name="AC" mask={P80FlagMask.AC} regs={regs} />
          <Flag name="P" mask={P80FlagMask.P} regs={regs} />
          <Flag name="C" mask={P80FlagMask.C} regs={regs} />
        </div>
      </div>
    </Frame>
  )
}

type PropsFlag = {
  name: string;
  mask: P80FlagMask;
  regs: Registers80;
}

const Flag: React.FC<PropsFlag> = (props) => {
  const {name, mask, regs} = props;
  const value = !!(regs.getFlags() & mask);
  const onOk = (newValue: boolean) => {
    let curFlags = regs.getFlags();
    if (newValue) {
      curFlags |= mask;
    } else {
      curFlags &= ~mask;
    }
    regs.setFlags(curFlags)
  }
  return (
    <DropdownEditor
      content={{
        type: "switch",
        value,
        onOk,
        label: `${name}=`,
        msgOn: "1",
        msgOff: "0",
      }}
    >
      <div className={classNames(["mono", styles.editableValue])}>
        {`${name.padStart(2, " ")}=${value ? "1" : "0"}`}
      </div>
    </DropdownEditor>
  )
}

type PropsRegView = {
  name: string;
  isWord?: boolean;
  value: number;
  onChange(newValue: number): void;
}

const RegView: React.FC<PropsRegView> = (props) => {
  const {name, isWord, value, onChange} = props;
  return <>
    <div className={styles.name}>{name}</div>
    <DropdownEditor
      content={{
        type: "input",
        onOk: (text) => onChange(parseInt(text, 16)),
        label: `${name} = `,
        placeholder: "hex",
        requiredMsg: "required",
        maxLength: isWord ? 4 : 2,
        pattern: /^[\dA-F]+$/i,
        patternMsg: "Hex required",
      }}
    >
      <div className={classNames(["mono", styles.editableValue])}>
        {isWord ? hexWord(value) : hexByte(value)}
      </div>
    </DropdownEditor>
  </>
}