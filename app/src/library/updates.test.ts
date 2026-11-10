import { expect, test } from "vitest";
import { newChapters } from "./updates";

const chapter = (n: number) => ({ name: `Chapter ${n}`, path: `book/x/chapter-${n}` });

test("finds the chapters at the end that Nyxa doesn't have", () => {
  const known = [1, 2, 3].map((n) => chapter(n).path);
  expect(newChapters(known, [1, 2, 3, 4, 5].map(chapter))).toEqual([chapter(4), chapter(5)]);
});

test("nothing new when the lists match", () => {
  const known = [1, 2].map((n) => chapter(n).path);
  expect(newChapters(known, [1, 2].map(chapter))).toEqual([]);
});

test("a renamed chapter isn't new, because its path is the same", () => {
  const known = [chapter(1).path];
  expect(newChapters(known, [{ name: "Chapter 1: The Spire", path: chapter(1).path }])).toEqual([]);
});
