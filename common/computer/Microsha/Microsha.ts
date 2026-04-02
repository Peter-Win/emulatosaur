import { Computer } from "../../Computer";
import { Proc8080 } from "../../cpu/i8080/Proc8080";
import { Memory } from "../../memory/Memory";
import { CompositeMemory } from "../../memory/CompositeMemory";
import { createMemoryBlockRAM } from "../../memory/MemoryBlockRAM";
import { createMemoryBlockROM } from "../../memory/MemoryBlockROM";
import { createMemoryBlockI8255, Intel8255 } from "../../controller/Intel8255";
import { createMemoryBlockCrtI8275, CrtIntel8275 } from "../../controller/CrtIntel8275";
import { microshaMonitor } from "./microshaMonitor";
import { MicroshaKeyboard } from "./MicroshaKeyboard";
import { hexByte } from "common/format";

export class Microsha implements Computer {
  memory: Memory;
  cpu: Proc8080;
  constructor() {
    this.cpu = new Proc8080({name: "КР580ВМ80А"});
    this.cpu.regs.setPC(this.startExecAddr)
    this.ctrlKbd = new Intel8255();
    this.ctrlIo = new Intel8255();
    this.ctrlVideo = new CrtIntel8275();
    this.memory = new CompositeMemory([
      createMemoryBlockRAM(0, 0x76D0),
      // 76D0 - 8000 Видеопамять
      createMemoryBlockRAM(0x76D0, 0x8000),
      // C000 - C800 Область контроллера клавиатуры КР580ВВ55А (D39)
      createMemoryBlockI8255(this.ctrlKbd, 0xC000, 0xC800),
      // C800 - D000 Область БИС периферийного адаптера КР580ВВ55А (D12)
      createMemoryBlockI8255(this.ctrlIo, 0xC800, 0xD000),
      // D000 - D800 Область БИС дисплейного контроллера КР580ВГ75 (D8)
      createMemoryBlockCrtI8275(this.ctrlVideo, 0xD000, 0xD800),
      // D800 - E000 Область БИС таймера КР580ВИ53 (D22)
      // F800 - 10000 - ПЗУ Системный Монитор
      createMemoryBlockROM(0xF800, microshaMonitor),
      // На запись 
      // F804 - регистр адреса канала 2 контроллера ПДП
      // F805 - регистр конца счёта канала 2
      // F808 - регистр управления
    ]);
    this.keyboard = new MicroshaKeyboard(this.ctrlKbd);
    this.ctrlIo.change.add((port) => {
      if (port === "B") console.log("IO PortB <-", hexByte(this.ctrlIo.b));
    });
    this.ctrlIo.beforeRead.add((port) => {
      if (port === "B") console.log("IO PortB =>", hexByte(this.ctrlIo.b));
    });
    // this.tapeRecorder = new TapeRecorderStore(this.memory);
  }
  startExecAddr = 0xF800;
  ctrlKbd: Intel8255;
  ctrlIo: Intel8255;
  ctrlVideo: CrtIntel8275;
  keyboard: MicroshaKeyboard;

  // tapeRecorder: TapeRecorderStore;

  step(): void {
    
  }
}

