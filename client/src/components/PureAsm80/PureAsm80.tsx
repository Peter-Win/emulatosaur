import * as React from "react";
import * as styles from "./PureAsm80.module.less";
import { Button, Radio } from "antd";
import { Frame } from "../Frame";
import { ListRange, Virtuoso, VirtuosoHandle } from "react-virtuoso";
import { classNames } from "src/utils/classNames";

import { Computer } from "common/Computer";
import { Proc8080 } from "common/cpu/i8080/Proc8080"
import { hexDump, hexWord } from "common/format";
import { syntax8080 } from "common/cpu/i8080/syntax8080";
import { syntaxZ80 } from "common/cpu/z80/syntaxZ80";
import { getMemoryWord, Memory } from "common/memory/Memory";
import { ProcEmulator, runTo, toggleBreakpoint } from "common/cpu/ProcEmulator";
import { ArrowDownOutlined, ArrowUpOutlined, PauseCircleFilled, PauseCircleOutlined, PlayCircleOutlined, PlaySquareFilled, SearchOutlined, StepForwardOutlined } from "@ant-design/icons";
import { observer } from "mobx-react-lite";
import { DropdownEditor } from "../DropdownEditor";
import { isCondition80 } from "common/cpu/i8080/isCondition80";

type SyntaxId = "Intel" | "Zilog";

type PropsPureAsm80 = {
  comp: Computer;
  cpu: Proc8080;
  startAddr?: number;
  syntaxId?: SyntaxId;
  emulator: ProcEmulator;
}

const tmpBuf = new Uint8Array(3);
const syntaxOptions: SyntaxId[] = ["Intel", "Zilog"];

type DstPos = {
  dstAddr: number;
  dir: number;
}

