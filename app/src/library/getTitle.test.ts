import { expect, test } from "vitest";
import { getTitle } from "./getTitle";

test("a plain title comes back as it is", () => {
  expect(getTitle("Shadow Slave")).toBe("Shadow Slave");
});

test("a set of translations gives the first one", () => {
  expect(getTitle({ ja: "シャドウ・スレイブ" })).toBe("シャドウ・スレイブ");
});

test("no title gives empty text", () => {
  expect(getTitle(undefined)).toBe("");
});