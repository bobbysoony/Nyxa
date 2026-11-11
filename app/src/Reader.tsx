import { useEffect, useRef, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { readFile } from "@tauri-apps/plugin-fs";
import { load } from "@tauri-apps/plugin-store";
import "../foliate-js/view.js";
import SettingsPanel from "./SettingsPanel";
import { makeBookCSS, Settings } from "./settings";
import { getTitle } from "./getTitle";
import { tapZone } from "./taps";
import type { FoliateBook, FoliateView } from "./foliate";
import { makeNovelBook, type NovelBook } from "./library/novelBook";
import Contents from "./Contents.tsx";
import {
  getNovel,
  markReadBefore,
  saveBookPosition,
  saveBookRead,
  saveNovelPosition,
  setChapterRead,
} from "./library/db";
import { addBook, loadBook, tocHrefs } from "./library/books";
import { chapterFromHref, paragraphAt, positionHref } from "./library/position";
import { finishedChapter } from "./library/finished";
import { timeLeft, wordsLeft } from "./library/timeleft";


type ReaderProps = {
  settings: Settings;
  onSettingsChange: (settings: Settings) => void;
  novelId: number | null;
  bookId: number | null;
  onShowNovel: (novelId: number) => void;
};

function Reader({ settings, onSettingsChange, novelId, bookId, onShowNovel }: ReaderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<FoliateView | null>(null);
  const bookIdRef = useRef<number | null>(null);
  const novelRef = useRef<NovelBook | null>(null);
  const lastIndexRef = useRef<number | null>(null);
  const tocHrefsRef = useRef<string[]>([]);
  const startedRef = useRef(false);
  const [title, setTitle] = useState("");
  const [chapter, setChapter] = useState("");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [welcome, setWelcome] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [barsHidden, setBarsHidden] = useState(false);
  const [showContents, setShowContents] = useState(false);
  const [downloaded, setDownloaded] = useState<number | null>(null);
  const [place, setPlace] = useState("");
  const [readChapters, setReadChapters] = useState<Set<number> | null>(null);
  const [words, setWords] = useState(0);


  function handleKey(e: KeyboardEvent) {
    if (e.key === "ArrowRight") viewRef.current?.goRight();
    if (e.key === "ArrowLeft") viewRef.current?.goLeft();
    if (e.key === "Escape") setShowSettings(false);
  }

  function tapAt(x: number) {
    const page = containerRef.current?.getBoundingClientRect();
    if (!page) return;
    const zone = tapZone(x - page.left, page.width);

    if (zone === "left") viewRef.current?.goLeft();
    else if (zone === "right") viewRef.current?.goRight();
    else if (window.matchMedia("(pointer: coarse)").matches && viewRef.current) { setBarsHidden((hidden) => !hidden); }
  }

  function handleBookClick(e: MouseEvent, doc: Document) {
    const target = e.target as Element;
    if (target.closest("a")) return;
    if (!doc.getSelection()?.isCollapsed) return;

    const frame = doc.defaultView?.frameElement;
    tapAt((frame?.getBoundingClientRect().left ?? 0) + e.clientX);
  }

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    start();
  }, []);

  function start() {
    if (novelId) openNovel(novelId);
    else if (bookId) openEpub(bookId);
    else reopenLastBook();
  }

  useEffect(() => {
    applySettings();
  }, [settings]);

  function applySettings() {
    const view = viewRef.current;
    if (!view?.renderer) return;
    view.renderer.setStyles?.(makeBookCSS(settings));
    view.renderer.setAttribute("gap", `${settings.margin}%`);
    view.renderer.setAttribute("flow", settings.readingMode);
  }

  async function pickBook() {
    try {
      setError("");
      const path = await open({
        filters: [{ name: "EPUB books", extensions: ["epub"] }]
      });
      if (!path) return;

      const id = await addBook(await readFile(path));
      await openEpub(id);
    } catch (err) {
      setError("Failed to open book");
      console.error(err);
    }
  }

  async function openEpub(id: number) {
    const loaded = await loadBook(id);
    if (!loaded) return null;

    bookIdRef.current = id;
    novelRef.current = null;
    lastIndexRef.current = null;
    setReadChapters(new Set(JSON.parse(loaded.row.read)));
    const store = await load("nyxa.json");
    await store.set("lastNovel", null);
    await store.set("lastBookId", id);
    await openBook(loaded.book, loaded.row.position ?? undefined);
    return loaded.row.title;
  }

  async function reopenLastBook(epubOnly = false) {
    try {
      const store = await load("nyxa.json");
      const lastNovel = await store.get<number | null>("lastNovel");
      if (lastNovel && !epubOnly) {
        await openNovel(lastNovel);
        return;
      }
      const lastBookId = await store.get<number>("lastBookId");
      const title = lastBookId ? await openEpub(lastBookId) : null;
      if (!title) return;

      setWelcome(`Welcome back to ${title}!`);
      setTimeout(() => setWelcome(""), 3000);
    } catch (err) {
      setError("Failed to reopen last book");
      console.error(err);
    }
  }

  async function openNovel(id: number) {
    bookIdRef.current = null;
    const book = await makeNovelBook(id);
    if (!book) {
      setError("This novel has no chapters yet");
      return;
    }

    const store = await load("nyxa.json");
    await store.set("lastNovel", id);

    const novel = await getNovel(id);
    const position = novel?.last_chapter
      ? positionHref(novel.last_chapter, novel.last_paragraph)
      : undefined;

    novelRef.current = book;
    lastIndexRef.current = null;
    setReadChapters(new Set(book.chapters.filter((c) => c.read).map((c) => c.number)));
    await openBook(book, position);
    setDownloaded(book.chapters.filter((chapter) => chapter.downloaded).length);
  }

  function markRead(number: number, read: boolean) {
    const novel = novelRef.current;
    if (novel) setChapterRead(novel.novelId, number, read);
    setReadChapters((old) => {
      const updated = new Set(old);
      if (read) updated.add(number);
      else updated.delete(number);
      return updated;
    });
  }

  function readKey(href: string) {
    return novelRef.current ? chapterFromHref(href) : tocHrefsRef.current.indexOf(href);
  }

  // Novels save each tick as it happens (markRead); an EPUB saves its whole list.
  useEffect(() => {
    if (!bookIdRef.current || !readChapters) return;
    saveBookRead(bookIdRef.current, [...readChapters]);
  }, [readChapters]);

  function readUpToHere() {
    const index = lastIndexRef.current;
    if (index === null) return;
    const novel = novelRef.current;
    if (!novel) {
      setReadChapters((old) => new Set([...(old ?? []), ...Array(index).keys()]));
      return;
    }
    const current = novel.chapters[index].number;
    markReadBefore(novel.novelId, current);
    setReadChapters((old) => {
      const updated = new Set(old);
      for (const chapter of novel.chapters) {
        if (chapter.number < current) updated.add(chapter.number);
      }
      return updated;
    });
  }

  async function openBook(book: File | FoliateBook, position?: string) {
    setDownloaded(null); // EPUB files have no download count
    viewRef.current?.remove();

    const view = document.createElement("foliate-view");
    containerRef.current?.append(view);
    viewRef.current = view;

    view.addEventListener("relocate", (e) => {
      setChapter(e.detail.tocItem?.label ?? "");
      setProgress(Math.round((e.detail.fraction ?? 0) * 100));
      setWords(wordsLeft(e.detail.range));

      const novel = novelRef.current;
      if (novel) {
        const index = e.detail.section?.current ?? 0;
        setPlace(novel.places[index] ?? "");
        saveNovelPosition(novel.novelId, novel.chapters[index].number, paragraphAt(e.detail.range));
        const finished = finishedChapter(lastIndexRef.current, index);
        lastIndexRef.current = index;
        if (finished !== null) markRead(novel.chapters[finished].number, true);
      } else {
        setPlace("");
        if (bookIdRef.current) saveBookPosition(bookIdRef.current, e.detail.cfi);
        const index = tocHrefsRef.current.indexOf(e.detail.tocItem?.href ?? "");
        if (index < 0) return;
        const finished = finishedChapter(lastIndexRef.current, index);
        lastIndexRef.current = index;
        if (finished !== null) markRead(finished, true);
      }
    });

    view.addEventListener("load", (e) => {
      const doc = e.detail.doc;
      doc.addEventListener("keydown", handleKey);
      doc.addEventListener("click", (ev) => handleBookClick(ev, doc));
    });

    await view.open(book);
    // Same two levels Contents shows, so an EPUB chapter's number is its place in this list.
    tocHrefsRef.current = tocHrefs(view.book);
    applySettings();
    setTitle(getTitle(view.book.metadata?.title) || (book instanceof File ? book.name : ""));

    if (position) {
      // A place saved in another version of this book may not fit this one: start at the top.
      await view.init({ lastLocation: position }).catch(() => view.init({ showTextStart: true }));
    } else {
      await view.init({ showTextStart: true });
    }
  }

  const left = timeLeft(words, settings.wordsPerMinute);

  return (
    <div className={barsHidden ? "reader bars-hidden" : "reader"}>
      <div className="reader-bar">
        <button onClick={pickBook}>📖 Open book</button>
        <button onClick={() => reopenLastBook(true)}>📚 Last EPUB</button>
        <button onClick={() => setShowContents(true)}>☰ Contents</button>
        {novelRef.current && (
          <button onClick={() => novelRef.current && onShowNovel(novelRef.current.novelId)}>ℹ Novel page</button>
        )}
        <span>{title}</span>
        {error && <span>{error}</span>}
        <span>{welcome}</span>
        <button onClick={() => setShowSettings(!showSettings)}>Aa</button>
        {showSettings && (
          <div className="backdrop" onClick={() => setShowSettings(false)}></div>
        )}
        {showSettings && (
          <SettingsPanel settings={settings} onChange={onSettingsChange} />
        )}
      </div>

      <div className="reader-page" ref={containerRef} onClick={(e) => tapAt(e.clientX)}></div>

      {showContents && (
        <Contents
          toc={viewRef.current?.book.toc ?? []}
          current={chapter}
          downloaded={downloaded}
          onPick={(href) => {
            viewRef.current?.goTo(href);
            setShowContents(false);
          }}
          onClose={() => setShowContents(false)}
          isRead={(href) => readChapters?.has(readKey(href)) ?? false}
          onToggleRead={
            readChapters
              ? (href) => {
                const number = readKey(href);
                markRead(number, !readChapters.has(number));
              }
              : undefined
          }
          onReadUpToHere={readChapters ? readUpToHere : undefined}
        />
      )}

      {showContents && <div className="backdrop" onClick={() => setShowContents(false)}></div>}

      <div className="reader-bar">
        <button onClick={() => viewRef.current?.prev()}>◀ Back</button>
        <span>
          {place || chapter} {progress}%
          {settings.showTimeLeft && left && <span className="reader-time-left"> · {left}</span>}
        </span>
        <button onClick={() => viewRef.current?.next()}>Next ▶</button>
      </div>
    </div>
  );
}

export default Reader;