export const PureAsm80: React.FC<PropsPureAsm80> = observer((props) => {
  const { comp, cpu, startAddr, syntaxId, emulator } = props;
  const { memory } = comp;
  const { opCodes, cmdMap, regs } = cpu;
  // Заглушка
  const [rows] = React.useState<AsmRow[]>(buildRows(cpu, comp.memory, 0xF800, 0x10000));

  const [curSyntaxId, setCurSyntaxId] = React.useState<SyntaxId>(syntaxId ?? "Intel");
  const syntax = curSyntaxId === "Zilog" ? syntaxZ80 : syntax8080;

  const [range, setRange] = React.useState<ListRange | undefined>();
  const [currentPC, setCurrentPC] = React.useState<number | undefined>();
  const [brkSum, setBrkSum] = React.useState(0);
  React.useEffect(() => {
    const h = setInterval(() => {
      const pc = emulator.running ? undefined : regs.getPC();
      setCurrentPC(pc);
      setBrkSum(Array.from(emulator.breakpoints).reduce((sum, addr) => sum + addr, 0));
    }, 200);
    return () => clearInterval(h);
  }, []);
  const refAddr = React.useRef<VirtuosoHandle>(null);
  const goToAddr = (dstAddr: number) => {
    const index = rows.findIndex(({addr}) => addr === dstAddr);
    if (index >= 0) {
      refAddr.current?.scrollToIndex(index);
    }
  }
  const rangeChanged = (range: ListRange) => {
    setRange(range);
  }
  const [dstPos, setDstPos] = React.useState<DstPos | null>(null);
  React.useEffect(() => {
    // Подсветка адреса перехода для текущей команды (jmp, jz, jnc, call, ret, ...)
    let newDstPos: DstPos | null = null;
    if (currentPC !== undefined) {
      let dstAddr = undefined;
      const curPos = currentPC; // regs.getPC();
      const opCode = memory.getByte(curPos);
      const cmdId = opCodes[opCode];
      if (cmdId === "jmp i16" || cmdId === "call i16") {
        dstAddr = getMemoryWord(memory, curPos + 1);
      } else if (cmdId === "jmp-con i16" || cmdId === "call-con i16") {
        if (isCondition80(regs.getFlags(), opCode)) {
          dstAddr = getMemoryWord(memory, curPos + 1);
        }
      } else if (cmdId === "ret") {
        const sp = regs.getSP();
        dstAddr = getMemoryWord(memory, sp);
      } else if (cmdId === "ret-con") {
        if (isCondition80(regs.getFlags(), opCode)) {
          const sp = regs.getSP();
          dstAddr = getMemoryWord(memory, sp);
        }
      }
      if (dstAddr) {
        const dir = dstAddr - curPos;
        newDstPos = {dstAddr, dir}
      }
    }
    setDstPos(newDstPos);

    if (range && currentPC) {
      const index = rows.findIndex(({addr}) => addr === currentPC);
      if (index < 0) {
        // Код вышел за пределы. Требуется перестроить rows
        return;
      }
      if (index < range.startIndex) {
        // Скролл вверх всегда устанавливает позицию на начало окна
        refAddr.current?.scrollToIndex(index);
        return;
      }
      if (index >= range.endIndex - 1) {
        const height = range.endIndex - range.startIndex;
        if (Math.abs(range.endIndex - index) < 5) {
          // Такой скролл хорошо подходит для пошагового выполнения: 
          // текущая строка доходит до низа окна и понемногу скорллирует вверх.
          const newStart = Math.max(0, index - height + 3);
          if (newStart !== range.startIndex) {
            refAddr.current?.scrollToIndex(newStart);
          }
        } else {
          // Если происходит скачок на большое расстояние, то лучше, чтобы текущая позиция была вверху. 
          refAddr.current?.scrollToIndex(index);
        }
        return;
      }
    }
  }, [currentPC]); // Не range. Иначе скроллирование становится невозможно.

  const tools = <>
    <Button
      size="small"
      icon={<PlayCircleOutlined />}
      title="Run"
      onClick={() => emulator.start()}
      disabled={emulator.running}
    />
    <Button
      size="small"
      icon={<PauseCircleOutlined />}
      title="Pause"
      onClick={() => emulator.pause()}
      disabled={!emulator.running}
    />
    <Button 
      size="small" 
      icon={<StepForwardOutlined />} 
      onClick={() => emulator.stepIn()}
      title="Step Into"
      disabled={emulator.running}
    />
    <div title="Syntax">
      <Radio.Group 
        size="small"
        optionType="button"
        buttonStyle="solid"
        options={syntaxOptions} 
        value={curSyntaxId} 
        onChange={e => setCurSyntaxId(e.target.value as SyntaxId)} 
      />
    </div>
    <DropdownEditor
      content={{
        type: "input",
        placeholder: "Hex addr",
        requiredMsg: "Addr required",
        pattern: /^[\dA-F]+$/i,
        maxLength: 4,
        rules: [{
          validator: (_, value) => {
            const dstAddr = parseInt(value, 16);
            if (rows.find(({addr}) => addr === dstAddr)) {
              return Promise.resolve();
            } else {
              return Promise.reject(Error("Адрес не в диапазоне. Или нет команды."));
            }
          }
        }],
        onOk(value) {
          goToAddr(parseInt(value, 16));
        },
      }}
    >
      <Button
        size="small"
        icon={<SearchOutlined />}
      />
    </DropdownEditor>
  </>;

  return (
    <Frame
      title={`CPU: ${cpu.name}`}
      tools={tools}
    >
      <Virtuoso<AsmRow>
        style={{height: "100%"}}
        ref={refAddr}
        data={rows}
        rangeChanged={rangeChanged}
        itemContent={(_, {addr, opCode, length}) => {
          const c0 = memory.getByte(addr);
          if (c0 !== opCode) {
            // Если произошла модификация кода...
            return <div className="mono">...</div>
          }
          tmpBuf[0] = c0;
          if (length > 1) tmpBuf[1] = memory.getByte(addr + 1);
          if (length > 2) tmpBuf[2] = memory.getByte(addr + 2);
          let opArgs = "";
          const cmdId = opCodes[c0];
          let opName = cmdId;
          if (opName) {
            const cmd = cmdMap[opName];
            if (cmd) {
              const [a, b] = cmd.params?.(tmpBuf, 0) ?? [];
              // @ts-ignore
              const asmCode = syntax[opName]?.(a, b);
              if (asmCode) {
                const res = /^([^\s]+)\s?(.+)?$/.exec(asmCode);
                if (res) {
                  opArgs = res[2] ?? "";
                  opName = res[1];
                }
              }
            } else {
              opName = "";
            }
          }
          const isCurrentPos = currentPC === addr;
          let jmpDir = 0;
          if (isCurrentPos && dstPos) {
            jmpDir = dstPos.dir;
          }
          if (!opName) {
            opName = "db";
            opArgs = syntax.i8(c0);
          }
          return (
            <div className={classNames([
                styles.row, 
                [isCurrentPos, styles.curCmd],
                [dstPos?.dstAddr === addr, styles.dstPos],
            ])}>
              <div
                className={classNames(["mono", styles.addr, [!emulator.running, styles.paused]])}
                onClick={() => {
                  if (!emulator.running) runTo(emulator, addr)
                }}
                title={emulator.running ? undefined : "Run to"}
              >
                {hexWord(addr)}
              </div>
              <div className={styles.break} title="Toggle breakpoint">
                {addr === emulator.tmpBreakpoint ? <div className={styles.tmp}>
                  <PlaySquareFilled />
                </div> : <div className={styles.point} onClick={() => toggleBreakpoint(emulator, addr)}>
                  {emulator.breakpoints.has(addr) && <PauseCircleFilled />}
                </div>}
              </div>
              <div className={classNames(["mono", styles.opCode])}>
                {hexDump(tmpBuf, "", length)}
              </div>
              <div className={classNames(["mono", styles.opName])} title={opCodes[c0] ?? undefined}>
                {opName}
              </div>
              <div className={classNames(["mono", styles.opArgs])}>
                {opArgs}
                {jmpDir < 0 && <ArrowUpOutlined />}
                {jmpDir > 0 && <ArrowDownOutlined />}
              </div>
            </div>
          )
        }}
      />
    </Frame>
  )
})

type AsmRow = {
  addr: number;
  opCode: number;
  length: number;
}

const buildRows = (cpu: Proc8080, memory: Memory, begin: number, end: number): AsmRow[] => {
  const rows: AsmRow[] = [];
  const {opCodes, cmdMap} = cpu;
  let addr = begin;
  while (addr < end) {
    const opCode = memory.getByte(addr);
    let length = 1;
    const opName = opCodes[opCode];
    if (opName) {
      const cmd = cmdMap[opName];
      if (cmd) {
        length = cmd.length;
      }
    }
    rows.push({addr, opCode, length});
    addr += length;
  }
  return rows;
}
