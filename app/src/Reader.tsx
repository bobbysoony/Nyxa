import { useEffect, useRef, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { BaseDirectory, exists, mkdir, readFile, writeFile } from "@tauri-apps/plugin-fs";
import { load } from "@tauri-apps/plugin-store";
import "../foliate-js/view.js";
import SettingsPanel from "./SettingsPanel";
import { makeBookCSS, Settings } from "./settings";
import { getTitle } from "./getTitle";
import { tapZone } from "./taps";
import type { FoliateBook, FoliateView } from "./foliate";
import { makeNovelBook, type NovelBook } from "./library/novelBook";
import Contents from "./Contents.tsx";
import { getNovel, markReadBefore, saveNovelPosition, setChapterRead } from "./library/db";
import { chapterFromHref, paragraphAt, positionHref } from "./library/position";
import { finishedChapter } from "./library/finished";

type SavedBook = {
  file: string;
  position: string;
};

type ReaderProps = {
  settings: Settings;
  onSettingsChange: (settings: Settings) => void;
  novelId: number | null;
};

function Reader({ settings, onSettingsChange, novelId }: ReaderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<FoliateView | null>(null);
  const bookFileRef = useRef("");
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
    if (novelId) openNovel(novelId);
    else reopenLastBook();
  }, []);

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

      const epubContent = await readFile(path);
      const fileName = `books/${Date.now()}.epub`;
      await mkdir("books", { baseDir: BaseDirectory.AppData, recursive: true });
      await writeFile(fileName, epubContent, { baseDir: BaseDirectory.AppData });

      bookFileRef.current = fileName;
      novelRef.current = null;
      lastIndexRef.current = null;
      setReadChapters(new Set());
      const store = await load("nyxa.json");
      await store.set("lastNovel", null);
      await openBook(new File([epubContent], fileName));

    } catch (err) {
      setError("Failed to open book");
      console.error(err);
    }
  }

  async function savePosition(position: string) {
    if (!bookFileRef.current) return;
    const store = await load("nyxa.json");
    await store.set("lastBook", { file: bookFileRef.current, position });
  }

  async function reopenLastBook(epubOnly = false) {
    try {
      const store = await load("nyxa.json");
      const lastNovel = await store.get<number | null>("lastNovel");
      if (lastNovel && !epubOnly) {
        await openNovel(lastNovel);
        return;
      }
      const saved = await store.get<SavedBook>("lastBook");
      if (!saved) return;

      const stillThere = await exists(saved.file, { baseDir: BaseDirectory.AppData });
      if (!stillThere) return;

      const epubContent = await readFile(saved.file, { baseDir: BaseDirectory.AppData });
      bookFileRef.current = saved.file;
      novelRef.current = null;
      lastIndexRef.current = null;
      setReadChapters(new Set(await store.get<number[]>(`read ${saved.file}`)));
      await store.set("lastNovel", null);
      await openBook(new File([epubContent], saved.file), saved.position);
      setWelcome("Welcome back! Picking up where you left off.");
      setTimeout(() => setWelcome(""), 3000);
    } catch (err) {
      setError("Failed to reopen last book");
      console.error(err);
    }
  }

  async function openNovel(id: number) {
    bookFileRef.current = "";
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

  // Novels save read chapters in the database; EPUBs keep them in nyxa.json.
  useEffect(() => {
    if (!bookFileRef.current || !readChapters) return;
    load("nyxa.json").then((store) => store.set(`read ${bookFileRef.current}`, [...readChapters]));
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
        savePosition(e.detail.cfi);
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
    tocHrefsRef.current = (view.book.toc ?? []).flatMap((item) => [
      item.href,
      ...(item.subitems ?? []).map((sub) => sub.href),
    ]);
    applySettings();
    setTitle(getTitle(view.book.metadata?.title) || (book instanceof File ? book.name : ""));

    if (position) {
      await view.init({ lastLocation: position });
    } else {
      await view.init({ showTextStart: true });
    }
  }

  return (
    <div className={barsHidden ? "reader bars-hidden" : "reader"}>
      <div className="reader-bar">
        <button onClick={pickBook}>📖 Open book</button>
        <button onClick={() => reopenLastBook(true)}>📚 Last EPUB</button>
        <button onClick={() => setShowContents(true)}>☰ Contents</button>
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
        </span>
        <button onClick={() => viewRef.current?.next()}>Next ▶</button>
      </div>
    </div>
  );
}

export default Reader;
