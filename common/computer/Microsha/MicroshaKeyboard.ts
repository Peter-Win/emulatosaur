// ; Port C контроллера клавиатуры
// ; 01 = вывод на магнитофон
// ; 02 = управление динамической головкой
// ; 04 = управление таймером, также управляющего спикером
// ; 08 = светодиод РУС/ЛАТ
// ; 10 = ввод с магнитофона
// ; 20 = статус РУС/ЛАТ
// ; 40 = статус УС
// ; 80 = статус НР

// Опрос клавиатуры выполняется так:
// В порт В засылаются коды строк в формате 0111_1111, 1011_1111, 1101_1111, 1110_111, 1111_0111, ...
// В ответ из порта А приходит битовая карта, где нажатие кодируется 0, а 1 - это ненажатое состояние. 

// УС - управляющий символ
// НР - нижний регистр
// ГТ - горизонтальная табуляция (Tab)
// ПС - перевод строки
// ВК - возврат каретки (Enter)
// СТР - очищение экрана

// Раскладка
//  +1--+2--+3--+4--+5--+6--+7--+8--+9--+10-+11-+12-+13--+14---+      +57--+58--+59--+
//  | ; | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 0 | - | ГТ | АР2 |      | ┌  | F1 | F2 |
//  | + | ! | " | # |   | % | & |   | ( | ) |   | = |    |     |      |  \ |    |    |
//  +-15+-16+-17+-18+-19+-20+-21+-22+-23+-24+-25+-26+--27+--28-++     +60--+61--+62--+
//    | Й | Ц | У | К | Е | Н | Г | Ш | Щ | З | Х | : | ПС | ВК |     | ←- | ↑  | -→ |
//    | J | C | U | K | E | N | G | [ | ] | Z | H | * |    |    |     |    |    |    |
// +29--+30-+31-+32-+33-+34-+35-+36-+37-+38-+39-+40-+41-+42---+-+     +63--+64--+65--+
// | УС | Ф | Ы | В | А | П | Р | О | Л | Д | Ж | Э | . | РУС |       | F3 | F4 | F5 |
// |    | F | Y | W | A | P | R | O | L | D | V | \ | > | LAT |       |    |    |    |
// +--43+-44+-45+-46+-47+-48+-49+-50+-51+-52+-53+-54+-55+-----+       +66--+----+67--+
//   | НР | Я | Ч | С | М | И | Т | Ь | Б | Ю | , | / | Ъ |           |   ↓    | СТР |
//   |    | Q | ^ | S | M | I | T | X | B | @ | < | ? | _ |           +--------+-----+
//   +----+-56+---+---+---+---+---+---+---+---+---+---+---+
//         |                                    |
//         +------------------------------------+
// Разница между символами верхнего ряда = 10h
// У остальных - 20h
// Всего клавиш: 67 = 64 + 3 (РУС,УС,НР)
// ↖
// Матрица 8х8
//    0   1   2   3   4   5   6   7
//  +---+---+---+---+---+---+---+---+
// 0|spc| ↑ | 0 | 8 | @ | H | P | X |
//  +---+---+---+---+---+---+---+---+
// 1|АР2| ↓ | 1 | 9 | A | I | Q | Y |
//  +---+---+---+---+---+---+---+---+
// 2|Tab| ↖ | 2 | : | B | J | R | Z |
//  +---+---+---+---+---+---+---+---+
// 3| LF| F1| 3 | ; | C | K | S | [ |
//  +---+---+---+---+---+---+---+---+
// 4| CR| F2| 4 | < | D | L | T | \ |
//  +---+---+---+---+---+---+---+---+
// 5|СТР| F3| 5 | = | E | M | U | ] |
//  +---+---+---+---+---+---+---+---+
// 6|<- | F4| 6 | > | F | N | V | ^ |
//  +---+---+---+---+---+---+---+---+
// 7| ->| F5| 7 | ? | G | O | W | _ |
//  +---+---+---+---+---+---+---+---+

import {I8255Port, Intel8255} from "../../controller/Intel8255";

