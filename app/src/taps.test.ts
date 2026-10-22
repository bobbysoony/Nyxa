import { expect, test } from "vitest";
import { tapZone } from "./taps";

test("a tap near the left edge goes back", () => {
  expect(tapZone(50, 400)).toBe("left");
});

test("a tap near the right edge goes forward", () => {
  expect(tapZone(390, 400)).toBe("right");
});

test("a tap in the middle shows or hides the bars", () => {
  expect(tapZone(200, 400)).toBe("middle");
});

test("exactly on the border", () => {
  expect(tapZone(120, 400)).toBe("middle");
  expect(tapZone(280, 400)).toBe("middle");
});