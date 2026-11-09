import { expect, test } from "vitest";
import { countWords, timeLeft } from "./timeleft";

test("counts words, whatever the spaces", () => {
  expect(countWords("")).toBe(0);
  expect(countWords("   ")).toBe(0);
  expect(countWords("  Sunny smiled,\n\tthen  ran. ")).toBe(4);
});

test("rounds the minutes up", () => {
  expect(timeLeft(1500, 250)).toBe("About 6 min left");
  expect(timeLeft(1501, 250)).toBe("About 7 min left");
  expect(timeLeft(1, 250)).toBe("Less than a minute left");
});

test("says nothing when there's nothing left", () => {
  expect(timeLeft(0, 250)).toBe("");
});

test("from 60 minutes up it shows hours and minutes", () => {
  expect(timeLeft(18750, 250)).toBe("About 1 h 15 min left");
  expect(timeLeft(15001, 250)).toBe("About 1 h 1 min left");
});

test("whole hours leave the minutes off", () => {
  expect(timeLeft(15000, 250)).toBe("About 1 h left");
  expect(timeLeft(30000, 250)).toBe("About 2 h left");
});

test("59 and a bit rounds up to an hour", () => {
  expect(timeLeft(14900, 250)).toBe("About 1 h left");
});
