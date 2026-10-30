import { expect, test } from "vitest";
import { groupVolumes } from "./novelBook";
import type { ChapterRow } from "./db";

function chapter(number: number, name = `Chapter ${number}`, volume: string | null = null): ChapterRow {
  return { id: number, novel_id: 1, number, name, path: "", volume, downloaded: 1 };
}

test("uses the site's volumes when it has them", () => {
  const volumes = groupVolumes([chapter(1, "A", "Book One"), chapter(2, "B", "Book One"), chapter(3, "C", "Book Two")]);
  expect(volumes.map((v) => v.label)).toEqual(["Book One", "Book Two"]);
  expect(volumes[0].chapters).toHaveLength(2);
});

test("reads volumes from chapter titles", () => {
  const volumes = groupVolumes([chapter(1, "Vol. 1 Chapter 1"), chapter(2, "Volume 2 - Chapter 1")]);
  expect(volumes.map((v) => v.label)).toEqual(["Volume 1", "Volume 2"]);
});

test("falls back to blocks of 250", () => {
  const volumes = groupVolumes([chapter(1), chapter(250), chapter(251)]);
  expect(volumes.map((v) => v.label)).toEqual(["Chapters 1–250", "Chapters 251–500"]);
});
