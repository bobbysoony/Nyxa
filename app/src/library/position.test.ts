import { expect, test } from "vitest";
import { positionHref } from "./position";

test("position is correctly converted to href", () => {
  expect(positionHref(1, 0)).toBe("chapter-1#p0");
  expect(positionHref(1, 1)).toBe("chapter-1#p1");
  expect(positionHref(1, 2)).toBe("chapter-1#p2");
});