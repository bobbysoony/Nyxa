import { expect, test } from "vitest";
import { cameOffHiatus, shouldComplete, shouldPause, statusLabel, toStatus } from "./status";

test("toStatus understands the ways sites write it", () => {
  expect(toStatus("Ongoing")).toBe("ongoing");
  expect(toStatus(" COMPLETED ")).toBe("completed");
  expect(toStatus("Completed")).toBe("completed");
});

test("a series on a break is hiatus", () => {
  expect(toStatus("On Hiatus")).toBe("hiatus");
  expect(toStatus("Hiatus")).toBe("hiatus");
  expect(statusLabel("hiatus")).toBe("On hiatus");
});

test("caught up on a series on hiatus moves it to On hold, behind on it doesn't", () => {
  expect(shouldPause("reading", "hiatus", 0, 300)).toBe(true);
  expect(shouldPause("reading", "hiatus", 5, 300)).toBe(false);
  expect(shouldPause("reading", "ongoing", 0, 300)).toBe(false);
  expect(shouldPause("dropped", "hiatus", 0, 300)).toBe(false);
});

test("an On hold series coming back from hiatus notifies you, a failed page doesn't", () => {
  expect(cameOffHiatus("hiatus", "ongoing", "paused")).toBe(true);
  expect(cameOffHiatus("hiatus", "completed", "paused")).toBe(true);
  expect(cameOffHiatus("hiatus", "unknown", "paused")).toBe(false);
  expect(cameOffHiatus("hiatus", "ongoing", "reading")).toBe(false);
  expect(cameOffHiatus("ongoing", "ongoing", "paused")).toBe(false);
});

test("anything else is unknown", () => {
  expect(toStatus("Dropped by author")).toBe("unknown");
  expect(toStatus("")).toBe("unknown");
  expect(toStatus(undefined)).toBe("unknown");
});

test("a finished series moves once every chapter is read", () => {
  expect(shouldComplete("reading", "completed", 0, 300)).toBe(true);
  expect(shouldComplete("reading", "completed", 1, 300)).toBe(false);
});

test("finishing a reread puts it back in Completed", () => {
  expect(shouldComplete("rereading", "completed", 0, 300)).toBe(true);
  expect(shouldComplete("rereading", "ongoing", 0, 300)).toBe(false);
});

test("an ongoing or unknown series stays on Reading, even when it's all read", () => {
  expect(shouldComplete("reading", "ongoing", 0, 300)).toBe(false);
  expect(shouldComplete("reading", "unknown", 0, 300)).toBe(false);
});

test("a list you picked yourself is left alone, and so is a novel with no chapters", () => {
  expect(shouldComplete("paused", "completed", 0, 300)).toBe(false);
  expect(shouldComplete("reading", "completed", 0, 0)).toBe(false);
});
