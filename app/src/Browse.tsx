import { useState, useEffect, useRef } from "react";
import { sources } from "./sources";
import type { NovelItem, SourceNovel } from "./sources/types";
import { listNovels, saveNovel, type LibraryRow } from "./library/db";
import { downloadChapters, type Progress } from "./library/download";


const source = sources[0];

function Browse({ onRead }: { onRead: (novelId: number) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NovelItem[]>([]);
  const [novel, setNovel] = useState<SourceNovel | null>(null);
  const [chapterHtml, setChapterHtml] = useState("");
  const [status, setStatus] = useState(source ? "" : "No sources on this computer");
  const [library, setLibrary] = useState<LibraryRow[]>([]);
  const [libraryId, setLibraryId] = useState<number | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [downloading, setDownloading] = useState(false);
  const stopRef = useRef(false);

  useEffect(() => {
    listNovels().then(setLibrary);
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

  async function openNovel(item: NovelItem) {
    setStatus(`Opening ${item.name}…`);
    setChapterHtml("");
    const saved = library.find((row) => row.source === source.id && row.path === item.path);
    setLibraryId(saved?.id ?? null);
    setProgress(null);
    try {
      const details = await source.parseNovel(item.path);
      setNovel(details);
      setStatus("");
    } catch (err) {
      setStatus(`Couldn't open it: ${err}`);
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

  async function addToLibrary() {
    if (!novel) return;
    setStatus("Saving…");
    try {
      const id = await saveNovel(source.id, novel);
      setLibraryId(id);
      setLibrary(await listNovels());
      setStatus(`Saved with ${novel.chapters?.length ?? 0} chapters`);
    } catch (err) {
      setStatus(`Couldn't save it: ${err}`);
    }
  }

  async function download(count: number) {
    if (!libraryId) return;
    stopRef.current = false;
    setDownloading(true);
    const result = await downloadChapters(source, libraryId, count, setProgress, () => stopRef.current);
    setDownloading(false);
    setStatus(`Downloaded ${result.done} chapters${result.failed ? `, ${result.failed} failed` : ""}`);
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
                <button onClick={() => onRead(row.id)}>📖 {row.name} · Read: {row.last_chapter ?? 0} / {row.total.toLocaleString()}</button>
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
          <h2>{novel.name}</h2>
          <p className="novel-author">{novel.author}</p>
          <p className="novel-summary">{novel.summary}</p>
          <p>{novel.chapters?.length ?? 0} chapters</p>
          <button onClick={addToLibrary}>{libraryId ? "In your library ✓" : "Add to library"}</button>
          {libraryId && (
            <div className="download">
              <button onClick={() => onRead(libraryId)}>📖 Read</button>
              <button onClick={() => download(50)} disabled={downloading}>Download 50 chapters</button>
              {downloading && <button onClick={() => (stopRef.current = true)}>Stop</button>}
              {progress && (
                <p>
                  <progress value={progress.done + progress.failed} max={progress.total} />{" "}
                  {progress.done} of {progress.total}
                  {progress.done === progress.total && " (All done!)"}
                  {progress.failed > 0 && `, ${progress.failed} failed`}
                </p>
              )}
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
