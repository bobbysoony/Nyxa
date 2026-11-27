import { describe, expect, test } from "vitest";
import { chapterName } from "./chapterName";
import type { FoliateBook } from "../foliate";

const book: FoliateBook = {
  toc: [
    { label: " CH.1 Every 100,000 Years ", href: "c1.xhtml" },
    { label: "Volume 2", href: "v2.xhtml", subitems: [{ label: "CH.2 High Heaven Realm.", href: "c2.xhtml#top" }] },
  ],
  resolveHref: (href) => ({ index: ["c1.xhtml", "v2.xhtml", "c2.xhtml"].indexOf(href.split("#")[0]), anchor: () => null }),
};

describe("chapterName", () => {
  test("finds the Contents name for a chapter, tidied", () => {
    expect(chapterName(book, 0)).toBe("CH.1 Every 100,000 Years");
  });

  test("looks inside volumes too", () => {
    expect(chapterName(book, 2)).toBe("CH.2 High Heaven Realm.");
  });

  test("a chapter that isn't in Contents gets no name", () => {
    expect(chapterName(book, 5)).toBe("");
  });
});
