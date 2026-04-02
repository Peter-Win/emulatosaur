import * as React from "react";
import * as styles from "./MicroshaKeyboardView.module.less";
import { Frame } from "../../../Frame";
import { MicroshaKeyboard, MicroshaKeyFlag } from "common/computer/Microsha/MicroshaKeyboard";
import { classNames } from "src/utils/classNames";
import { ArrowDownOutlined, ArrowLeftOutlined, ArrowRightOutlined, ArrowUpOutlined } from "@ant-design/icons";
import { Radio, RadioChangeEvent } from "antd";
import { makeAutoObservable } from "mobx";
import { observer } from "mobx-react-lite";

type PropsMicroshaKeyboardView = {
  kbd: MicroshaKeyboard;
}

type Mode = "mouse" | "debug" | "hardKbd" | "smartKbd";

class KbdStore {
  constructor() {
    makeAutoObservable(this);
  }
  mode: Mode = "mouse";
  setMode(newMode: Mode) {
    this.mode = newMode;
  }
  pressed = new Set<number>();
  clear() {
    this.pressed.clear();
  }
  press(keyCode: number) {
    this.pressed.add(keyCode);
  }
  release(keyCode: number) {
    this.pressed.delete(keyCode);
  }
}

type Ctx = {
  kbd: MicroshaKeyboard;
  store: KbdStore;
}

