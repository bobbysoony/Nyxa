// One cover in the grid: a novel or an EPUB, the library treats them the same.
export type Tile = {
  name: string; // "novel-1" or "book-3", also the cover's file name
  title: string;
  cover: string | null;
  finished: boolean;
  progress: string;
  fresh: number;
  openedAt: number; // 0 if you never opened it
  open: () => void;
};

export type Sort = "title" | "recent" | "newChapters";

// keeps the tiles that have what you typed somewhere in the title, capitals dont matter
export function searchTiles(tiles: Tile[], query: string) {
  const wanted = query.trim().toLowerCase();
  if (wanted === "") return tiles;
  return tiles.filter((tile) => tile.title.toLowerCase().includes(wanted));
}

export function sortTiles(tiles: Tile[], sort: Sort) {
  const sorted = [...tiles]; // sort() moves things around in the list its given, so it gets a copy
  if (sort === "recent") {
    // newest first, and if two are the same (like never opened) fall back to A to Z
    sorted.sort((a, b) => b.openedAt - a.openedAt || a.title.localeCompare(b.title));
  } else if (sort === "newChapters") {
    sorted.sort((a, b) => b.fresh - a.fresh || a.title.localeCompare(b.title));
  } else {
    // A to Z, and the fallback if a new sort ever gets added without its own branch
    sorted.sort((a, b) => a.title.localeCompare(b.title));
  }
  return sorted;
}

// the few things you opened last and havent finished, for the row at the top
export function continueReading(tiles: Tile[], count = 3) {
  const started = tiles.filter((tile) => tile.openedAt > 0 && !tile.finished);
  return sortTiles(started, "recent").slice(0, count);
}
