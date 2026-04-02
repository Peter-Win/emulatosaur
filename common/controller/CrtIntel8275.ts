import { MemoryBlock } from "../memory/MemoryBlock";
/**
 * Intel 8275
 * Советский аналог - КР580ВГ75
 * https://bitsavers.org/components/intel/8275/1979_8275.pdf
 * Частота мигания равна частоте кадров, деленной на 32.
 */
export class CrtIntel8275 {
  onChange?: (cmd: Command) => void;

  get param(): number {
    // световое перо пока не поддерживается. А в других случаях чтение параметра не используется.
    return 0;
  }
  set param(value: number) {
    switch (this.curState) {
      case "reset1":
        this.spacedRows = (value >> 7) & 1;
        {
          const h = value & 0x7F;
          this.charsPerRow = (h >= 0 && h < 80) ? h + 1 : 0;
        }
        this.curState = "reset2";
        break;
      case "reset2":
        this.verticalRetraceRowCount = ((value >> 6) & 3) + 1;
        this.verticalRows = (value & 0x3F) + 1;
        this.curState = "reset3";
        break;
      case "reset3":
        this.underlinePlacement = ((value >> 4) & 0xF) + 1;
        this.linesPerChar = (value & 0xF) + 1;
        this.curState = "reset4";
        break;
      case "reset4":
        this.lineCounterMode = (value >> 7) & 1;
        this.fieldAttrMode = (value >> 6) & 1;
        this.cursorBlinking = (value >> 5) & 1;
        this.cursorFmt = (value >> 4) & 1;
        this.horizontalRetraceCount = ((value & 0xF) + 1) * 2;
        this.curState = null;
        this.onChange?.(Command.reset);
        break;
      case "cursorX":
        this.cursorX = value;
        this.curState = "cursorY";
        break;
      case "cursorY":
        this.cursorY = value;
        this.curState = null;
        this.onChange?.(Command.loadCursorPos);
        break;
      default:
        // параметр поступил, но нет команды, к которое его надо применить.
        this.badParams = true;
        break;
    }
  }

  get status(): number {
    let result = 0;
    // TODO: пока не все флаги. Вообще непонятно, будет ли в эмуляторе потеря данных в процессе ПДП. Или переполнение FIFO
    if (this.interruptsOn) result |= StatusReg.IE;
    if (this.displayOn) result |= StatusReg.VE;
    if (this.badParams) result |= StatusReg.IC;
    this.badParams = false;
    return result;
  }
  set command(value: number) {
    if (this.curState !== null) {
      // если состояние ненулевое, значит не все параметры были введены к моменту вызова следующей команды.
      this.badParams = true;
    }
    switch (value >> 5) {
      case Command.reset: // 0
        this.curState = "reset1";
        break;
      case Command.startDisplay: // 1
        this.displayOn = true;
        this.burstSpaceCode = ((value >> 2) & 7) * 8 - 1;
        this.burstCountCode = 1 << (value & 3);
        this.onChange?.(Command.startDisplay);
        break;
      case Command.stopDisplay: // 2
        this.displayOn = false;
        this.onChange?.(Command.stopDisplay);
        break;
      case Command.loadCursorPos:
        this.curState = "cursorX";
        break;
      case Command.enableInterrupt:
        this.interruptsOn = true;
        this.onChange?.(Command.enableInterrupt);
        break;
      case Command.disableInterrupt:
        this.interruptsOn = false;
        this.onChange?.(Command.disableInterrupt);
        break;
      case Command.presetCounters:
        this.onChange?.(Command.presetCounters);
        break;
      default:
        break;
    }

    
  }
  displayOn: boolean = false;
  interruptsOn: boolean = false;
  badParams: boolean = false;

  curState: State | null = null;
  spacedRows: SpacedRows = SpacedRows.normal;
  charsPerRow: number = 0; // поддерживаются значения: 1-80, 0 - невалидное
  verticalRetraceRowCount: number = 0; // Количество знакорядов на обратном ходе. валидные значения: 1-4
  verticalRows: number = 0; // Количество знакорядов в кадре 1-64
  underlinePlacement: number = 0; // Местоположение подчёркивания 1-16
  linesPerChar: number = 0; // Количество строк растра в знакоряде  1-16
  lineCounterMode: LineCounterMode = LineCounterMode.nonOffset;
  fieldAttrMode: FieldAttrMode = FieldAttrMode.transparent;
  cursorBlinking: Blinking = Blinking.blinking;
  cursorFmt: CursorFmt = CursorFmt.reverse;
  horizontalRetraceCount: number = 0; // количество знаков при обратном ходе строчной развёртки

  burstSpaceCode = 0; // Интервал между пакетными запросами ПДП
  burstCountCode = 0; // Количество запросов ПДП в пакете

  cursorX = 0;
  cursorY = 0;
}

enum StatusReg {
  IE = 0x40, // (Interrupt Enable) - устанавливается и сбрасывается после команд разрешения и запрета прерываний. Также устанавливается после команды разрешения отображения и сбрасывается после команды сброс.
  IR = 0x20, // (Interrupt Request) - этот флаг устанавливается в начале последней строки на экране при условии, что установлен флаг разрешения прерывания. Сбрасывается после чтения регистра статуса.
  LP = 0x10, // устанавливается, если на входе светового пера присутствует активный уровень и загружен регистр светового пера. Сбрасывается после чтения регистра статуса.
  IC = 0x08, // (Improper Command) - устанавливается, если количество параметров для команды велико или мало. Сбрасывается после чтения регистра статуса.
  VE = 0x04, // (Video Enable) - флаг показывает, что видеооперации с экраном разрешены. Устанавливается после команды разрешения отображения и сбрасывается после команды сброс.
  DU = 0x02, // (DMA Underrun) - флаг устанавливается при потере данных во время процесса ПДП. В этом случае процесс ПДП прерывается и экран затемняется после кадрового синхроимпульса. Сбрасывается после чтения регистра статуса.
  FO = 0x01, // (FIFO Overrun) - флаг устанавливается при переполнении буфера FIFO. Сбрасывается после чтения регистра статуса.
}

type State = "reset1" | "reset2" | "reset3" | "reset4" | "startDisplay" | "cursorX" | "cursorY";

// Старшие 3 бита команды (остальные используюься для параметров)
enum Command {
  reset = 0,
  startDisplay = 1,
  stopDisplay = 2,
  readLightPen = 3,
  loadCursorPos = 4,
  enableInterrupt = 5,
  disableInterrupt = 6,
  presetCounters = 7,
}
enum SpacedRows {
  normal = 0,
  spaced = 1,
}
enum LineCounterMode {
  nonOffset = 0, // Mode 0 is useful for character generators that leave address zero blank and start at address 1.
  offset1 = 1,  // Mode 1 is useful for character generators which start at address zero. 
}
enum FieldAttrMode {
  transparent = 0, 
  nonTransparent = 1,
}
export enum Blinking {
  blinking = 0,
  nonBlinking = 1,
}
export enum CursorFmt {
  reverse = 0,
  underline = 1,
}

export const createMemoryBlockCrtI8275 = (
  ctrl: CrtIntel8275, 
  begin: number, 
  end: number,
): MemoryBlock => ({
  begin,
  end,
  getByte: (addr: number) => {
    return ((addr & 1) === 0) ? ctrl.param : ctrl.status;
  },
  setByte: (addr: number, value: number) => {
    if ((addr & 1) === 0) {
      ctrl.param = value;
    } else {
      ctrl.command = value;
    }
  }, 
})