export const MicroshaKeyboardView: React.FC<PropsMicroshaKeyboardView> = (props) => {
  const { kbd } = props;
  const store = React.useMemo(() => new KbdStore(), []);
  const {mode} = store;
  const [status, setStatus] = React.useState(false);
  const ctx: Ctx = {kbd, store};
  React.useEffect(() => {
    const h = setInterval(() => {
      setStatus(prev => !prev);
    }, 100);
    return () => clearInterval(h);
  }, []);
  React.useEffect(() => {
    if (mode === "hardKbd") {
      const onKeyUp = (e: KeyboardEvent) => {
        console.log("keyup", e.key, e.code, e.keyCode);
        e.stopPropagation();
        e.preventDefault();
        store.release(e.keyCode);
      }
      const onKeyDown = (e: KeyboardEvent) => {
        console.log("keydown", e.key, e.code, e.keyCode);
        e.stopPropagation();
        e.preventDefault();
        store.press(e.keyCode);
      }
      window.addEventListener("keyup", onKeyUp);
      window.addEventListener("keydown", onKeyDown);
      return () => {
        window.removeEventListener("keyup", onKeyUp);
        window.removeEventListener("keydown", onKeyDown);
      }
    }
    store.clear();
    return;
  }, [store.mode]);
  const onModeChange = (e: RadioChangeEvent) => {
    store.setMode(e.target.value as Mode);
    // @ts-ignore
    e.target?.blur?.(); // Иначе нажимаемые клавиши влияют на компонент переключения режимов
  }
  const tools = <>
    <Radio.Group buttonStyle="solid" size="small" value={mode} onChange={onModeChange}>
      <Radio.Button value="mouse" title="Стандартный режим. Клавиши виртуальной клавиатуры кликаются мышью">Mouse</Radio.Button>
      <Radio.Button value="debug" title="Отладочный режим. Первый клик мыши нажимает, второй - отпускает">Debug</Radio.Button>
      <Radio.Button value="hardKbd" title="Присоединение реальной клавиатуры по принципу: одна виртуальная клавиша соответствует одной реальной">Keyboard</Radio.Button>
      {/* <Radio.Button value="smartKbd" title="Реальные клавиши напрямую генерируют нужные символы">KeyText</Radio.Button> */}
    </Radio.Group>
  </>;
  return (
    <Frame title="МИКРОША" tools={tools}>
      <div className={styles.keyboardBox}>
        <div className={styles.leftPart}>
          <div className={styles.row}>
            <Key text={";\n+"} ctx={ctx} x={3} y={3} keyCode={192} tip="~" />
            <Key text={"1\n!"} ctx={ctx} x={2} y={1} keyCode={0x31} tip="1" />
            <Key text={`2\n"`} ctx={ctx} x={2} y={2} keyCode={0x32} tip="2" />
            <Key text={"3\n#"} ctx={ctx} x={2} y={3} keyCode={0x33} tip="3" />
            <Key text={"4\n$"} ctx={ctx} x={2} y={4} keyCode={0x34} tip="4" />
            <Key text={"5\n%"} ctx={ctx} x={2} y={5} keyCode={0x35} tip="5" />
            <Key text={"6\n&"} ctx={ctx} x={2} y={6} keyCode={0x36} tip="6" />
            <Key text={"7\n'"} ctx={ctx} x={2} y={7} keyCode={0x37} tip="7" />
            <Key text={"8\n("} ctx={ctx} x={3} y={0} keyCode={0x38} tip="8" />
            <Key text={"9\n)"} ctx={ctx} x={3} y={1} keyCode={0x39} tip="9" />
            <Key text={"0\n "} ctx={ctx} x={2} y={0} keyCode={0x30} tip="0" />
            <Key text={"-\n="} ctx={ctx} x={3} y={5} keyCode={187} tip="=" />
            <Key text={"ГТ"} red ctx={ctx} x={0} y={2} keyCode={9} tip="Tab" />
            <Key text={"АР2"} red ctx={ctx} x={0} y={1} cls={styles.widthExt} keyCode={8} tip="Backspace" />
          </div>
          <div className={styles.row}>
            <Offset />
            <Key text={"Й\nJ"} ctx={ctx} x={5} y={2} keyCode={74} tip="J" />
            <Key text={"Ц\nC"} ctx={ctx} x={4} y={3} keyCode={67} tip="C" />
            <Key text={"У\nU"} ctx={ctx} x={6} y={5} keyCode={85} tip="U" />
            <Key text={"К\nK"} ctx={ctx} x={5} y={3} keyCode={75} tip="K" />
            <Key text={"Е\nE"} ctx={ctx} x={4} y={5} keyCode={69} tip="E" />
            <Key text={"Н\nN"} ctx={ctx} x={5} y={6} keyCode={78} tip="N" />
            <Key text={"Г\nG"} ctx={ctx} x={4} y={7} keyCode={71} tip="G" />
            <Key text={"Ш\n["} ctx={ctx} x={7} y={3} keyCode={219} tip="[" />
            <Key text={"Щ\n]"} ctx={ctx} x={7} y={5} keyCode={221} tip="]" />
            <Key text={"З\nZ"} ctx={ctx} x={7} y={2} keyCode={90} tip="Z" />
            <Key text={"Х\nH"} ctx={ctx} x={5} y={0} keyCode={72} tip="H" />
            <Key text={":\n*"} ctx={ctx} x={3} y={2} keyCode={186} tip=":" />
            <Key text="ПС" red ctx={ctx} x={0} y={3} keyCode={34} tip="PgDown" />
            <Key text="ВК" red ctx={ctx} x={0} y={4} cls={styles.widthExt} keyCode={13} tip="Enter" />
          </div>
          <div className={styles.row}>
            <CtrlKey text="УС" ctx={ctx} flag={MicroshaKeyFlag.us} tip="Ctrl" keyCode={17} />
            <Key text={"Ф\nF"} ctx={ctx} x={4} y={6} keyCode={70} tip="F" />
            <Key text={"Ы\nY"} ctx={ctx} x={7} y={1} keyCode={89} tip="Y" />
            <Key text={"В\nW"} ctx={ctx} x={6} y={7} keyCode={87} tip="W" />
            <Key text={"А\nA"} ctx={ctx} x={4} y={1} keyCode={65} tip="A" />
            <Key text={"П\nP"} ctx={ctx} x={6} y={0} keyCode={80} tip="P" />
            <Key text={"Р\nR"} ctx={ctx} x={6} y={2} keyCode={82} tip="R" />
            <Key text={"О\nO"} ctx={ctx} x={5} y={7} keyCode={79} tip="O" />
            <Key text={"Л\nL"} ctx={ctx} x={5} y={4} keyCode={76} tip="L" />
            <Key text={"Д\nD"} ctx={ctx} x={4} y={4} keyCode={68} tip="D" />
            <Key text={"Ж\nV"} ctx={ctx} x={6} y={6} keyCode={86} tip="V" />
            <Key text={"Э\n\\"} ctx={ctx} x={7} y={4} keyCode={220} tip="\" />
            <Key text={".\n>"} ctx={ctx} x={3} y={6} keyCode={190} tip="." />
            <CtrlKey 
              text={"РУС\nLAT"} 
              ctx={ctx} 
              flag={MicroshaKeyFlag.rusLat} 
              tip="Insert" 
              keyCode={45} 
              cls={styles.widthExt} 
            />
          </div>
          <div className={styles.row}>
            <Offset />
            <CtrlKey text="НР" ctx={ctx} flag={MicroshaKeyFlag.hp} tip="Shift" keyCode={16} />
            <Key text={"Я\nQ"} ctx={ctx} x={6} y={1} keyCode={81} tip="Q" />
            <Key text={"Ч\n^"} ctx={ctx} x={7} y={6} keyCode={46} tip="Delete" />
            <Key text={"С\nS"} ctx={ctx} x={6} y={3} keyCode={83} tip="S" />
            <Key text={"М\nM"} ctx={ctx} x={5} y={5} keyCode={77} tip="M" />
            <Key text={"И\nI"} ctx={ctx} x={5} y={1} keyCode={73} tip="I" />
            <Key text={"Т\nT"} ctx={ctx} x={6} y={4} keyCode={84} tip="T" />
            <Key text={"Ь\nX"} ctx={ctx} x={7} y={0} keyCode={88} tip="X" />
            <Key text={"Б\nB"} ctx={ctx} x={4} y={2} keyCode={66} tip="B" />
            <Key text={"Ю\n@"} ctx={ctx} x={4} y={0} keyCode={117} tip="F6" />
            <Key text={",\n<"} ctx={ctx} x={3} y={4} keyCode={188} tip="," />
            <Key text={"/\n?"} ctx={ctx} x={3} y={7} keyCode={191} tip="/" />
            <Key text={"Ъ\n_"} ctx={ctx} x={7} y={7} keyCode={189} tip="_" />
          </div>
          <Key text=" " ctx={ctx} x={0} y={0} cls={styles.space} keyCode={32} tip="Space" />
        </div>
        <div className={styles.middle}>
          <div className={styles.rus}>РУС</div>
          <div className={classNames([styles.led, [kbd.rusLED, styles.active]])}></div>
        </div>
        <div className={styles.rightPart}>
          <div className={styles.row}>
            <Key text={<ArrowUpOutlined rotate={-45} />} ctx={ctx} x={1} y={2} keyCode={36} tip="Home" />
            <Key text="F1" red ctx={ctx} x={1} y={3} keyCode={112} tip="F1" />
            <Key text="F2" red ctx={ctx} x={1} y={4} keyCode={113} tip="F2" />
          </div>
          <div className={styles.row}>
            <Key text={<ArrowLeftOutlined />} ctx={ctx} x={0} y={6} keyCode={37} tip="Left" />
            <Key text={<ArrowUpOutlined />} ctx={ctx} x={1} y={0} keyCode={38} tip="Up" />
            <Key text={<ArrowRightOutlined />} ctx={ctx} x={0} y={7} keyCode={39} tip="Right" />
          </div>
          <div className={styles.row}>
            <Key text="F3" red ctx={ctx} x={1} y={5} keyCode={114} tip="F3" />
            <Key text="F4" red ctx={ctx} x={1} y={6} keyCode={115} tip="F4" />
            <Key text="F5" red ctx={ctx} x={1} y={7} keyCode={116} tip="F5" />
          </div>
          <div className={styles.row}>
            <Key text={<ArrowDownOutlined />} ctx={ctx} x={1} y={1} cls={styles.widthDouble} keyCode={40} tip="Down" />
            <Key text="СТР" red ctx={ctx} x={0} y={5} keyCode={33} tip="PgUp"  />
          </div>
        </div>
      </div>
    </Frame>
  )
}

