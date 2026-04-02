import axios from "axios";
import { Memory } from "common/memory/Memory";
import { calcCheckSumXor2, TapeBitsReader, TapeRecorder } from "common/devices/TapeRecorder";
import { makeAutoObservable } from "mobx";
import { I8255Port, Intel8255 } from "common/controller/Intel8255";
import { onError } from "src/utils/onError";
import { delay } from "common/delay";
import { hexByte, hexDump, hexWord } from "common/format";
import { Proc8080 } from "common/cpu/i8080/Proc8080";

// Принцип хранения данных (протестировано на МИКРОШЕ)
// Каждый бит данных записывается в два импульса:
// - Первый импульс соответствует обратному значению. Т.е., если бит=0, то в первый импульс пишется 1.
// - Второй импульс соответствует нормальному значению. Т.е. значения двух импульсов для одного бита всегда противоположны.
// 
// Перед началом чтения выполняется синхронизация.
// Это значит, что сначала идут нулевые байты (256), а затем синхробайт E6.
// После распознавания синхробайта уже начинается чтение данных.

type TapeRecMode = "saveStart" | "loadStart";

interface BitReadStream {
  read(): Promise<number | null>;
  close(): void;
}

export class TapeRecorderStore {
  constructor(
    public recorder: TapeRecorder,
    public memory: Memory,
    public ctrl: Intel8255,
    public cpu: Proc8080,
  ) {
    makeAutoObservable(this);
  }

  mode: TapeRecMode | null = null;
  setMode(newMode: TapeRecMode | null) {
    this.mode = newMode;
  }

  async emulateRead(src: string, name: string) {
    const buf = await loadFile(src, name);
    // Эта часть выполняется уже после закрытия модалки
    this.postEmulateRead(buf).catch(onError);
  }

  async postEmulateRead(fileData: Uint8Array) {
    // Алгоритм чтения бита на МИКРОШЕ следующий:
    // ┌───┐   ┌───┐
    // │   │   │   │
    // ┘   └───┘   └───
    //   122333332223...
    // Компьютер начинает читать данные, когда магнитофон уже начал выдавать импульсы.
    // 1. Первый считанный бит считается эталоном.
    // 2. Затем компьютер продолжает читать, пока не получает противоположное значение. Оно сохраняется, как полученный бит.
    //    Если этого не происходит FFFF раз, то генерируется ошибка.
    // 3. Затем компьютер ждёт некоторое время (там есть ряд разных параметров, определяющих время для разных ситуаций)
    //    По истечении этого таймаута читается новое эталонное значение и переход к п.2
    // Если это сформулировать иначе, то получится:
    // (Номера фаз соответствуют XOR-маске бита. Поэтому сначала идёт фаза 1, затем 0)
    // Условно мы сначала попадаем в середину импульса (фаза 1) и ждем его окончения (переход в фазу 0).
    // В момент окончания импульса мы получаем значение читаемого бита.
    // Затем выполняется таймаут, чтобы пропустить данный импульс (в фазе 0) и снова начинаем читать и ждать окончания фазы 1.
    // Отсюда следует важный вывод:
    // Если окончание таймаута приходится не на фазу 1 следующего импульса, то всё дальнейшее чтение будет уже неправильным.
    // 
    // Для этого эмулятор выдаёт данные по следующему принципу
    // Фаза 1 длится не менее некоторого Δt (чтобы пропускать запросы от клавиатуры, пока пользователь вводит команду чтения)
    // Но как минимум одно чтение из порта С должно случиться. Если за отведённое время не случилось, то ждём.
    // Если истекает предел ожидания, то генерируется ошибка таймаута чтения.
    // Фаза 0 всегда заканчивается в момент чтения из порта С.

    const impulseDelay = 1;
    const timeoutLimit = 3000;
    const syncByte = 0xE6;
    const {ctrl} = this;
    const prefix: number[] = new Array(100);
    prefix.fill(0);
    prefix[prefix.length - 1] = syncByte;
    const buf = new Uint8Array([...prefix, ...Array.from(fileData)]);

    // Параметры битового чтения
    let bytePos = 0;
    let bitShift = 7;
    let phase = 1;
    let bitCallback: (() => void) | undefined;
    const next = () => {
      if (phase === 0) {
        if (--bitShift < 0) {
          bitShift = 7;
          bytePos++;
        }
      }
      phase ^= 1;
    }
    const onBit = (port: I8255Port) => {
      if (port === "C") {
        const byte = buf[bytePos] ?? 0;
        // каждый бит читается дважды. (меняясь на обратное значение)
        const bit = ((byte >> bitShift) & 1) ^ phase;
        // чтение с магнитофона происходит из бита 0x10 порта С
        ctrl.c = (ctrl.c & 0xEF) | (bit  << 4);
        if (phase === 0) {
          next();
        } else {
          bitCallback?.();
        }
      }
    }

    const store = this;
    const outBit = (): Promise<void> => new Promise((resolve, reject) => {
      let wait = true;
      const minTimer = setTimeout(() => {
        wait = false;
      }, impulseDelay);
      const maxTimer = setTimeout(() => {
        finish();
        reject(Error(msgReadTimeout));
      }, timeoutLimit);
      bitCallback = () => {
        if (!wait) {
          next();
          finish();
          resolve();
        }
      }
      const finish = () => {
        clearTimeout(minTimer);
        clearTimeout(maxTimer);
        bitCallback = undefined;
      }
      const bit = ((buf[bytePos] ?? 0) >> bitShift) & 1;
      store.setBeep(!bit);
    });

    try {
      ctrl.beforeRead.add(onBit);

      // ожидание чтения префикса, который оканчивается синхробайтом
      this.setWaitCounter(0);
      this.setWaitLimit(prefix.length);
      try {
        while (bytePos < prefix.length) {
          await outBit();
          this.setWaitCounter(bytePos);
        }
      } finally {
        this.setWaitCounter(0);
        this.setWaitLimit(0);
      }

      try {
        while (bytePos < buf.length) {
          this.setReadProgress([bytePos - prefix.length, fileData.length]);
          await outBit();
        }
      } finally {
        this.setReadProgress(null);
      }

    } finally {
      ctrl.beforeRead.remove(onBit);
      this.setBeep(null);
    }
  }

