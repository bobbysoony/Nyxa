import { useState } from "react";
import { sources } from "./sources";
import type { NovelItem, SourceNovel } from "./sources/types";

const source = sources[0];

function Browse() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NovelItem[]>([]);
  const [novel, setNovel] = useState<SourceNovel | null>(null);
  const [chapterHtml, setChapterHtml] = useState("");
  const [status, setStatus] = useState(source ? "" : "No sources on this computer");

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

  async function openNovel(item: NovelItem) {
    setStatus(`Opening ${item.name}…`);
    setChapterHtml("");
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

  return (
    <div className="browse">
      <div className="browse-bar">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search for a novel" />
        <button onClick={search} disabled={!source}>Search</button>
      </div>
      <p className="browse-status">{status}</p>

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