type PropsOffset = {
  cls?: string;
}
const Offset: React.FC<PropsOffset> = ({cls = styles.widthHalf}) => (
  <div className={cls} />
)

const mkText = (text: React.ReactNode): React.ReactNode => {
  if (typeof text !== "string") return text;
  const k = text.indexOf("\n");
  if (k<0) return <span>{text}</span>;
  return <>
    <span>{text.slice(0, k)}</span>
    <span>{text.slice(k+1)}</span>
  </>;
}

const keyHandle = (params: {
  store: KbdStore;
  keyCode: number | undefined;
  toggle: () => void;
  kbPressed: () => boolean;
  kbChange: (press: boolean) => void;
}) => {
  const {store, keyCode, toggle, kbPressed, kbChange} = params;
  if (store.mode === "debug") {
    toggle();
    if (keyCode) {
      if (kbPressed()) store.press(keyCode); else store.release(keyCode);
    }
  } else {
    kbChange(true);
    setTimeout(() => kbChange(false), 100);
  }

}

type PropsKey = {
  cls?: string;
  red?: boolean;
  text: React.ReactNode;
  x: number;
  y: number;
  ctx: Ctx;
  keyCode?: number;
  tip?: string;
}
const Key: React.FC<PropsKey> = observer((props) => {
  const {cls, red, text, ctx: {kbd, store}, x, y, keyCode, tip} = props;
  const onClick = () => {
    keyHandle({
      store, 
      keyCode,
      toggle: () => kbd.setMatrixValue(x, y, !kbd.isPressed(x, y)),
      kbPressed: () => kbd.isPressed(x, y),
      kbChange: (press) => kbd.setMatrixValueEx(x, y, press),
    });
  }
  const pressed: boolean = !!keyCode && store.pressed.has(keyCode);
  const title = store.mode === "hardKbd" ? tip : undefined;
  React.useEffect(() => {
    kbd.setMatrixValue(x, y, pressed);
  }, [pressed]);
  return (
    <button 
      type="button"
      className={classNames([
        styles.keyStd, 
        cls, 
        [!!red, styles.red],
        [pressed, styles.pressed]
      ])}
      onClick={onClick}
      title={title}
    >
      {mkText(text)}
    </button>
  );
});

type PropsCtrlKey = {
  text: string;
  ctx: Ctx;
  flag: MicroshaKeyFlag;
  tip: string;
  cls?: string;
  keyCode?: number;
}
const CtrlKey: React.FC<PropsCtrlKey> = (props) => {
  const {ctx: {kbd, store}, flag, text, tip, cls, keyCode} = props;
  const {mode} = store;
  const pressed = !!(kbd.flags & flag);
  
  const onClick = () => {
    if (flag === MicroshaKeyFlag.rusLat) {
      keyHandle({
        store,
        keyCode,
        toggle: () => kbd.setRusLat(!kbd.rusLat),
        kbPressed: () => kbd.rusLat,
        kbChange: (pressed) => kbd.setRusLat(pressed),
      });
    } else {
      kbd.changeFlag(flag, !pressed);
    }
  }

  if (mode === "hardKbd" && keyCode) {
    kbd.changeFlag(flag, store.pressed.has(keyCode));
  }

  const title = mode === "hardKbd" ? tip : undefined;

  return (
    <button
      type="button"
      className={classNames([styles.keyStd, styles.red, [pressed, styles.pressed], cls])}
      onClick={onClick}
      title={title}
    >
      {mkText(text)}
    </button>
  )
}