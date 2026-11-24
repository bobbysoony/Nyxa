import { expect, test } from "vitest";
import { tapAction, tapZone } from "./taps";

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

test("with the bars showing, a tap anywhere only hides them", () => {
  expect(tapAction(50, 400, true)).toBe("hide bars");
  expect(tapAction(200, 400, true)).toBe("hide bars");
  expect(tapAction(390, 400, true)).toBe("hide bars");
});

test("with the bars hidden, taps work like before", () => {
  expect(tapAction(50, 400, false)).toBe("left");
  expect(tapAction(200, 400, false)).toBe("middle");
  expect(tapAction(390, 400, false)).toBe("right");
});
