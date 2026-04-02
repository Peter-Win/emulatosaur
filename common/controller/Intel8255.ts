/**
 * Intel 8255 = КР580ВВ55
 * электронный компонент, микросхема программируемого контроллера параллельного ввода-вывода. 
 * Микросхема позволяет адресовать шину данных по трём отдельным каналам, 
 * ещё один канал используется в качестве управляющего регистра микросхемы. 
 * 
 * Микросхема позволяет адресовать сигнал с шины данных на три внешних объекта с помощью 
 * трёх 8-разрядных каналов данных (PortA, PortB, PortC), которые могут работать как на вход, 
 * так и на выход. Режим работы каждого канала задаётся управляющим словом, которое подаётся 
 * в регистр устройства командой OUT. PortA и PortB в одно время могут работать либо на ввод, 
 * либо на вывод. PortC представлен как два 4-разрядных порта, и каждая его тетрада может 
 * независимо быть включена на ввод или на вывод. Помимо трёх 8-разрядных каналов данных, 
 * микросхема имеет 8-разрядный канал для подключения к шине данных, а также два адресных входа, 
 * позволяющих реализовать один из 4 адресов: выбор одного из трёх каналов данных или 
 * регистра устройства.
 * 
 * В старых версиях микросхемы, носивших название К580ИК55, чтение
 * из порта, запрограммированного на вывод, давало всегда  #FF.  В
 * современном варианте ВВ55 результатом считывания будет то,  что
 * было записано в регистр адаптера.
 */

import { MemoryBlock } from "../memory/MemoryBlock";

export enum CtrlWordMask {
  lowC = 0x01,  // 0-3 биты канала C, 0=вывод, 1=ввод
  B = 0x02,     // канал B, 0=вывод, 1=ввод
  Bmode = 0x04, // Режим канала B. Соответственно, 0 или 1.
  hiC = 0x08,   // // 4-7 биты канала C, 0=вывод, 1=ввод
  A = 0x10,     // канал A, 0=вывод, 1=ввод
  Amode = 0x60,
  d7 = 0x80,
}

export enum CtrlWordShift {
  B = 1,
  Bmode = 2,
  hiC = 3,
  A = 4,
  Amode = 5,
}

export class Intel8255 {
  a = 0;
  b = 0;
  c = 0;
  cw = CtrlWordMask.d7;
  get portA(): number {
    this.beforeRead.call("A");
    return this.a;
  }
  get portB(): number {
    this.beforeRead.call("B");
    return this.b;
  }
  get portC(): number {
    this.beforeRead.call("C");
    return this.c;
  }
  set portA(value: number) {
    this.a = value;
    this.change.call("A");
  }
  set portB(value: number) {
    this.b = value;
    this.change.call("B");
  }
  set portC(value: number) {
    if (this.cw & CtrlWordMask.lowC) {

    }
    this.c = value;
    this.change.call("C");
  }
  /**
   * Регистр управляющего слова. Только для записи.
   * значения определяются CtrlWordMask
   * В документации сказано, что бит d7 должен быть всегда 1. Но неизвестно, что будет, если нет.
   */
  set ctrlWord(value: number) {
    this.cw = value | CtrlWordMask.d7;
  }
  get ctrlWord(): number {
    return this.cw;
  }

  // Событие Change вызывается после изменения порта со стороны процессора.
  change = new I8255Listener();

  // Вызывается перед чтением со стороны процессора
  beforeRead = new I8255Listener();
}
export type I8255Port = "A" | "B" | "C";
type I8255Handler = (port: I8255Port) => void;

class I8255Listener {
  handlers: I8255Handler[] = [];
  add(handler: I8255Handler) {
    this.handlers.push(handler);
  }
  remove(handler: I8255Handler) {
    this.handlers = this.handlers.filter(it => it !== handler);
  }
  call(port: I8255Port) {
    this.handlers.forEach(handler => handler(port));
  }
}

/**
 * Доступ к контроллеру через специально выделенную область памяти. 
 * Используется в Микроше.
 */
export const createMemoryBlockI8255 = (
  ctrl: Intel8255, 
  begin: number, 
  end: number,
): MemoryBlock =>{
  return {
    begin,
    end,
    getByte(addr: number) {
      if (addr >= begin && addr < end) {
        const index = (addr - begin) % 4;
        switch (index) {
          case 0:
            return ctrl.portA;
          case 1:
            return ctrl.portB;
          case 2:
            return ctrl.portC;
          case 3:
            return ctrl.ctrlWord;
          default:
            break;
        }
      }
      return 0;
    },
    setByte(addr: number, value: number) {
      if (addr >= begin && addr < end) {
        const index = (addr - begin) % 4;
        switch (index) {
          case 0:
            ctrl.portA = value;
            break;
          case 1:
            ctrl.portB = value;
            break;
          case 2:
            ctrl.portC = value;
            break;
          case 3:
            ctrl.ctrlWord = value;
        }
      }
    },
  }
}
