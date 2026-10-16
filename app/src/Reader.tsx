import { useEffect, useRef, useState } from "react";
import "../foliate-js/view.js";

// Most books give their title as text, but some give a set of
// translations instead, like { ja: "シャドウ・スレイブ" }. Handle both.
function getTitle(title: string | Record<string, string> | undefined) {
  if (!title) return "";
  if (typeof title === "string") return title;
  return Object.values(title)[0] ?? "";
}

function Reader() {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<any>(null);
  const [title, setTitle] = useState("");
  const [chapter, setChapter] = useState("");
  const [progress, setProgress] = useState(0);

  function handleKey(e: KeyboardEvent) {
    if (e.key === "ArrowRight") viewRef.current?.goRight();
    if (e.key === "ArrowLeft") viewRef.current?.goLeft();
  }

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  async function openBook(file: File) {
    viewRef.current?.remove();

    const view = document.createElement("foliate-view") as any;
    containerRef.current?.append(view);
    viewRef.current = view;

    view.addEventListener("relocate", (e: any) => {
      setChapter(e.detail.tocItem?.label ?? "");
      setProgress(Math.round((e.detail.fraction ?? 0) * 100));
    });

    view.addEventListener("load", (e: any) => {
      e.detail.doc.addEventListener("keydown", handleKey);
    });

    await view.open(file);
    view.renderer.setStyles?.("html { background: #15151c; color: #d8d8e0; }");
    setTitle(getTitle(view.book.metadata?.title) || file.name);
    await view.init({ showTextStart: true });
  }

  return (
    <div className="reader">
      <div className="reader-bar">
        <input
          type="file"
          accept=".epub"
          onChange={(e) => {
            const file = e.currentTarget.files?.[0];
            if (file) openBook(file);
          }}
        />
        <span>{title}</span>
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
