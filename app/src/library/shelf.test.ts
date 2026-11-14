import { expect, test } from "vitest";
import { continueReading, searchTiles, sortTiles, type Tile } from "./shelf";

function tile(title: string, openedAt = 0, finished = false): Tile {
  return { name: title, title, cover: null, finished, progress: "", fresh: 0, openedAt, open: () => {} };
}

const titles = (tiles: Tile[]) => tiles.map((t) => t.title);

test("search finds a title by a piece of it, whatever the capitals", () => {
  const tiles = [tile("Shadow Slave"), tile("Dune"), tile("The Shadow of the Wind")];
  expect(titles(searchTiles(tiles, "shadow"))).toEqual(["Shadow Slave", "The Shadow of the Wind"]);
  expect(titles(searchTiles(tiles, "  DUNE "))).toEqual(["Dune"]);
});

test("an empty search keeps everything", () => {
  const tiles = [tile("Dune"), tile("Emma")];
  expect(searchTiles(tiles, "   ")).toEqual(tiles);
});

test("a search that matches nothing gives an empty list", () => {
  expect(searchTiles([tile("Dune")], "zzz")).toEqual([]);
});

test("sort by title is A to Z", () => {
  expect(titles(sortTiles([tile("Emma"), tile("dune"), tile("Carrie")], "title"))).toEqual(["Carrie", "dune", "Emma"]);
});

test("sort by recent puts the last opened first, and never opened at the end A to Z", () => {
  const tiles = [tile("Zed"), tile("Dune", 100), tile("Abe"), tile("Emma", 300)];
  expect(titles(sortTiles(tiles, "recent"))).toEqual(["Emma", "Dune", "Abe", "Zed"]);
});

test("sorting leaves the list it was given alone", () => {
  const tiles = [tile("B"), tile("A")];
  sortTiles(tiles, "title");
  expect(titles(tiles)).toEqual(["B", "A"]);
});

test("continue reading is the last 3 you opened, without finished or never opened ones", () => {
  const tiles = [tile("Old", 100), tile("Done", 900, true), tile("New", 500), tile("Never"), tile("Mid", 300), tile("Older", 50)];
  expect(titles(continueReading(tiles))).toEqual(["New", "Mid", "Old"]);
});

test("sort by new chapters puts the most new chapters first", () => {
  const tiles = [tile("Abe"), { ...tile("Dune"), fresh: 2 }, { ...tile("Emma"), fresh: 7 }];
  expect(titles(sortTiles(tiles, "newChapters"))).toEqual(["Emma", "Dune", "Abe"]);
});
