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
import { makeNovelBook } from "./library/novelBook";
import Contents from "./Contents";

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
  const startedRef = useRef(false);
  const [title, setTitle] = useState("");
  const [chapter, setChapter] = useState("");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [welcome, setWelcome] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [barsHidden, setBarsHidden] = useState(false);
  const [showContents, setShowContents] = useState(false);


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

  useEffect(() => {                       // your startup effect from lesson 4b
    if (startedRef.current) return;
    startedRef.current = true;
    if (novelId) openNovel(novelId);      // changed
    else reopenLastBook();                // changed
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

  async function reopenLastBook() {
    try {
      const store = await load("nyxa.json");
      const saved = await store.get<SavedBook>("lastBook");
      if (!saved) return;

      const stillThere = await exists(saved.file, { baseDir: BaseDirectory.AppData });
      if (!stillThere) return;

      const epubContent = await readFile(saved.file, { baseDir: BaseDirectory.AppData });
      bookFileRef.current = saved.file;
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
    await openBook(book);
  }

  async function openBook(book: File | FoliateBook, position?: string) {
    viewRef.current?.remove();

    const view = document.createElement("foliate-view");
    containerRef.current?.append(view);
    viewRef.current = view;

    view.addEventListener("relocate", (e) => {
      setChapter(e.detail.tocItem?.label ?? "");
      setProgress(Math.round((e.detail.fraction ?? 0) * 100));
      savePosition(e.detail.cfi);
    });

    view.addEventListener("load", (e) => {
      const doc = e.detail.doc;
      doc.addEventListener("keydown", handleKey);
      doc.addEventListener("click", (ev) => handleBookClick(ev, doc));
    });

    await view.open(book);
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
          onPick={(href) => {
            viewRef.current?.goTo(href);
            setShowContents(false);
          }}
          onClose={() => setShowContents(false)}
        />
      )}

      <div className="reader-bar">
        <button onClick={() => viewRef.current?.prev()}>◀ Back</button>
        <span>
          {chapter} {progress}%
        </span>
        <button onClick={() => viewRef.current?.next()}>Next ▶</button>
      </div>
    </div>
  );
}

export default Reader;
