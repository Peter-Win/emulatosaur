import * as React from "react";
import * as styles from "./RichAsm80Line.module.less";
import { AsmLine } from "common/asmListing/AsmLine";
import { RichAsm80Store } from "./RichAsm80Store";
import { observer } from "mobx-react-lite";
import { hexByte, hexWord } from "common/format";
import { classNames } from "src/utils/classNames";
import { SrcMapItem } from "common/SrcMap/SrcMap";
import { CpuCommand } from "common/cpu/CpuCommand";
import { runTo, toggleBreakpoint } from "common/cpu/ProcEmulator";
import { ArrowDownOutlined, ArrowUpOutlined, PauseCircleFilled, StopFilled } from "@ant-design/icons";
import { isCondition80 } from "common/cpu/i8080/isCondition80";
import { getRetAddr } from "common/cpu/i8080/stack80";

export type CodeLineState = "current" | "altAddr";


type PropsRichAsm80Line = {
  line: AsmLine;
  store: RichAsm80Store;
  lineState?: CodeLineState;
  flags: number;
}

export const RichAsm80Line: React.FC<PropsRichAsm80Line> = observer(props => {
  const {line, store, lineState, flags} = props;
  const {addr, type, src, i} = line;
  return (
    <div className={classNames([
      "mono", 
      styles.line, 
      styles[line.type],
      lineState && styles[lineState],
    ])}>
      <div className={styles.addr}>
        {typeof addr === "number" && (type === "code" ? (
          <button onClick={() => runTo(store.emulator, addr)}>
            {hexWord(addr)}
          </button>
        ) : hexWord(addr))}
      </div>
      <div className={styles.brk}>
        {type === "code" && typeof addr === "number" && <BreakPoint addr={addr} store={store} />}
      </div>
      {type === "comm" && typeof i === "number" && <div className={styles.string}>{src?.prefix?.[i]}</div>}
      {type === "label" && src?.label && <>
        <div className={styles.byteCode} />
        <div className={styles.string}>{src.label}:</div>
      </>}
      {type === "code" && typeof addr === "number" && (
        <CodeLine addr={addr} src={src} store={store} state={lineState} flags={flags} />
      )}
    </div>
  )
});

type PropBreakPoint = {
  addr: number;
  store: RichAsm80Store;
}
const BreakPoint: React.FC<PropBreakPoint> = observer(({addr, store}) => {
  const {emulator} = store;
  if (emulator.tmpBreakpoint === addr) {
    return (
      <button 
        type="button"
        onClick={() => store.emulator.setTmpBreakpoint(null)} 
        title="Cancel this temporary breakpoint."
      >
        <StopFilled />
      </button>);
  }
  const hasBreakpoint = emulator.breakpoints.has(addr);
  return (
    <button
      type="button"
      onClick={() => toggleBreakpoint(emulator, addr)}
      title={hasBreakpoint ? "Clear breakpoint" : "Set breakpoint"}
    >
      {hasBreakpoint && <PauseCircleFilled />}
    </button>
  );  
}) 

type PropsCodeLine = {
  addr: number;
  src?: SrcMapItem;
  store: RichAsm80Store;
  state?: CodeLineState;
  flags: number;
}

const CodeLine: React.FC<PropsCodeLine> = observer((props) => {
  const {addr, src, store, state, flags} = props;
  const {cmd, buf, cmdId, altAddr:aa, condition} = getCmdDef(addr, store);
  let altAddr = aa;
  if (addr === store.currentPC && altAddr === undefined && cmdId && cmdId.startsWith("ret")) {
    altAddr = getRetAddr(store.cpu.regs, store.comp.memory);
  }
  let cmdText = "";
  let cmdParams: React.ReactNode = null;
  let arrow: "up" | "down" | undefined;
  if (cmd && cmdId) {
    const params: (string | number)[] = cmd.params?.(buf, 0) ?? [];
    if (altAddr) {
      let useAddr = !condition;
      if (condition && addr === store.currentPC) {
        useAddr = isCondition80(flags, buf[0]!);
      }
      if (useAddr) {
        if (altAddr < addr) arrow = "up";
        else if (altAddr > addr) arrow = "down";
      }
    }
    cmd.usage?.forEach((use, i) => {
      const n = params[i];
      if (typeof n === "number") {
        if (use === "code" || use === "addr:1" || use === "addr:2" || src?.use === "addr") {
          const label = store.srcMap.addrMap.get(n)?.label;
          if (label) params[i] = label;
        } else if (src?.use === "decWord" || src?.use === "decByte") {
          params[i] = String(n);
        } else if (src?.use === "char") {
          const c = store.charset?.[n];
          if (typeof c === "string") {
            params[i] = `'${c}'`;
          }
        }
      }
    })
    // @ts-ignore
    const s = store.syntax[cmdId]?.(params[0], params[1]);
    cmdText = s || cmdId;
    const r = /^([A-Z]+)\s+(.*)/i.exec(cmdText);
    if (r) {
      cmdText = r[1]!;
      cmdParams = r[2];
    }
  } else {
    cmdText = "db";
    cmdParams = (
      <div className={styles.string}>
        {Array.from(buf).map(byte => store.syntax.i8(byte)).join(", ")}
      </div>
    );
  }
  return <>
    <div className={styles.byteCode}>
      {Array.from(buf).map((byte, i) => <span key={i}>{hexByte(byte)}</span>)}
    </div>
    <div className={styles.cmdPrefix}>{state === "current" && "►"}</div>
    <div className={classNames([
      styles.opName,
      [!!cmd?.isFinal, styles.isFinal],
    ])}>{cmdText}</div>
    {cmdParams}
    {arrow && <div 
      className={classNames([styles.jmpDir, [condition, styles.condition]])} 
      title={altAddr===undefined ? altAddr : hexWord(altAddr)}
      onClick={() => {
        if (altAddr !== undefined) store.setVisibleCodeBeginByAddr(altAddr);
      }}
    >
      {arrow === "up" && <ArrowUpOutlined />}
      {arrow === "down" && <ArrowDownOutlined />}
    </div>}
    {src?.inlineComment && <div className={styles.inlineComment}>; {src.inlineComment}</div>}
  </>
});

type CmdDef = {
  buf: Uint8Array;
  cmdId?: string;
  cmd?: CpuCommand;
  altAddr?: number;
  condition?: boolean; // команды типа jc, jnz... а так же условные call и ret
}

export const getCmdDef = (addr: number, store: RichAsm80Store): CmdDef => {
  const {cpu, comp: {memory}} = store;
  const opCode = memory.getByte(addr);
  const cmdId = cpu.opCodes[opCode];
  if (cmdId) {
    const cmd = cpu.cmdMap[cmdId];
    if (cmd) {
      const buf = new Uint8Array(cmd.length);
      buf[0] = opCode;
      for (let i=1; i<cmd.length; i++) buf[i] = memory.getByte(addr + i);

      let altAddr: number | undefined;
      let condition: boolean | undefined;
      const argv = cmd.params?.(buf, 0);
      cmd.usage?.forEach((what, i) => {
        const n = argv?.[i];
        if (what === "code" && typeof n === "number") {
          altAddr = n;
        } else if (what == "cond") {
          condition = true;
        }
      });

      return {buf, cmd, cmdId, altAddr, condition}
    }
  }
  return {buf: new Uint8Array([opCode])};
}