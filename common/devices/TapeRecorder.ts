import { hexWord } from "common/format";

export type TapeRecState = "none" | "startReading" | "writeSync" | "writeHeader" | "writeData";

// startReading - при чтении сначала выдавать несколько раз 0, а затем 1.
// Сценарий чтения
// Предполагается, что пользователь включает чтение с магнитофона и слышит тоновый сигнал.
// Нажимает ВК (при заранее введенной директиве I)

// Запись:
// 256 нулевых байтов
// Значение E6
// big-endian word - start address
// big-endian word - end address
// данные
// big-endian word - контрольная сумма

// writeSync - Пользователь как бы включает запись на магнитофоне и должен за короткое время ввести команду записи
//     Команда записи выдаёт 256 нулей и синхробайт E6. 
//     После его следует заголовок - два слова: начальный и конечный адрес
// writeHeader - происходит чтение заголовка (4 байта), их которого становится известен размер данных.
// writeData

// Первым пишется верхний бит

export type TapeFormat = {
  begin: number;
  end: number;
  data: Uint8Array;
  checkSum: number;
}


export class TapeRecorder {
  state: TapeRecState = "none";
  setState(newState: TapeRecState) {
    this.state = newState;
  }
  data: Uint8Array | null = null;
  setData(newData: Uint8Array | null) {
    this.data = newData;
  }
  curPos = 0;
  setCurPos(newPos: number) {
    this.curPos = newPos;
  }
  rightBitOffs = 0;

  readBit() {
    const {data, curPos, rightBitOffs} = this;
    if (!data) return 0;
    const curByte = data[curPos]!;
    // ... выясняем, в каком порядке записаны биты ...
    return 0;
  }

  allocateData(size: number) {
    this.data = new Uint8Array(size);
  }
  prepareToRead(income: Uint8Array) {
    this.setData(income);
    this.setState("startReading");
    this.setCurPos(0);
  }

  // Используется для прямого чтения в память, минуя системный монитор.
  static parseTapeData(tapeData: Uint8Array, offset = 0): TapeFormat {
    const begin = readWord(tapeData, offset);
    const end = readWord(tapeData, offset + 2);
    const size = end - begin;
    const dataOffset = offset + 4;
    const dataEnd = dataOffset + size;
    return {
      begin,
      end,
      data: tapeData.slice(dataOffset, dataEnd),
      checkSum: readWord(tapeData, dataEnd),
    }
  }
}

// В файлах RKM (ну или просто на ленте) word-значения заголовка хранятся в big-endian

const readWord = (buf: Uint8Array, pos: number): number => {
  const a = buf[pos]!;
  const b = buf[pos+1]!;
  return (a << 8) | b;
}

// Алгоритм взят из минитора Микроши. Пока не ясно, насколько он универсален.
export const calcCheckSumXor2 = (buf: Uint8Array, begin: number, end: number): number => {
  const res = new Uint8Array(2);
  let dstPos = 0;
  for (let srcPos = begin; srcPos < end; srcPos++) {
    res[dstPos]! ^= buf[srcPos]!;
    dstPos ^= 1;
  }
  return res[0]! | (res[1]! << 8);
}

export class TapeBitsReader {
  byte = 0;
  prevBit: number = 0;
  reset() {
    this.byte = 0;
    this.prevBit = 0;
  }
  readSyncBit(bit: number) {
    const {prevBit, byte} = this;
    let r = 0;
    if (prevBit === 0 && bit === 1) {
      r = 0;
    } else if (prevBit === 1 && bit === 0) {
      r = 1;
    } else {
      this.prevBit = bit;
      return;
    }
    this.prevBit = 2;
    this.byte = ((byte << 1) | r) & 0xFF;
  } 
  checkSyncByte(syncByte: number) {
    if (this.byte === syncByte) return 0;
    if (this.byte === (syncByte ^ 0xFF)) return 1;
    return -1;
  }

}