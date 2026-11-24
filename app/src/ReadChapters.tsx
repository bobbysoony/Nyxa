import { useState } from "react";

export type ReadChoice = { kind: "all" } | { kind: "upTo"; chapter: number } | { kind: "none" };

type ReadChaptersProps = {
  total: number;
  onPick: (choice: ReadChoice) => void;
  onClose: () => void;
};

// The pop-out behind the novel page's "Mark read" button: everything, up to a chapter, or nothing.
function ReadChapters({ total, onPick, onClose }: ReadChaptersProps) {
  const [chapter, setChapter] = useState(1);
  const [pickingChapter, setPickingChapter] = useState(false);

  return (
    <>
      <div className="backdrop" onClick={onClose}></div>
      <div className="confirm read-chapters" role="dialog" aria-modal="true" aria-label="Mark chapters read">
        <button onClick={() => onPick({ kind: "all" })}>Read it all</button>
        <div className="read-up-to-group">
          <button aria-expanded={pickingChapter} onClick={() => setPickingChapter(!pickingChapter)}>
            Read up to chapter {pickingChapter ? "▴" : "▾"}
          </button>
          {pickingChapter && (
            <div className="read-up-to">
              <input
                type="number"
                min="1"
                max={total}
                value={chapter}
                aria-label="Chapter"
                autoFocus
                onChange={(e) => setChapter(Number(e.target.value))}
              />
              <button disabled={!(chapter >= 1 && chapter <= total)} onClick={() => onPick({ kind: "upTo", chapter })}>
                Mark
              </button>
            </div>
          )}
        </div>
        <button onClick={() => onPick({ kind: "none" })}>Mark all unread</button>
      </div>
    </>
  );
}

export default ReadChapters;