  async load(src: string, name: string): Promise<number> {
    const buf = await loadFile(src, name);
    const {begin, end, data} = TapeRecorder.parseTapeData(buf);

    // Не все файлы имеют формат с заголовком и контрольной суммой
    if (end < begin || end - begin + 7 !== buf.length) {
      throw Error("Формат файла не позволяет выполнить автоматическую загрузку");
    }

    let pos = 0;
    let dst = begin;
    while (dst <= end) {
      const byte = data[pos++]!;
      this.memory.setByte(dst, byte);
      dst++;
    }
    return begin;
  }

  get isLoadDisabled() {
    return this.waitCounter > 0;
  }
  get isSaveDisabled() {
    return this.waitCounter > 0;
  }

  // -- Параметры индикатора ожидания

  waitCounter = 0;
  setWaitCounter(n: number) {
    this.waitCounter = n;
  }
  waitLimit = 0;
  setWaitLimit(n: number) {
    this.waitLimit = n;
  }
  get waitPercent() {
    const {waitCounter, waitLimit} = this;
    if (!waitLimit) return 0;
    return 100 * waitCounter / waitLimit;
  }
  get waitFailed() {
    return this.waitCounter >= this.waitLimit;
  }

  writeCounter: number | null = null;
  setWriteCounter(count: number | null) {
    this.writeCounter = count;
  }
  readProgress: [number, number] | null = null;
  setReadProgress(pr: [number, number] | null) {
    this.readProgress = pr;
  }

  beep: boolean | null = null;
  setBeep(value: boolean | null) {
    this.beep = value;
  }
  

  wait(params: {
    ms: number;
    test(): boolean;
  }): Promise<void> {
    const {ms, test} = params;
    this.waitLimit = ms;
    this.waitCounter = 0;
    const step = 200;
    const stop = () => {
      this.setWaitLimit(0);
      this.setWaitCounter(0);
    }
    return new Promise((resolve, reject) => {
      const timer = setInterval(() => {
        if (test()) {
          clearInterval(timer);
          stop();
          resolve();
          return;
        }
        const counter = this.waitCounter + step;
        if (counter > this.waitLimit) {
          clearInterval(timer);
          setTimeout(() => {
            stop();
            reject(Error("За отведённое время ожидания запись не началась."));
          }, 300);
        }
        this.setWaitCounter(Math.min(counter, this.waitLimit));
      }, step);

    });
  }

  async directSave(fileName: string, begin: number, end: number) {
    const size = end - begin + 1;
    const buf = new Uint8Array(size + 6);
    let dstPos = 0;
    buf[dstPos++] = begin >> 8; // big-endian
    buf[dstPos++] = begin;
    buf[dstPos++] = end >> 8;
    buf[dstPos++] = end;
    for (let srcPos = begin; srcPos <= end; srcPos++) {
      buf[dstPos++] = this.memory.getByte(srcPos);
    }
    const sum = calcCheckSumXor2(buf, 4, 4+size);
    buf[dstPos++] = sum >> 8;
    buf[dstPos++] = sum;

    await axios.post("/api/saveFile", buf, {params: {name: fileName}});
  }

