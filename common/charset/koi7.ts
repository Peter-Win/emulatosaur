import { cvtCharset } from "./cvtCharset";

// https://ru.wikipedia.org/wiki/%D0%9A%D0%9E%D0%98-7

export const koi7H0 = cvtCharset(0x20, 
  ` !"#⁠¤%&'()*+,-./` +
  "0123456789:;<=>?" +
  "@ABCDEFGHIJKLMNO" +
  "PQRSTUVW{YZ[\\]^_" +
  "`abcdefghijklmno" +
  "pqrstuvwxyz{|}⁠⁠¯"
);

export const koi7H1 = cvtCharset(0x20, 
  ` !"#⁠¤%&'()*+,-./` +
  "0123456789:;<=>?" +
  "юабцдефгхийклмно" +
  "пярстужвьызшэщчъ" +
  "ЮАБЦДЕФГХИЙКЛМНО" +
  "ПЯРСТУЖВЬЫЗШЭЩЧ"
)

export const koi7H2 = cvtCharset(0x20, 
  ` !"#¤%&'()*+,-./` +
  "0123456789:;<=>?" +
  "@ABCDEFGHIJKLMNO" +
  "PQRSTUVWXYZ[\\]¬_" +
  "ЮАБЦДЕФГХИЙКЛМНО" +
  "ПЯРСТУЖВЬЫЗШЭЩЧ"
);