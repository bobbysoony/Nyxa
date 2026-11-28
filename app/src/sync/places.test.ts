import { describe, expect, it } from "vitest";
import { mergePlaces, type NovelPlace } from "./places";

const SECOND = 1000;
const HOUR = 60 * 60 * SECOND;

const place = (path: string, chapter: number, changedAt: number): NovelPlace => ({
  source: "src",
  path,
  name: path,
  chapter,
  paragraph: 0,
  list: "reading",
  changedAt,
});

describe("mergePlaces", () => {
  it("takes the other device's place when it's newer", () => {
    const { take, file } = mergePlaces([place("a", 10, 100)], [place("a", 1900, 200)]);
    expect(take.map((p) => p.chapter)).toEqual([1900]);
    expect(file.map((p) => p.chapter)).toEqual([1900]);
  });

  it("keeps this device's place when it's newer", () => {
    const { take, ahead, file } = mergePlaces([place("a", 1900, 300)], [place("a", 10, 200)]);
    expect(take).toEqual([]);
    expect(ahead).toEqual([]);
    expect(file.map((p) => p.chapter)).toEqual([1900]);
  });

  it("asks when the other device is further along but hours older, and Drive keeps theirs until then", () => {
    const { take, ahead, file } = mergePlaces([place("a", 10, 3 * HOUR)], [place("a", 15, 0)]);
    expect(take).toEqual([]);
    expect(ahead.map((p) => p.chapter)).toEqual([15]);
    expect(file.map((p) => p.chapter)).toEqual([15]);
  });

  it("just switched devices (moved here under 5 minutes later): takes the further place without asking", () => {
    const { take, ahead } = mergePlaces([place("a", 10, 50 * SECOND)], [place("a", 15, 0)]);
    expect(take.map((p) => p.chapter)).toEqual([15]);
    expect(ahead).toEqual([]);
  });

  it("further in the same chapter counts too", () => {
    const mine = { ...place("a", 10, 3 * HOUR), paragraph: 2 };
    const theirs = { ...place("a", 10, 0), paragraph: 40 };
    expect(mergePlaces([mine], [theirs]).ahead).toHaveLength(1);
  });

  it("after Stay, this device's place goes to Drive", () => {
    const { ahead, file } = mergePlaces([place("a", 10, 3 * HOUR)], [place("a", 15, 0)], new Set(["src a"]));
    expect(ahead).toEqual([]);
    expect(file.map((p) => p.chapter)).toEqual([10]);
  });

  it("keeps novels only the other device has, and adds ones only this device has", () => {
    const { take, file } = mergePlaces([place("mine", 5, 1)], [place("theirs", 7, 1)]);
    expect(take).toEqual([]);
    expect(file.map((p) => p.path).sort()).toEqual(["mine", "theirs"]);
  });

  it("does nothing on a draw, so two devices don't keep swapping", () => {
    const { take, ahead } = mergePlaces([place("a", 10, 200)], [place("a", 11, 200)]);
    expect(take).toEqual([]);
    expect(ahead).toEqual([]);
  });
});
