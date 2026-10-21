import { useEffect, useRef, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { BaseDirectory, exists, mkdir, readFile, writeFile } from "@tauri-apps/plugin-fs";
import { load } from "@tauri-apps/plugin-store";
import "../foliate-js/view.js";
import SettingsPanel from "./SettingsPanel";
import { makeBookCSS, Settings } from "./settings";
import { getTitle } from "./getTitle";

type SavedBook = {
  file: string;
  position: string;
};

type ReaderProps = {
  settings: Settings;
  onSettingsChange: (newSettings: Settings) => void;
};

function Reader({ settings, onSettingsChange }: ReaderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<any>(null);
  const bookFileRef = useRef("");
  const startedRef = useRef(false);
  const [title, setTitle] = useState("");
  const [chapter, setChapter] = useState("");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [welcome, setWelcome] = useState("");
  const [showSettings, setShowSettings] = useState(false);

  function handleKey(e: KeyboardEvent) {
    if (e.key === "ArrowRight") viewRef.current?.goRight();
    if (e.key === "ArrowLeft") viewRef.current?.goLeft();
    if (e.key === "Escape") setShowSettings(false);
  }

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    reopenLastBook();
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

  async function openBook(file: File, position?: string) {
    viewRef.current?.remove();

    const view = document.createElement("foliate-view") as any;
    containerRef.current?.append(view);
    viewRef.current = view;

    view.addEventListener("relocate", (e: any) => {
      setChapter(e.detail.tocItem?.label ?? "");
      setProgress(Math.round((e.detail.fraction ?? 0) * 100));
      savePosition(e.detail.cfi);
    });

    view.addEventListener("load", (e: any) => {
      e.detail.doc.addEventListener("keydown", handleKey);
    });

    await view.open(file);
    applySettings();
    setTitle(getTitle(view.book.metadata?.title) || file.name);

    if (position) {
      await view.init({ lastLocation: position });
    } else {
      await view.init({ showTextStart: true });
    }
  }

  return (
    <div className="reader">
      <div className="reader-bar">
        <button onClick={pickBook}>📖 Open book</button>
        <span>{title}</span>
        <span>{error}</span>
        <span>{welcome}</span>
        <button onClick={() => setShowSettings(!showSettings)}>Aa</button>
        {showSettings && (
          <div className="backdrop" onClick={() => setShowSettings(false)}></div>
        )}
        {showSettings && (
          <SettingsPanel settings={settings} onChange={onSettingsChange} />
        )}
      </div>

      <div className="reader-page" ref={containerRef}></div>

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
