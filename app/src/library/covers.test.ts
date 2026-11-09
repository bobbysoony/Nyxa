import { expect, test } from "vitest";
import { thumbnailSize } from "./covers";

test("a big cover shrinks to 300 wide and keeps its shape", () => {
  expect(thumbnailSize(1200, 1800)).toEqual({ width: 300, height: 450 });
});

test("a small cover is never made bigger", () => {
  expect(thumbnailSize(200, 300)).toEqual({ width: 200, height: 300 });
});
