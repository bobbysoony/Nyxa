import { useEffect, useRef, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { BaseDirectory, exists, mkdir, readFile, writeFile } from "@tauri-apps/plugin-fs";
import { load } from "@tauri-apps/plugin-store";                                  
import "../foliate-js/view.js";

// Most books give their title as text, but some give a set of
// translations, this hanldes both.
function getTitle(title: string | Record<string, string> | undefined) {
  if (!title) return "";
  if (typeof title === "string") return title;
  return Object.values(title)[0] ?? "";
}

type SavedBook = {
  file: string;
  position: string;
};

function Reader() {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<any>(null);
  const bookFileRef = useRef("");
  const startedRef = useRef(false);
  const [title, setTitle] = useState("");
  const [chapter, setChapter] = useState("");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  function handleKey(e: KeyboardEvent) {
    if (e.key === "ArrowRight") viewRef.current?.goRight();
    if (e.key === "ArrowLeft") viewRef.current?.goLeft();
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

  async function savePosition(position: string){
    const store = await load("nyxa.json");
    await store.set("lastBook", {file: bookFileRef.current, position});
  }

  async function reopenLastBook(){
    try {
      const store = await load("nyxa.json");
      const saved = await store.get<SavedBook>("lastBook");
      if (!saved) return;

      const stillThere = await exists(saved.file, {baseDir: BaseDirectory.AppData});
      if (!stillThere) return;

      const epubContent = await readFile(saved.file, {baseDir: BaseDirectory.AppData});
      bookFileRef.current = saved.file;
      await openBook(new File([epubContent], saved.file), saved.position);
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
    view.renderer.setStyles?.("html, body { background: #15151c !important; color: #d8d8e0 !important; } body * { color: inherit !important; }");
    setTitle(getTitle(view.book.metadata?.title) || file.name);
    
    if (position) {
      await view.init({lastLocation: position});
    }else{
      await view.init({showTextStart: true});
    }
  }

  return (
    <div className="reader">
      <div className="reader-bar">
        <button
          onClick={pickBook}>
          📖 Open Book
        </button>
        <span>{title}</span>
        <span>{error}</span>
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
