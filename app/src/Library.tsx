import { useEffect, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { readFile } from "@tauri-apps/plugin-fs";
import { listBooks, listNovels } from "./library/db";
import { addBook, moveOldBooks, prepareBooks, refreshCovers } from "./library/books";
import { coverLink } from "./library/covers";
import { continueReading, listTiles, searchTiles, sortTiles, type Sort, type Tile } from "./library/shelf";
import { lists, toList, type List } from "./library/lists";
import Dropdown from "./Dropdown";
import Tick from "./Tick";
import "./Library.css";

type LibraryProps = {
  onReadNovel: (id: number) => void;
  onReadBook: (id: number) => void;
  found: number;
};

function progressText(read: number, total: number) {
  return total > 0 ? `${read.toLocaleString()} / ${total.toLocaleString()} read` : "";
}

// one cover you can tap, used by the main grid and by the Continue reading row
function TileButton({ tile }: { tile: Tile }) {
  return (
    <button className="library-tile" onClick={tile.open}>
      <span className="library-cover">
        {tile.cover ? <img src={tile.cover} alt="" /> : <span className="library-no-cover">{tile.title}</span>}
        {tile.fresh > 0 && <span className="library-new">{tile.fresh} new</span>}
        {tile.finished && (
          <span className="library-done" aria-label="Read">
            <Tick />
          </span>
        )}
      </span>
      <span className="library-title" title={tile.title}>{tile.title}</span>
      <span className="library-progress">
        {tile.name.startsWith("book-") ? (
          <svg className="library-kind" viewBox="0 0 16 16" role="img" aria-label="EPUB">
            <title>EPUB</title>
            <path d="M8 4 C6 3 4 3 2 3.5 V13 C4 12.5 6 12.5 8 13.5 C10 12.5 12 12.5 14 13 V3.5 C12 3 10 3 8 4 Z M8 4 V13.5" />
          </svg>
        ) : (
          <svg className="library-kind" viewBox="0 0 16 16" role="img" aria-label="Web novel">
            <title>Web novel</title>
            <circle cx="8" cy="8" r="6" />
            <path d="M2 8 H14 M8 2 C5.5 5 5.5 11 8 14 M8 2 C10.5 5 10.5 11 8 14" />
          </svg>
        )}
        {tile.progress}
      </span>
    </button>
  );
}

function Library({ onReadNovel, onReadBook, found }: LibraryProps) {
  const [tiles, setTiles] = useState<Tile[] | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("title");
  const [list, setList] = useState<List | "all">("all");
  const [refreshing, setRefreshing] = useState(false);
  const [reload, setReload] = useState(0); // bumping it re-runs the effect below, so new covers show
  const [error, setError] = useState("");

  useEffect(() => {
    let links: string[] = [];
    loadTiles().then((loaded) => {
      links = loaded.flatMap((tile) => (tile.cover ? [tile.cover] : []));
      setTiles(loaded);
    });
    // blob: links hold the picture in memory until they're revoked, so free them when you leave.
    return () => links.forEach((link) => URL.revokeObjectURL(link));
  }, [found, reload]);

  async function refresh() {
    setRefreshing(true);
    await refreshCovers();
    setRefreshing(false);
    setReload((n) => n + 1);
  }

  // Moved here from the reader, opening a file isn't something you do while reading
  async function addEpub() {
    try {
      setError("");
      const path = await open({ filters: [{ name: "EPUB books", extensions: ["epub"] }] });
      if (!path) return;
      onReadBook(await addBook(await readFile(path)));
    } catch (err) {
      setError("Couldn't open that book");
      console.error(err);
    }
  }

  const addButton = <button onClick={addEpub}>Add EPUB</button>;

  async function loadTiles() {
    await moveOldBooks();
    await prepareBooks();
    const tiles: Tile[] = [];
    for (const novel of await listNovels()) {
      const name = `novel-${novel.id}`;
      tiles.push({
        name,
        title: novel.name,
        cover: await coverLink(name),
        finished: novel.total > 0 && novel.unread === 0,
        progress: progressText(novel.total - novel.unread, novel.total),
        fresh: novel.fresh,
        openedAt: novel.opened_at ?? 0,
        list: toList(novel.list),
        open: () => onReadNovel(novel.id),
      });
    }
    for (const book of await listBooks()) {
      const name = `book-${book.id}`;
      const ticks: number[] = JSON.parse(book.read);
      tiles.push({
        name,
        title: book.title,
        cover: await coverLink(name),
        finished: book.chapters > 0 && ticks.length >= book.chapters,
        progress: progressText(ticks.length, book.chapters),
        fresh: 0,
        openedAt: book.opened_at ?? 0,
        list: "reading", // EPUBs can't go on other lists yet
        open: () => onReadBook(book.id),
      });
    }
    return tiles;
  }

  if (!tiles) return <p className="library-status">Loading your library…</p>;
  if (!tiles.length) {
    return (
      <div className="library-status">
        <p>Nothing here yet: add an EPUB, or add a novel in Browse.</p>
        {addButton}
        {error && <p>{error}</p>}
      </div>
    );
  }

  const shown = sortTiles(searchTiles(listTiles(tiles, list), query), sort);
  const listName = lists.find((item) => item.value === list)?.label;
  // searching or picking a list hides the row, you're looking for something else
  const reading = query.trim() === "" && list === "all" ? continueReading(tiles) : [];

  return (
    <div className="library-screen">
      <div className="library-bar">
        <input
          type="search"
          placeholder="Search your library"
          aria-label="Search your library"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Dropdown
          label="Sort by"
          value={sort}
          options={[
            { value: "title", label: "A to Z" },
            { value: "recent", label: "Recently read" },
            { value: "newChapters", label: "New chapters" },
          ]}
          onChange={(picked) => setSort(picked as Sort)}
        />
        <Dropdown
          label="List"
          value={list}
          options={[
            { value: "all", label: `All lists (${tiles.length})` },
            ...lists.map((item) => ({ value: item.value, label: `${item.label} (${listTiles(tiles, item.value).length})` })),
          ]} onChange={(picked) => setList(picked as List | "all")}
        />
        <button onClick={refresh} disabled={refreshing}>
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
        {addButton}
      </div>
      {error && <p className="library-status">{error}</p>}

      {reading.length > 0 && (
        <>
          <h3 className="library-heading">Continue reading</h3>
          <div className="library">
            {reading.map((tile) => (
              <TileButton key={tile.name} tile={tile} />
            ))}
          </div>
          <h3 className="library-heading">Everything</h3>
        </>
      )}
      {listName && <h3 className="library-heading">{listName}</h3>}

      {shown.length === 0 && (
        <p className="library-status">
          {query.trim() === "" ? "Nothing on this list yet." : `Nothing in your library matches "${query}".`}
        </p>
      )}
      <div className="library">
        {shown.map((tile) => (
          <TileButton key={tile.name} tile={tile} />
        ))}
      </div>
    </div>
  );
}

export default Library;
