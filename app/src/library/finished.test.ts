import { expect, test } from "vitest";
import { finishedChapter } from "./finished";

test("turning into the next chapter finishes the one before", () => {
  expect(finishedChapter(4, 5)).toBe(4);
});

test("turning pages inside a chapter finishes nothing", () => {
  expect(finishedChapter(5, 5)).toBe(null);
});

test("jumping ahead or going back finishes nothing", () => {
  expect(finishedChapter(5, 40)).toBe(null);
  expect(finishedChapter(5, 4)).toBe(null);
});

test("the first page after opening the novel finishes nothing", () => {
  expect(finishedChapter(null, 0)).toBe(null);
});