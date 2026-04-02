import { parseSrcMap } from "./parseSrcMap";

describe("parseSrcMap", () => {

  it("org", () => {
    const res1 = parseSrcMap("org F800");
    expect(res1.org).toBe(0xF800);

    expect(() => parseSrcMap("")).toThrow("Expected org value");

    const text2 = "org 1000\n org 2000";
    expect(() => parseSrcMap(text2)).toThrow("Duplicated org in line 2: org 2000");

    expect(() => parseSrcMap("org Z00")).toThrow("Invalid org value Z00 in line 1: org Z00");
  })

  it("syntax", () => {
    const res1 = parseSrcMap("org 0\nsyntax intel");
    expect(res1.syntax).toBe("intel");
  })

  it("charset", () => {
    const text = "charset МИКРОША\norg 0";
    const res = parseSrcMap(text);
    expect(res.charset).toBe("МИКРОША");

    const text2 = "charset SomeName\norg 0";
    expect(() => parseSrcMap(text2)).toThrow("Invalid charset name 'SomeName' in line 1: charset SomeName");
  });

  it("address", () => {
    const text = "org F800\nF800\nF803\n";
    const res = parseSrcMap(text);
    expect(res.addrMap.size).toBe(2);
  })

  it("label", () => {
    const text = `org 0\n 0001\n first:\n 0002\n =second:\n`;
    const res = parseSrcMap(text);
    const line1 = res.addrMap.get(1);
    expect(line1).toBeDefined();
    expect(line1).toHaveProperty("label", "first"); 
    expect(!!line1?.equ).toBe(false);

    const line2 = res.addrMap.get(2);
    expect(line2).toHaveProperty("label", "second");
    expect(line2?.equ).toBe(true);

    const text2 = "org 0\n a:\n";
    expect(() => parseSrcMap(text2)).toThrow("Current address is not defined in line 2: a:");

    const text3 = "org 0\n 0001\n a:\n 0002\n a:";
    expect(() => parseSrcMap(text3)).toThrow("Duplicated label 'a' (First in line 3) in line 5: a:");
  })

  it("prefix comment", () => {
    const text = `
      org F800
      F800
        ; This is the first comment.
        ; Continuation of the first comment.
      F603
        ; This is the second comment.`
    const res = parseSrcMap(text);
    const line1 = res.addrMap.get(0xF800);
    expect(line1?.prefix).toEqual(["; This is the first comment.", "; Continuation of the first comment."]);
  });

  it("inline comment", () => {
    const text = `org 0\n 0000\n ;; Inline comment. \n`
    const res = parseSrcMap(text);
    const line0 = res.addrMap.get(0);
    expect(line0).toBeDefined();
    expect(line0?.inlineComment).toBe("Inline comment.");
  });

  it("use", () => {
    const resA = parseSrcMap(`org 0 \n 0000 \n use addr`)
    expect(resA.addrMap.get(0)?.use).toBe("addr");

    const resC = parseSrcMap(`org 0 \n 0001 \n use char`);
    expect(resC.addrMap.get(1)?.use).toBe("char");

    const resB= parseSrcMap(`org 0 \n 0002 \n use decByte`);
    expect(resB.addrMap.get(2)?.use).toBe("decByte");

    const resW= parseSrcMap(`org 0 \n 0003 \n use decWord`);
    expect(resW.addrMap.get(3)?.use).toBe("decWord");

    const resR= parseSrcMap(`org 0 \n 0004 \n use relativeAddr 0002`);
    const rr = resR.addrMap.get(4);
    expect(rr?.use).toBe("relativeAddr");
    expect(rr?.relativeAddr).toBe(2);

    expect(() => parseSrcMap("org 0\n0005\n use hello"))
      .toThrow("Unknown use 'hello' in line 3: use hello");
  });
  
  it("entry", () => {
    const res = parseSrcMap("org F800\n F800\n entry");
    expect(res.addrMap.get(0xF800)?.entry).toBe(true);
  })

  it("invalid command", () => {
    const text = "org 0\nHello!";
    expect(() => parseSrcMap(text)).toThrow("Invalid source map command in line 2: Hello!")
  });
})