import * as React from "react";
import * as styles from "./RichAsm80.module.less";
import { observer } from "mobx-react-lite";
import { Button, Radio, Spin, Modal } from "antd";
import { RichAsm80Store } from "./RichAsm80Store";
import { Frame } from "../Frame";
import { AsmLine } from "common/asmListing/AsmLine";
import { ListRange, Virtuoso, VirtuosoHandle } from "react-virtuoso";
import { CodeLineState, RichAsm80Line, getCmdDef } from "./RichAsm80Line";
import { onError } from "src/utils/onError";
import { SyntaxId } from "common/SrcMap";
import { AimOutlined, ExclamationCircleFilled, ForwardOutlined, PauseCircleOutlined, SearchOutlined, StepForwardOutlined } from "@ant-design/icons";
import { DropdownEditor } from "../DropdownEditor";
import { hexWord, testHexWord } from "common/format";

const { confirm } = Modal;

type PropsRichAsm80 = {
  store: RichAsm80Store;
}

const syntaxOptions = [{value:"intel", label: "Intel"}, {value: "zilog", label: "Zilog"}];

export const RichAsm80: React.FC<PropsRichAsm80> = observer(({store}) => {
  const {cpu, buzy, syntaxId, visibleCodeBegin, emulator, currentPC, codeLines, codeAddrMap} = store;
  const refAddr = React.useRef<VirtuosoHandle>(null);
  const [range, setRange] = React.useState<ListRange | undefined>();
  const rangeChanged = (range: ListRange) => {
    setRange(range);
  }

  const [brkSum, setBrkSum] = React.useState(0); 
  const [flags, setFlags] = React.useState(0);
  React.useEffect(() => {
    const h = setInterval(() => {
      setFlags(cpu.regs.getFlags());
      setBrkSum(Array.from(emulator.breakpoints).reduce((sum, addr) => sum + addr, 0));
    }, 200);
    return () => clearInterval(h);
  }, []);

  const scrollUp = (index: number) => {
    refAddr.current?.scrollToIndex(Math.max(index-1, 0));
  }
  const addrInRange = (addr: number): boolean => {
    if (!range) return false;
    const minAddr = codeLines[range.startIndex]?.addr;
    const maxAddr = codeLines[range.endIndex]?.addr;
    return typeof minAddr === "number" && typeof maxAddr === "number" && addr >= minAddr && addr < maxAddr;
  }

  const curCmd = typeof currentPC === "number" ? getCmdDef(currentPC, store) : null;

  const labelOrAddrToIndex = (value: string) => {
    let i = store.labelsMap[value];
    if (typeof i !== "number" && /^[\dA-F]+$/i.test(value)) {
      const addr = parseInt(value, 16);
      i = store.codeAddrMap[addr];
    }
    return i;
  }

  const confirmGoToUnknownAddr = (addr: number) => {
    confirm({
      title: "Внимание!",
      icon: <ExclamationCircleFilled />,
      content: `По адресу ${hexWord(addr)} нет проиндексированного блока кода`,
      okText: "Построить",
      onOk() {
        store.buildUnknownCode(addr).catch(onError)
      },
    });
  };  

  const tools = <>
    <Button
      size="small"
      icon={<AimOutlined />}
      disabled={currentPC === null || !range || addrInRange(currentPC)}
      title="Show current code position"
      onClick={() => {
        if (currentPC !== null) {
          const i = codeAddrMap[currentPC];
          if (typeof i === "number") scrollUp(i)}
        }
      }
    />
    <Button
      size="small"
      icon={<ForwardOutlined />}
      disabled={emulator.running}
      onClick={() => emulator.start()}
      title="Play"
    />
    <Button
      size="small"
      icon={<PauseCircleOutlined />}
      disabled={!emulator.running}
      onClick={() => emulator.pause()}
      title="Pause"
    />
    <Button
      size="small"
      icon={<StepForwardOutlined />}
      disabled={emulator.running}
      onClick={() => emulator.stepIn()}
      title="Step into"
    />

    <div title="Syntax">
      <Radio.Group 
        size="small"
        optionType="button"
        buttonStyle="solid"
        options={syntaxOptions} 
        value={syntaxId} 
        onChange={e => store.setSyntaxId(e.target.value as SyntaxId)} 
      />
    </div>

    <DropdownEditor
      content={{
        type: "autocomplete",
        okText: "Go!",
        placeholder: "Hex addr or label",
        requiredMsg: "Addr or label required",
        rules: [{
          validator: (_, value) => {
            if (typeof labelOrAddrToIndex(value) === "number" || testHexWord(value) !== null ) {
              return Promise.resolve();
            } else {
              return Promise.reject(Error("Not found"));
            }
          }
        }],
        onSearch: (value) => Object.keys(store.labelsMap)
          .filter(s => s.startsWith(value))
          .map(label => ({label, value: label})),
        onOk: (value) => {
          const i = labelOrAddrToIndex(value);
          if (typeof i === "number") {
            // если есть индекс, то переходим
            scrollUp(i);
          } else {
            const addr = testHexWord(value);
            // если адрес, то нужно строить блок. Но предварительно уточнить
            if (addr !== null) {
              confirmGoToUnknownAddr(addr);
            }
          }
        }
      }}
    >
      <Button 
        size="small" 
        icon={<SearchOutlined />} 
        title="Go to address or label"
      />
    </DropdownEditor>
  </>;
  React.useEffect(() => {
    // Эта дорогостоящая функция. Её стоит запускать только если дебаггер виден.
    store.buildCodeLines().catch(onError)
  }, []);
  React.useEffect(() => {
    if (visibleCodeBegin !== null) {
      refAddr.current?.scrollToIndex(visibleCodeBegin);
      store.setVisibleCodeBegin(null);
    }
  }, [visibleCodeBegin]);
  const lineState = (line: AsmLine): CodeLineState |  undefined => {
    const altAddr = curCmd?.altAddr;
    if (line.addr === currentPC && line.type === "code") {
      return "current";
    } else if (altAddr && line.addr === altAddr && line.type === "code") {
      return "altAddr";
    }
    return undefined;
  }

  React.useEffect(() => {
    if (range && currentPC !== null) {
      const index = store.codeAddrMap[currentPC];
      if (typeof index !== "number") {
        // Код вышел за пределы. Требуется перестроить rows
        store.buildUnknownCode(currentPC).then(() => {
          const index2 = store.codeAddrMap[currentPC];
          if (typeof index2 === "number") {
            scrollUp(index2);
          }
        }).catch(onError);

        return;
      }
      if (index < range.startIndex) {
        // Скролл вверх всегда устанавливает позицию на начало окна
        scrollUp(index);
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
          // refAddr.current?.scrollToIndex(index);
          scrollUp(index);
        }
        return;
      }
    }
  }, [currentPC]); // Не range. Иначе скроллирование становится невозможно.

  return (
    <Frame title={`CPU: ${cpu.name}`} tools={tools}>
      <div className={styles.content}>
        <Virtuoso<AsmLine>
          style={{height: "100%"}}
          ref={refAddr}
          data={store.codeLines}
          rangeChanged={rangeChanged}
          itemContent={(_, line) => <RichAsm80Line line={line} store={store} lineState={lineState(line)} flags={flags} />}
        />
      </div>
      {buzy && <div className={styles.overlay}>
        <Spin size="large" />
      </div>}
    </Frame>
  )
})