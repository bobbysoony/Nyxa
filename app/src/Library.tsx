import { useEffect, useState } from "react";
import { listBooks, listNovels } from "./library/db";
import { moveOldBooks, prepareBooks } from "./library/books";
import { coverLink } from "./library/covers";

// One cover in the grid: a novel or an EPUB, the library treats them the same.
type Tile = {
  name: string; // "novel-1" or "book-3", also the cover's file name
  title: string;
  cover: string | null;
  finished: boolean;
  progress: string;
  fresh: number;
  open: () => void;
};

type LibraryProps = {
  onReadNovel: (id: number) => void;
  onReadBook: (id: number) => void;
  found: number;
};

function progressText(read: number, total: number) {
  return total > 0 ? `${read.toLocaleString()} / ${total.toLocaleString()} read` : "";
}

function Library({ onReadNovel, onReadBook, found }: LibraryProps) {
  const [tiles, setTiles] = useState<Tile[] | null>(null);

  useEffect(() => {
    let links: string[] = [];
    loadTiles().then((loaded) => {
      links = loaded.flatMap((tile) => (tile.cover ? [tile.cover] : []));
      setTiles(loaded);
    });
    // blob: links hold the picture in memory until they're revoked, so free them when you leave.
    return () => links.forEach((link) => URL.revokeObjectURL(link));
  }, [found]);

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
        open: () => onReadBook(book.id),
      });
    }
    return tiles.sort((a, b) => a.title.localeCompare(b.title));
  }

  if (!tiles) return <p className="library-status">Loading your library…</p>;
  if (!tiles.length) {
    return <p className="library-status">Nothing here yet: open an EPUB, or add a novel in Browse.</p>;
  }

  return (
    <div className="library">
      {tiles.map((tile) => (
        <button key={tile.name} className="library-tile" onClick={tile.open}>
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
      ))}
    </div>
  );
}

export default Library;