const setBit = (value: number, mask: number, flag: boolean): number => {
  return flag ? (value | mask) : (value & ~mask);
}

export enum MicroshaKeyFlag {
  rusLat = 0x20,
  us = 0x40,
  hp = 0x80,
  all = 0xE0,
  mask = 0x1F, // Биты всех флагов = 0, остальные = 1
}

export class MicroshaKeyboard {
  constructor(public ctrl: Intel8255) {
    this.matrix.fill(0);
    const onBeforeRead = (port: I8255Port) => {
      if (port === "A") {
        let result = 0xFF; // FF = никакая клавиша не нажата
        const i = this.currentRowIndex;
        if (i >= 0 && i < 8) {
          result = (~this.matrix[i]!) & 0xFF;
        }
        ctrl.a = result;
      } else if (port === "C") {
          let {c} = this.ctrl;
          c &= MicroshaKeyFlag.mask;
          c |= this.flags ^ MicroshaKeyFlag.all;
          this.ctrl.c = c;
      }
    }
    const onChange = (port: I8255Port) => {
      if (port === "B") {
        // В порт В пишется номер строки матрицы, которую будет затем читать порт А.
        // Номер поступает в формате ~80 = 7F = 7, ~40 = BF = 6, ~20 = DF = 5, ~10 = EF = 4 ...
        const rowMask = (~ctrl.b) & 0xFF;
        this.setCurrentRowIndex(maskToIndex(rowMask));
      } else if (port === "C") {
        this.setRusLED(!!(ctrl.c & 8));
      }
    }
    ctrl.beforeRead.add(onBeforeRead);
    ctrl.change.add(onChange);
  }

  // Приходит из порта В, используется при чтении порта А.
  currentRowIndex = -1;
  setCurrentRowIndex(n: number) {
    this.currentRowIndex = (n >= 0 && n < 8) ? n : -1;
  }

  // Здесь нажатое состояниее обзначается 1, а в порт А идёт инвертированное.
  matrix: number[] = new Array(8);

  // Эксклюзивная установка значения элемента матрицы (т.е. как будто нажата только одна клавиша, или ни одной).
  setMatrixValueEx(x: number, y: number, press: boolean) {
    this.matrix.fill(0);
    if (press && x>=0 && x<8 && y>=0 && y<8) {
      this.matrix[y] = 1 << x;
    }
  }
  setMatrixValue(x: number, y: number, press: boolean) {
    if (press !== this.isPressed(x, y)) {
      if (x>=0 && x<8 && y>=0 && y<8) {
        const mask = 1 << x;
        if (press) {
          this.matrix[y]! |= mask;
        } else {
          this.matrix[y]! &= ~mask;
        }
      }
    }
  }
  isPressed(x: number, y: number): boolean {
    if (x>=0 && x<8 && y>=0 && y<8) {
      return !!((this.matrix[y]! >> x) & 1)
    }
    return false;
  }

  flags: number = 0;
  setFlags(newFlags: number) {
    this.flags = newFlags;
  }
  changeFlag(flag: MicroshaKeyFlag, press: boolean) {
    this.setFlags(setBit(this.flags, flag, press));
  }


  get rusLat() {
    return !!(this.flags & MicroshaKeyFlag.rusLat);
  }
  setRusLat(press: boolean) {
    this.changeFlag(MicroshaKeyFlag.rusLat, press);
  }

  get us() {
    return !!(this.flags & MicroshaKeyFlag.us);
  }
  setUs(press: boolean) {
    this.changeFlag(MicroshaKeyFlag.us, press);
  }

  get hp() {
    return !!(this.flags & MicroshaKeyFlag.hp);
  }
  setHp(press: boolean) {
    this.changeFlag(MicroshaKeyFlag.hp, press);
  }

  rusLED = false;
  setRusLED(value: boolean) {
    this.rusLED = value;
  }
}

const maskToIndex = (mask: number): number => {
  for (let shift = 7; shift >=0; shift--) {
    if (mask === 1 << shift) return shift;
  }
  return -1;
}