  async emulateSave(fileName: string) {
    // Когда пользователь нажимает кнопку записи, то у него есть некоторое время, чтобы ввести на клавиатуре Микроши команду записи
    // Это может быть директива О системного минитора, команда сохранения из бейсика MSAVE или из-какой-то ещё программы.     
    const stream = await this.waitForWriteSync();
    try {
      const readByte = async (): Promise<number | null> => {
        let result = 0;
        for (let i=0; i<8; i++) {
          const bit = await stream.read();
          if (bit === null) return null;
          result = (result << 1) | bit;
        }
        return result;
      }

      this.setWriteCounter(0);
      const output: number[] = [];
      for (;;) {
        const byte = await readByte();
        if (byte === null) break;
        output.push(byte);
        this.setWriteCounter(output.length);
      }
      this.setWriteCounter(output.length);
      const buf = new Uint8Array(output);
      await axios.post("/api/saveFile", buf, {params: {name: fileName}});
    } finally {
      this.setWriteCounter(null);
      stream.close();
    }
  }

  async waitForWriteSync(): Promise<BitReadStream> {
    const deltaTime = 200;
    const {ctrl} = this;
    this.setWaitLimit(10000);
    this.setWaitCounter(0);

    return new Promise((resolve, reject) => {
      // Здесь параллельно запускается два процесса - таймер и чтение из порта С
      // Если первым заканчивается таймер, то это ошибка.
      // Если успеваем найти синхробайт, то возвращается значение маски, с которой читать остальные биты
      const bitReader = new TapeBitsReader();
      const onTick = () => {
        this.setWaitCounter(this.waitCounter + deltaTime);
        if (this.waitFailed) {
          clearAll();
          reject(Error(msgWriteBeginTimeout))
        } else {
          timer = setTimeout(onTick, deltaTime);
        }
      }
      let timer = setTimeout(onTick, deltaTime)

      const onBit = (port: I8255Port) => {
        if (port === "C") {
          const bit = ctrl.c & 1;
          bitReader.readSyncBit(bit);
          const bitMask = bitReader.checkSyncByte(0xE6);
          if (bitMask >= 0) {
            console.log("FOUND SYNC *********");
            clearAll();
            resolve(createBitReadStream(ctrl, bitMask));
          }
        }
      }
      ctrl.change.add(onBit);
      const clearAll = () => {
        this.setWaitCounter(0);
        this.setWaitLimit(0);
        ctrl.change.remove(onBit);
        clearTimeout(timer);
      }
    });
  }
}

const msgWriteBeginTimeout = "За отведённое время ожидания запись не началась.";
const msgReadBeginTimeout = "За отведённое время ожидания чтение не началось.";
const msgReadTimeout = "Таймаут чтения с магнитофона";

const createBitReadStream = (ctrl: Intel8255, bitMask: number): BitReadStream => {
  const buffer: number[] = [];
  let bitHandler: undefined | (() => void);
  let index = 0;
  const onBit = (port: I8255Port) => {
    if (port === "C") {
      // 4000 = 0,1, 1,0, 0,1, 0,1
      // На каждый бит данных приходится два бита из порта С (противоположные друг другу)
      // Первый используем, второй игнорируем.
      if ((index & 1) === 0) {
        const bit = ctrl.c & 1;
        buffer.push(bit ^ bitMask);
        bitHandler?.();
      }
      index++;
    }
  }

  const readBit = (): Promise<number | null> => new Promise((resolve) => {
    // С точки зрения асинхронности Поступление битов происходит не по одному, а пачками.
    // Потому что выполнение кода процессором эмулируется в основном потоке и коллбэки портов вызываются тоже в основном потоке
    // А читать мы ходит по одному асинхронно.
    // Для этого поступающие биты складываются в очередь.
    // А затем в асинхронном режиме из этой очереди извлекаются.
    if (buffer.length > 0) {
      resolve(buffer.shift()!);
    } else {
      const timer = setTimeout(() => {
        finish();
        resolve(null);
      }, 3000);
      const finish = () => {
        clearTimeout(timer);
        bitHandler = undefined;
      }
      bitHandler = () => {
        finish();
        resolve(buffer.shift()!);
      }
    }
  });
  ctrl.change.add(onBit);
  return {
    read: () => readBit(),
    close: () => ctrl.change.remove(onBit),
  }
}

const loadFile = async (src: string, name: string): Promise<Uint8Array> => {
  const resp = await axios.get("/api/load", {
    responseType: "arraybuffer",
    params: {src, name}
  });
  return new Uint8Array(resp.data);  
}