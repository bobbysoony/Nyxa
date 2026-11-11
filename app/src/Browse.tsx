import { useState, useEffect } from "react";
import { sources } from "./sources";
import type { NovelItem, SourceNovel } from "./sources/types";
import { queueChapters } from "./library/download";
import { getChapters, listNovels, saveNovel, setAllRead, type LibraryRow } from "./library/db";
import { downloadCover } from "./library/covers";

const source = sources[0];

type BrowseProps = {
  onRead: (novelId: number) => void;
  novelId: number | null; // a library novel to open its page for, like from the Reader's button
};

function Browse({ onRead, novelId }: BrowseProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NovelItem[]>([]);
  const [novel, setNovel] = useState<SourceNovel | null>(null);
  const [chapterHtml, setChapterHtml] = useState("");
  const [status, setStatus] = useState(source ? "" : "No sources on this computer");
  const [library, setLibrary] = useState<LibraryRow[]>([]);
  const [libraryId, setLibraryId] = useState<number | null>(null);

  useEffect(() => {
    listNovels().then((rows) => {
      setLibrary(rows);
      const row = rows.find((r) => r.id === novelId);
      if (row) openNovel(row, rows);
    });
  }, []);

  async function search() {
    setStatus("Searching…");
    setNovel(null);
    try {
      const found = await source.searchNovels(query, 1);
      setResults(found);
      setStatus(`${found.length} found`);
    } catch (err) {
      setStatus(`Search failed: ${err}`);
    }
  }

  async function showNovels(latest: boolean) {
    setStatus(latest ? "Loading latest novels…" : "Loading popular novels…");
    setNovel(null);
    try {
      const found = await source.popularNovels(1, { showLatestNovels: latest });
      setResults(found);
      setStatus(`${found.length} found`);
    } catch (err) {
      setStatus(`Search failed: ${err}`);
    }
  }

  // `rows` is for the first load, before the `library` state has caught up.
  async function openNovel(item: NovelItem, rows = library) {
    setStatus(`Opening ${item.name}…`);
    setChapterHtml("");
    const saved = rows.find((row) => row.source === source.id && row.path === item.path);
    setLibraryId(saved?.id ?? null);
    try {
      const details = await source.parseNovel(item.path);
      setNovel(details);
      setStatus("");
    } catch (err) {
      if (!saved) return setStatus(`Couldn't open it: ${err}`);
      // Offline, but it's in your library: show what Nyxa saved instead.
      const chapters = await getChapters(saved.id);
      setNovel({
        name: saved.name,
        path: saved.path,
        author: saved.author ?? undefined,
        summary: saved.summary ?? undefined,
        chapters: chapters.map((chapter) => ({ name: chapter.name, path: chapter.path })),
      });
      setStatus("Couldn't reach the site, so this is what Nyxa has saved.");
    }
  }

  async function previewChapter(path: string) {
    setStatus("Loading chapter…");
    try {
      setChapterHtml(await source.parseChapter(path));
      setStatus("");
    } catch (err) {
      setStatus(`Couldn't load the chapter: ${err}`);
    }
  }

  const libraryRow = library.find((row) => row.id === libraryId);
  const allRead = libraryRow?.unread === 0;

  async function readItAll() {
    if (!libraryId) return;
    await setAllRead(libraryId, !allRead);
    setLibrary(await listNovels());
  }

  async function addToLibrary() {
    if (!novel) return;
    setStatus("Saving…");
    try {
      const id = await saveNovel(source.id, novel);
      if (novel.cover) downloadCover(`novel-${id}`, novel.cover).catch(console.error);
      setLibraryId(id);
      setLibrary(await listNovels());
      setStatus(`Saved with ${novel.chapters?.length ?? 0} chapters`);
    } catch (err) {
      setStatus(`Couldn't save it: ${err}`);
    }
  }

  async function download(count: number) {
    if (!libraryId) return;
    await queueChapters(source, libraryId, count);
  }

  return (
    <div className="browse">
      <div className="browse-bar">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search for a novel" />
        <button onClick={search} disabled={!source}>Search</button>
        <button onClick={() => showNovels(false)} disabled={!source}>Popular</button>
        <button onClick={() => showNovels(true)} disabled={!source}>Latest</button>
      </div>
      <p className="browse-status">{status}</p>

      {!novel && library.length > 0 && (
        <div className="library-list">
          <h3>In your library</h3>
          <ul>
            {library.map((row) => (
              <li key={row.id}>
                <button onClick={() => onRead(row.id)}>📖 {row.name} · Read: {row.total - row.unread} / {row.total.toLocaleString()}</button>
                {row.unread > 0 ? (
                  <span className="unread">{row.unread} unread</span>
                ) : (
                  <span className="read-badge">Read</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!novel && (
        <ul className="browse-results">
          {results.map((item) => (
            <li key={item.path}>
              <button onClick={() => openNovel(item)}>{item.name}</button>
            </li>
          ))}
        </ul>
      )}

      {novel && (
        <div className="novel-page">
          <button onClick={() => setNovel(null)}>◀ Results</button>
          <h2>
            {novel.name} {allRead && <span className="read-badge">Read</span>}
          </h2>
          <p className="novel-author">{novel.author}</p>
          <p className="novel-summary">{novel.summary}</p>
          <p>{novel.chapters?.length ?? 0} chapters</p>
          <button onClick={addToLibrary}>{libraryId ? "In your library ✓" : "Add to library"}</button>
          {libraryId && (
            <div className="download">
              <button onClick={() => onRead(libraryId)}>📖 Read</button>
              <button className="toggle" aria-pressed={allRead} onClick={readItAll}>
                Read it all
                <span className="tick">
                  {allRead && (
                    <svg viewBox="0 0 16 16" aria-hidden="true">
                      <path d="M3 8.5 L6.5 12 L13 4.5" />
                    </svg>
                  )}
                </span>
              </button>
              <button onClick={() => download(50)}>Download 50 chapters</button>
            </div>
          )}

          <ol className="novel-chapters">
            {novel.chapters?.slice(0, 20).map((ch) => (
              <li key={ch.path}>
                <button onClick={() => previewChapter(ch.path)}>{ch.name}</button>
              </li>
            ))}
          </ol>
        </div>
      )}

      {chapterHtml && (
        <div className="chapter-preview" dangerouslySetInnerHTML={{ __html: chapterHtml }} />
      )}
    </div>
  );
}

export default Browse;
