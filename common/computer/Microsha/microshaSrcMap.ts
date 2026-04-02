export const microshaSrcMap = `
org F800
syntax intel
charset МИКРОША

7600
  videoMemCurPos:
  ; Начало области RAM, которая используется монитором
  ; Адрес видеопамяти, соответствующий текущему положению курсора
7602
  cursorCoordinates:
  ; Координаты курсора. Low byte = X, High byte = Y
  ; Логический x=0 соответствует аппаратному x=8, а логич. y=0 => апп. y=3
7604
  escMode:
7605
  pressFlag:
  ; Признак нажатой клавиши.
  ; Возможны два значения: FF, если клавиша нажата. 0, если нет.
  ; Устанавливается внутри isKeyPressed, сбрасывается в readKey.
7606
  pressDelayCounter:
  ; Счётчик ожидания между выводом одинаковых символов при залипшей клавише.
  ; При первом срабатывании устанавливается в 80h, при повторе - 8.
7607
  kbdCurLang:
  ; 00 = LAT, FF = RUS
7608
  keySoundFlag:
  ; Если 0, то выдаётся звуковой сигнал при залипшей клавише (когда начинается повторение вывода)
  ; Устанавливается в 0 при старте.
7609
  kbdCounter:
760A
  lastKeyCode:
760B
  lastKbdStatus:
760C
  wStackPos:
7613
  regValues:
  ; 6 word-значений для регистров PC, HL, BC, DE, AF, SP
7615
  regValueHL:
7617
  regValueBC:
7619
  regValueDE:
761B
  regValueAF:
761D
  regValueSP:
761F
  regValuesEnd:
7624
  procFinalAddr:
  ; Адрес завершения программы, запускаемой директивой G (если указан)
7626
  savedFinalCode:
  ; Сохранённый код по адресу завершения.
7627
  userProgStart:
  ; Выполняемый код начала пользовательской программы, запускаемой директивой G
  ; Содержит C3 - код команды JMP. А адрес перехода получается в параметре 1.
7628
  wordParam1:
  ;; Числовое значение первого аргумента командной строки
762A
  wordParam2:
  ;; Числовое значение второго аргумента командной строки
762C
  wordParam3:
  ;; Числовое значение третьего аргумента командной строки
762E
  dataMask:
  ;; используется в процедуре loadByte
762F
  tapeParam1:
7630
  tapeParam2:
7631
  tapeParam3:
7632
  tapeParam4:
7633
  errHandler:
  ; Код, который выполняется при загрузке данных
7634
  errHandlerAddr:
7636
  cmdLine:

76CF
  stackEnd:
C000
  kbdPortA:
C001
  kbdPortB:
C002
  kbdPortC:
  ; Port C контроллера клавиатуры
  ; 01 = вывод на магнитофон
  ; 02 = управление динамической головкой
  ; 04 = управление таймером, также управляющего спикером
  ; 08 = светодиод РУС/ЛАТ
  ; 10 = ввод с магнитофона
  ; 20 = статус РУС/ЛАТ
  ; 40 = статус УС
  ; 80 = статус НР
C003
  kbdState:
C800
  io2PortA:
C801
  io2PortB:
C802
  io2PortC:
C803
  io2State:

D000
  videoCtrl:
D001
  videoCtrlParam:

D800
  timerCounter0:
D801
  timerCounter1:
D802
  timerCounter2:
D803
  timerState:

F800
  sysStart:
  entry
  ; Start of SYSTEM MONITOR
  ; Executed when the Reset button is pressed.

F803
  sysReadKey:
  entry
  ; Entering a character from the keyboard
  ; The code of the pressed key is placed in register A.

F806
  sysLoadByte:
  entry
  ; Input of one byte from a tape recorder
  ; Input parameters: If the accumulator contains 08, then the load is performed without searching for the sync byte. 
  ; If it contains FF, then the load is performed with searching for the sync byte.
  ; The result is loaded into the accumulator.

F808
  =dmaCtrl:
F804
  =dmaCtrl2:
F805
  =dmaCtrlEnd:

F809
  sysOutChar:
  entry
  ; Displaying a symbol on the screen
  ; The code of the output character in the C register

F80F
  sysOutChar2:
  entry

F80C
  sysSaveByte:
  entry
  ; Recording a byte on a tape recorder
  ; The code of the output character in the C register

F812
  sysIsKeyPressed:
  entry
  ; Poll the keyboard status
  ; A = 0 - not pressed, FF - pressed

F815
  sysOutHex:
  entry
  ; Display a byte on the screen in hexadecimal form
  ; The output byte is placed into the accumulator.

F818
  sysOutMsg:
  entry
  ; Print a zero-terminated string to the screen.
  ; HL = start address of the message/

F81B
  start:
F81D
  ;; 1.00.11000. C:0:3=out, B=out, C:4:7=in, A=in, Bmode,Amode=0=simple I/O

F82E
  use addr
F835
  use addr
  ; Выдача команды Сброс видеоконтроллера с параметрами 4D 1D 99 93
F83B
  ; SHHHHHHH, S = 0 - Нормальные знакоряды, H=77 - 78 знаков в ряду.
F83D
  ; VVRRRRRR, V=00 - Количество знакорядов на обратном ходе кадровой развёртки = 1
  ; R=1D=29 Количество знакорядов в кадре = 30
F83F
  ; UUUULLLL, U=Номер строки подчёркивания в знакоряде=10d
  ; L=Количество строк растра в знакоряде=10d
F841
  ; MFCCZZZZ, M=1=Режим счётчика строк. F=0-Режим атрибутов поля: Непрозрачный.
  ; CC=01 - Тип курсора: мерцающее подчёркивание.
  ; Z=3 - Количество знаков при обратном ходе строчной развёртки: 8
F848
  use addr
F854
  use addr
F857
  ; Команда видеоконтроллера - Начало воспроизведения 001SSSBB
  ; SSS=1, Количество синхроимпульсов знака между запросами ПДП=7
  ; BB=11b=3, Количество запросов ПДП в пакете=8
F859
  ; Начальная установка счётчиков.
F860
  use addr
F873
  ;; 1F очистка экрана с установкой курсора в нулевую позицию
F878
  use addr
F886
  ;; Код команды JMP
F88B
  use addr
F891
  use addr
  postErrorEntry:
F894
  use addr
F89D
  monitorBegin:
  ; Вход в системный монитор без сброса
  use addr
F8A6
  use addr
F8AC
  use addr
F8AF
  waitForCmdLineInput:
F8BA
  ;; Сохранить введенный символ в cmdLine
F8C0
  ;; 55 - младший байт адреса конца буфера командной строки
F8C7
  onCmdLineOverflow:
  ; Показать знак вопроса и запустить Монитор заново
F8CF
  onCmdLineEnter:
F8D1
  use addr
F8D5
  use addr
F8D9
  ;; 58 = "X" (lat)
F8F2
  ;; BC = param3
F8F6
  ;; DE = param2
F8F7
  ;; HL = param1
F8FB
  use char
F900
  use char
  ;; (lat)
F905
  use char
F90A
  use char
F90F
  use char
  ;; (lat)
F914
  use char
  ;; (lat)
F919
  use char
F91E
  use char
F923
  use char
  ;; (lat)
F928
  use char
F930
  msgDirX:
  zstring
F955
  entry
  stdCheckSumErrHandler:
  use addr
F958
  use addr
F961
  onKeyLeft:
F967
  deleteCharInCmdLine:
  ; HL (in/out) = absolute address of last character in command line
  ; На выходе ZF=1, если строка пуста.
  ;; 36h = low byte of cmdLine 
F96A
  ;; Если командная строка пуста, то ничего не делать
F972
  readCmdParam:
  use addr
  ; Чтение с клавиатуры параметра, который нужен для выполнения команд монитора.
  ; Строка сохраняется в буфер cmdLine
  ; На выходе B=0, если строка пустая и B=FF, если что-то введено
  ; CF = 1, если ввод успешный
  ; DE -> cmdLine
F975
  clrReadParamMask:
F977
  loopReadCmdParam:
F988
  ;; Недокументированная фича. В случае нажатия символа точки Монитор стартует заново.
F98F
  ;; 55 = младший байт адреса конца буфера cmdLine
F999
  onReadParamEol:
F99B
  use addr
F9A1
  onReadParamBS:  
F9AA
  ret2:
  ; Удалить слово из стека и вызвать ret
F9AD
  outMsg:
  ; HL = address of zero-terminated string
F9B7
  parseDirectiveParams:
  use addr
F9BD
  zeroFillDirParams:
F9C3
  use relativeAddr 7636
F9E1
  parseHexWord:
  ; Извлечь из командной строки 16-битовое число в hex-формате.
  ; in DE -> строка, содержащая введенный параметр, из которого надо извлечь word-число.
  ; Пробелы игнорируются. Окончание по достижению символа конца строки или запятой.
  ; out HL = число
  ; CF=1, если достигнут конец строки. CF=0, если достигнут разделитель (запятая)
F9E4
  loopParseWord:
F9EB
  use char
F9F8
  use decByte
FA09
  addDigitToParseResult:
FA15
  finishParseWord:
FA17
  isHLeqDE:
  ; Если HL==DE, то ZF=1
FA1D
  finishOrContinue:
  ; Если HL==DE или нажато F4, то завершить вышестоящую подпрограмму.
  ; Иначе увеличить HL
FA26
  ;; 3 = код клавиши F4 (или УС+Ц/C)
FA2D
  drawEolAnd3xRight:
FA2E
  use addr
FA36
  drawHexByteMemAndSpace:
  ; Вывод 1 байта в hex-формате из памяти, указанной через HL. + Пробел
FA37
  drawHexByteAndSpace:
FA42
  drawHexByte:
  ; Вывод 2 символов, соответствующих шеснадцатеричному значению р-ра A
FA4B
  drawHex4bits:
  ; Вывод одного символа, соответствующего шеснадцатеричному значению младших 4 бит р-ра A
FA4D
  use decByte
FA52
  use decByte
FA54
  makeCharFromDigit:
FA56
  ;; когда завершится подпрограмма вывода символа, то её ret завершит данную подпрограмму
FA59
  directiveD:
  ; Просмотр интервала памяти
  ; HL-начальный адрес, DE-конечный
FA6B
  directiveC:
  ; Директива C. Сравнение двух интервалов памяти.
  ; Арг.1 (HL) = начало первого интервала
  ; Арг.2 (DE) = конец первого интервала
  ; Арг.3 (BC) = Начало второго интервала
  ; При несовпадении выводится адрес из первого интервала, байт по этому адресу и байт из второго интервала
FA7A
  continueDirC:
FA81
  directiveF:
  ; Директива F. Запись числа во все ячейки интервала памяти.
  ; Арг.1 (HL) - Арг.2 (DE): Начало и конец интервала.
  ; Арг.3 (BC) - значение для заполнения. Используется один байт (т.е. C)
FA88
  directiveS:
  ; Директива S. Поиск байтового значения в интервале памяти.
  ; HL:DE - интервал, C - байтовое значение
  ; Выводятся все адреса, в которых найдено указанное значение.
FA5C
  loopDirDRow:
FA93
  directiveT:
  ; Директива T. Копирование интервала памяти
  ; HL:DE - исходный интервал. BC - адрес для копирования
FA9C
  directiveL:
  ; Директива L. Просмотр интервала памяти в символьном виде.
FA9F
  loopDirL:
FAA9
  use char
  dotChar:
FAAB
  dirLOut:
FABA
  directiveM:
  ; Директива M. Просмотр и изменение содержимого памяти.
  ; HL - адрес
FACF
  nextDirMAddr:
FAD3
  directiveG:
  ; Директива G. Запуск программы с указанного адреса.
  ; HL - адрес старта, DE - адрес остановки
FAE1
  ;; Код команды RST 6
FAE3
  ;; Код команды JMP 
FAE8
  use addr
FAE5
  ;; Адрес для RST 6. Видимо, предполагается что пользовательская программа не находится в этом месте. И не использует RST 6
FAEE
  startOfUserProgram:
FAF3
  use addr
FB01
  entry
  endOfUserProgram:
FB0D
  use addr
FB17
  use addr
FB2E
  directiveX:
  ; Директива X. Просмотр и изменение содержимого регистров процессора
  use addr
FB34
  use addr
FB39
  loopReadRegValues:
FB4D
  ;; HL->старший байт wordParam, DE=число, полученное при парсинге
FB51
  skipSaveRegValue:
FB54
  ;; не влияет на флаги, поэтому следующий jnz - результат уменьшения B
FB59
  directiveI:
  ; Директива I. Ввод данных с магнитофона.
  ; Обычно адреса для загрузки считываются вместе с данными. Но можно указать в параметрах
FB5B
  ;; Адрес начала
FB61
  ;; Адрес конца
FB6B
  ;; контрольная сумма
FB84
  use addr
FB8E
  msgBadCheckSum:
  zstring
FB91
  loadWordNoSync:
FB93
  loadWord:
  ; in: A= FF or 08
  ; out: BC = loaded word
FB9E
  loadToMemory:
  ; HL->buffer, DE->end
FBAA
  calcCheckSum:
  ; От HL до DE, результат в BC
FBAD
  loopCalc:  
FBBC
  directiveO:
  ; Директива O. Запись области памяти на магнитофон
  ; HL:DE - интервал памяти
FBC9
  dirO:
FBCF
  ; Записать 256 нулевых байтов
FBD2
  loopSaveZero:
FBDE
  ;; адрес начала
FBE2
  ;; адрес конца
FBEA
  ;; контрольная сумма
FBED
  drawEol3SkipHexWordSpc:
  ; Перейти на новую строку, пропустить 3 символа, вывести 16-bit hex word из HL и пробел.
FBFB
  saveMemory:
  ; HL:DE - область памяти для сохранения
FC05
  saveHL:
FC0D
  loadByte:
  ; A = 08 - без синхр., FF - с синхр.
FC17
  ;; C = 0 - читаемый байт
FC19
  ;; D = Либо 8 (Счётчик битов, которые ещё не считаны). Либо FF - режим поиска синхробайта 
FC21
  ;; 10 = ввод с магнитофона
FC24
  ;; Для контроллера ПДП установить режим автозагрузки, но работа канала 2 запрещена
FC29
  loopReadByte:
FC32
  waitInputChange:
FC35
  ; Если за отведённое время не произошло изменение читаемого бита, то это ошибка
FC46
  ; Как только значение читаемого бита изменилось, оно фиксируется в р-ре С
FC52
  lbL2:
FC55
  lbL3:
FC56
  readingDelay1:
FC6B
  ; Режим чтения FF. Проверка синхронизирующего значения E6
FC78
  checkInversedSync:
FC7D
  ; 19 - это инвертированный синхробайт Е6. Значит, при чтении данных требуется инверсия.
FC82
  setByteReadMode:
FC84
  continueReadByteLoop:
FC88
  use addr
FC8D
  ;; 76D0 = адрес начала видеопамяти
FC94
  use addr
FC97
  ;; 001.001.11 001SSSBB Начало воспроизведения. S=1 -> 7 синхроимпульсов между запросами ПДП, B=3 -> 8 запросов ПДП в пакете
FC99
  ;; 111.00000 Начальная установка счётчиков
FC9B
  ;; 1010.0100 Разрешить работу канала 2 ПДП
FCA8
  ; Здесь А содержит финальный результат чтения
FCAB
  saveByte:
  ; Запись байта на магнитофон. 
  ; Входной байт передаётся в регистре С
FCBA
  loopByteWr:
FCC8
  delayWr1:
FCDD
  continueWr2:
FCE0
  continueWr:
FCE1
  delayWr0:
FCEC
  use addr
FCF8
  use addr

FD07
  popDBHandRet:
FD0B
  msgMicrosha:
  zstring
FD19
  msgPrompt:
  zstring
FD1E
  msgEolAnd3xRight:
  zstring
FD24
  outCharA:
  ; Output of the character specified in the A register
FD25
  outChar:
  ; Output of the character specified in the C register
FD2C
  use addr
FD33
  ;; Координаты курсора -> DE. D=Y, E=X
FD48
  loopCursorRight:
FD54
  resetEscMode:
FD55
  setEscMode:
FD59
  noEscape:
FD5D
  ;; Очистка экрана с установкой курсора в нулевую позицию
FD62
  ;; Установка курсора в нулевую позицию
FD67
  ;; Установка курсора в начало строки
FD6C
  ;; Перевод строки
FD71
  ;; Перемещение курсора на один символ назад
FD85
  ;; AP2 Определяется программой пользователя
FD8A
  ;; Звуковой сигнал
FD92
  bell:
  ; BC = Длительность
FD9A
  loopBell:
FDA9
  outNormalChar:
FDAE
  use decByte
FDB2
  use decByte
FDB8
  onNextLine:
FDB9
  use decByte
FDC0
  ;; videoMemory + (3*78) + 8
FDC3
  ;; +78 = pitch
FDC6
  ;; 78 * 25
FDC9
  loopScrollUp:
FDD6
  onEsc1:
FDE4
  onOdd1:
FDF6
  setCursorPosAndRet:
  entry
  ; H = cursorY, L = cursorX
  ; DE = ?
FDFA
  use addr
FDFD
  ; Команда видеоконтроллера 80h - загрузка курсора.
  ; Два байтовых параметра: 
  ; 1. Номер знакоместа в знакоряду (cursorX)
  ; 2. Номер знакоряда (cursorY)
FE0F
  onAP2:
FE14
  onOut1F:
FE1A
  loopClrSrc1F:
FE23
  setCursorLeftTop:
FE2A
  onCursorRight:
FE2B
  use decByte
FE36
  incrementCursorX:
FE39
  onCursorLeft:
FE3A
  use decByte
FE3F
  use decByte
FE41
  use decWord
FE48
  backSpaceGreater8:
FE4A
  ;; Go to setCursorPosAndRet
FE4B
  onCursorUp:
FE4C
  use decByte
FE57
  ;; Go to setCursorPosAndRet
FE58
  onLineLess27:
FE59
  use decWord
FE5E
  onCursorDown:
FE71
  setLineStart:
  ; HL = HL - E + 8
  ; E = 8
FE7F
  isKeyPressed:
  ; Определить, нажата ли клавиша.
  ; Результат: A=0, если нет. A=FF, если да
  ; Кроме того, устанавливаются несколько системных переменных
FE85
  use addr
FE89
  ; Если pressFlag установлен, значит клавиша уже была нажата
  ; Флаг сбрасывается в readKey, когда запросившее приложение получает код нажатой клавиши.
FE92
  use addr
FE97
  setPressCounterAndRet:
FE9D
  onPositiveKeyCode:
FEAB
  continuePressCount:
FEAE
  use addr
FEBD
  setPressFlagAndRet:
FEC4
  onSameKeyCode:
FED0
  readKey:
  ; Ожидает нажатия клавиши. Возвращает код символа в A.
FEE0
  ; Нажатие F1
FEEA
  checkKbdStatus:
  ; =====================================
  ; Опрос клавиатуры
  ; A = FF - Ни одна клавиша не нажата.
  ; Иначе A = код символа (с учётом всех управляющих клавиш)
FEEE
  ;; статус клавиши РУС/ЛАТ.
FEF0
  ;; Если 0, то нажата.
FEF3
  waitRusLatRelease:  
FEFE
  ;; статус НР
FF03
  use addr
FF0D
  onHPfree:
  use addr
FF13
  ;; статус УС
FF18
  ; Если нажата клавиша УС, то звуковой сигнал подавать не надо
  ;; HL -> keySoundFlag (7608)
FF1F
  onZeroKbdCounter:
  ;; A: 0 -> FF
FF27
  use addr
FF2A
  kEchoLoop:
FF33
  restoreStkAndZeroKbdCounter:
  ; ---
FF3E
  inverseKbdPortC:
FF40
  ;; переключение RUS/LAT
FF44
  startKbdScan:
  ; Этот протокол не является стандартным. 
  ; Такое впечатление, что он связан с особенностями аппаратной реализации Микроши.
  ; В порт B засылается 8 значений: 7F, BF, DF, EF, F7, FB, FD, FE.
  ; После каждого из порта А получаем 8 бит, где нажатию соответствует 0.
  ; Таким образом можно получить состояние 64 клавиш.
FF46
  ;; H - номер строки матрицы клавиш 8x8. Меняется в цикле от 7 до 0.
FF48
  loopKbdScan:
FF49
  ;; Тут в цикле будут появляться следующие значения: 80, 40, 20, 10, 08, 04, 02, 01
FF4A
  ;; Что как-то соответствует номерам строк битовой матрицы 8x8
FF4F
  ;; Из порта А приходит битовая строка, где 1-это не нажатое состояние.
FF52
  ;; После инверсии 1 - это нажатое состояние
FF54
  ;; Ненулевое значение означает, что найдена нажатая клавиша
FF5B
  returnFF:
  ;; Если нет нажатых клавиш, то вернуть FF
FF5F
  onPressFound:
  ; Если клавиша нажата, то приблизительно полсекунды продолжаем читать порт А.
FF61
  waitPossibleRelease:
FF66
  ;; Если тут 0, значит из порта А получено FF. Т.е. клавиша отпущена.
FF6F
  scanPressColumn:
FF6D
  ; L меняется в цикле от 7 до 0
FF74
  ;; соответствует номеру бита нажатой клавиши в строке матрицы
FF75
  ;; Для колонок 0 и 1 коды клавиш вынесены в таблицы
  use decByte
FF80
  ; Для остальных случаев код = Column * 8 + 20h + Row
FF86
  ; Up, Down, TopHome, F1, F2, F3, F4, F5
  column1Table:
  byte
  length 8
FF8E
  ; Space, AP2, Tab, LF, CR, ClrSrc, Left, Right
  column0Table:
  byte
  length 8
FF96
  onKeysColumn0:
FF97
  use addr
FF9D
  onKeysColumn1:
FF9E
  use addr
FFA1
  setKeyCodeFromTable:
  ; HL = адрес таблицы
  ; A - смещение
FFA4
  ;; Любые коды в таблицах меньше 40h. Так что CF будет установлен в любом случае.
FFA9
  onAlphanumericCode:
  ;; L = char code
FFAD
  ;; H = Port C
FFAE
  ;; УС, Но нажатие соответствует 0
FFB4
FFB9
  ; Генерировать псевдографический код от 0 до 1F (Таблица 4 мануала)
FFBD
  continueAlphanumeric:
FFC4
  ;; char code
FFCA
  ;; Перейти от набора @ABCD...[\]^_ к ЮАБЦД...ШЭЩЧЪ
FFCD
  testLowReg:
  ;; Port C
FFCE
  ;; НР (LowReg)
FFD0
  ;; Если не 0, значит не нажата
FFDA
  ;; Поменять диапазон на противоположный
FFDE
  lowRegForNums:
FFDF
  ;; 1234... -> !"#$...
FFE2
  onCharLess40:
FFE6
  ;; <-- Если алфавитный символ (код >=40h), то завершить подпрограмму
FFF1
  ; Для символов 0-9 : ; коды (30-3B) не меняются. А для < = > ? происходит замена регистра на , - . /
FFF3
  finishNum:
`