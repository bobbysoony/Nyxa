import { expect, test } from "vitest";
import { browse, goBack, goTo, library, reader } from "./places";

test("going somewhere puts it on top", () => {
  expect(goTo([library], browse)).toEqual([library, browse]);
});

test("going where you already are adds nothing", () => {
  const places = [library, reader];
  expect(goTo(places, reader)).toBe(places);
  expect(goTo(places, { ...reader, novelId: 1 })).toHaveLength(3);
});

test("back takes the top off, until only one is left", () => {
  expect(goBack([library, reader, browse])).toEqual([library, reader]);
  expect(goBack([library])).toBeNull();
});
