import { useEffect, useState } from "react";
import { listBooks, listNovels } from "./library/db";
import { moveOldBooks, prepareBooks, refreshCovers } from "./library/books";
import { coverLink } from "./library/covers";
import { continueReading, searchTiles, sortTiles, type Sort, type Tile } from "./library/shelf";
import Dropdown from "./Dropdown";

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
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M3 8.5 L6.5 12 L13 4.5" />
            </svg>
          </span>
        )}
      </span>
      <span className="library-title">{tile.title}</span>
      {tile.progress && <span className="library-progress">{tile.progress}</span>}
    </button>
  );
}

function Library({ onReadNovel, onReadBook, found }: LibraryProps) {
  const [tiles, setTiles] = useState<Tile[] | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("title");
  const [refreshing, setRefreshing] = useState(false);
  const [reload, setReload] = useState(0); // bumping it re-runs the effect below, so new covers show

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
        open: () => onReadBook(book.id),
      });
    }
    return tiles;
  }

  if (!tiles) return <p className="library-status">Loading your library…</p>;
  if (!tiles.length) {
    return <p className="library-status">Nothing here yet: open an EPUB, or add a novel in Browse.</p>;
  }

  const shown = sortTiles(searchTiles(tiles, query), sort);
  const reading = query.trim() === "" ? continueReading(tiles) : []; // searching hides the row, you're looking for something else

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
        <button onClick={refresh} disabled={refreshing}>
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>

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

      {shown.length === 0 && <p className="library-status">Nothing in your library matches "{query}".</p>}
      <div className="library">
        {shown.map((tile) => (
          <TileButton key={tile.name} tile={tile} />
        ))}
      </div>
    </div>
  );
}

export default Library;
