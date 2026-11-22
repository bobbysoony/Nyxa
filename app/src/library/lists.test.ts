import { expect, test } from "vitest";
import { lists, toList } from "./lists";

test("toList keeps a list it knows", () => {
  expect(toList("paused")).toBe("paused");
  expect(toList("completed")).toBe("completed");
  expect(toList("rereading")).toBe("rereading");
});

test("toList turns anything it doesn't know into reading", () => {
  expect(toList("")).toBe("reading");
  expect(toList("Reading")).toBe("reading"); // a capital R isn't how it's saved, so it falls back to reading
  expect(toList("re-reading")).toBe("reading");
});

test("every list has a label and no value is there twice", () => {
  expect(lists.every((list) => list.label !== "")).toBe(true);
  expect(new Set(lists.map((list) => list.value)).size).toBe(lists.length);
});
