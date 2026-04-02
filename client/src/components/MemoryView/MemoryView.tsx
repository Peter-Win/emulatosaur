import * as React from "react";
import * as styles from "./MemoryView.module.less";
import { Memory } from "common/memory/Memory";
import { CharsetName, charsets } from "common/charset";
import { hexByte, hexWord } from "common/format"
import { Virtuoso, VirtuosoHandle } from "react-virtuoso";
import { Frame } from "../Frame";
import { Button, Select } from "antd";
import { SearchOutlined, TranslationOutlined } from "@ant-design/icons";
import { DropdownEditor } from "../DropdownEditor";

type PropsMemoryView = {
  memory: Memory;
  defaultCharset?: CharsetName;
  startAddr?: number;
}

export const MemoryView: React.FC<PropsMemoryView> = (props) => {
  const addr2index = (addr: number) => addr >> 4;
  const index2addr = (index: number) => index << 4;
  const rowLength = 16;

  const {memory, defaultCharset, startAddr} = props;
  const rowsCount = addr2index(memory.size + 15);
  const startIndex = typeof startAddr === "number" ? addr2index(startAddr) : 0;
  const refMemory = React.useRef<VirtuosoHandle>(null);
  const goToAddr = (addr: number) => {
    refMemory.current?.scrollToIndex(addr2index(addr))
  }
  const [charsetName, setCharsetName] = React.useState(defaultCharset);
  const charset = charsetName ? charsets[charsetName] : undefined;

  // Так как содержимое памяти может меняться, то содержимое надо перерисовывать.
  // По-хорошему надо было бы считать контрольную сумму в range и обновлять в случае изменения.
  // Но пока тупо раз в 2 секунды.
  const [data, setData] = React.useState([]);
  React.useEffect(() => {
    const h = setInterval(() => setData([]), 2000);
    return () => clearInterval(h);
  }, []);
  
  const tools = <>
    <Select
      prefix={<TranslationOutlined />}
      size="small"
      options={Object.keys(charsets).map(value => ({value, label: value}))}
      style={{width: "10em"}}
      title="Charset"
      value={charsetName}
      onChange={(value) => {
        setCharsetName(value);
      }}
    />
    <DropdownEditor
      content={{
        type: "input",
        onOk: (addr) => {
          if (addr) goToAddr(parseInt(addr, 16));
        },
        pattern: /^[\dA-F]{1,4}$/i,
        patternMsg: "hex required",
        maxLength: 4,
        okText: "Go!",
        placeholder: "Hex addr",
      }}
    >
      <Button size="small" icon={<SearchOutlined />} type="text" />
    </DropdownEditor>
  </>
  return (
    <Frame title="Memory" tools={tools}>
    <Virtuoso 
      ref={refMemory}
      style={{height: "100%"}} 
      totalCount={rowsCount}
      initialTopMostItemIndex={startIndex}
      itemContent={(index) => {
        const start = index2addr(index);
        return <div className={styles.row}>
          <span className="mono">{hexWord(start)}</span>
          <span className="mono">{dump(memory, start, start + rowLength)}</span>
          {charset && <span className="mono">
            {textRow(charset, memory, start, start + rowLength)}
          </span>}
        </div>
      }}
    />
    </Frame>
  );
}

const dump = (memory: Memory, from: number, to: number): string => {
  let res: string = "";
  for (let pos = from; pos < to; pos++) {
    res += hexByte(memory.getByte(pos));
    res += " ";
  }
  return res;
}

const textRow = (charset: string[], memory: Memory, from: number, to: number): string => {
  let res: string = "";
  for (let pos = from; pos < to; pos++) {
    let char = charset[memory.getByte(pos)];
    if (char === " ") char = "\u00A0";
    res += char ?? "·";
  }
  return res;
}
