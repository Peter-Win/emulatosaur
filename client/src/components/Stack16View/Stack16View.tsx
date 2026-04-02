import * as React from "react";
import * as styles from "./Stack16View.module.less";
import { Frame } from "../Frame";
import { Stack16Store } from "./Stack16Store";
import { observer } from "mobx-react-lite";
import { Virtuoso, VirtuosoHandle } from "react-virtuoso";
import { hexWord } from "common/format";
import { getMemoryWord } from "common/memory/Memory";
import { classNames } from "src/utils/classNames";
import { Button } from "antd";
import { AimOutlined } from "@ant-design/icons";

type PropsStack16View = {
  store: Stack16Store;
}

const rangeSize = 0x200;
const footer = 10;
const inRange = (range: [number, number], pos: number): boolean => {
  return pos >= range[0] && pos < range[1] && ((pos - range[0]) & 1) === 0;
}

export const Stack16View: React.FC<PropsStack16View> = observer((props) => {
  const {store} = props;
  const {currentSP, memory} = store;
  const [prevSP, setPrevSP] = React.useState<number | null>(null);
  const [stackRange, setStackRange] = React.useState<[number, number]>([0, rangeSize]);
  const [visibleRange, setVisibleRange] = React.useState({startIndex: 0, endIndex: 0})
  const vRef = React.useRef<VirtuosoHandle>(null);
  const addr2index = (addr: number) => (addr - stackRange[0]) >> 1;
  const index2addr = (index: number) => stackRange[0] + index * 2;
  React.useEffect(() => {
    const h = setInterval(() => {
      setStackRange(prev => [...prev]);
    }, 300);
    return () => clearInterval(h);
  }, []);
  const resetPosition = (start: number) => {
    if (vRef.current && typeof currentSP === "number") {
      const curIndex = (currentSP - start) >> 1;
      const height = visibleRange.endIndex - visibleRange.startIndex;
      vRef.current.scrollToIndex(curIndex - (height >> 1));
    }
  }
  React.useEffect(() => {
    if (typeof currentSP === "number") {
      let start = stackRange[0];
      if (!inRange(stackRange, currentSP)) {
        start = Math.max(0, currentSP - rangeSize + footer);
        setStackRange([start, start + rangeSize]);
      }
      resetPosition(start);
    }
    setPrevSP(currentSP);
  }, [currentSP]);
  const tools = <>
    <Button 
      size="small" 
      icon={<AimOutlined />} 
      disabled={
        typeof currentSP !== "number" || 
        (currentSP >= index2addr(visibleRange.startIndex) && currentSP < index2addr(visibleRange.endIndex))
      }
      onClick={() => resetPosition(stackRange[0])}
      title="Show current stack position"
    />
  </>;
  return (
    <Frame title="Stack" tools={tools}>
      <Virtuoso
        totalCount={(stackRange[1] - stackRange[0])/2}
        style={{height: "100%"}}
        ref={vRef}
        rangeChanged={setVisibleRange}
        itemContent={(index) => {
          const addr = index2addr(index);
          return (
            <div className={classNames(["mono", styles.row, [addr === currentSP, styles.current]])}>
              {hexWord(addr)}: {hexWord(getMemoryWord(memory, addr))}
            </div>
          );
        }}
      />
    </Frame>
  )
})