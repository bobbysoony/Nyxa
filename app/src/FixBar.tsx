import { useState } from "react";
import Dropdown from "./Dropdown";

type FixBarProps = {
  text: string;
  onHide: (everywhere: boolean) => void;
  onSwap: (replace: string, everywhere: boolean) => void;
  onClose: () => void;
};

// Shows up at the bottom of the Reader when you select some words in a novel
function FixBar({ text, onHide, onSwap, onClose }: FixBarProps) {
  // null = the two buttons, a string = the "replace with" box is open and this is whats typed in it
  const [replace, setReplace] = useState<string | null>(null);
  // where the fix counts, starts on just this novel since thats the safer one
  const [everywhere, setEverywhere] = useState(false);

  return (
    <div className="fix-bar">
      <span className="fix-text">“{text}”</span>
      <Dropdown
        label="Fix in"
        value={everywhere ? "library" : "novel"}
        options={[
          { value: "novel", label: "This novel" },
          { value: "library", label: "Whole library" },
        ]}
        onChange={(picked) => setEverywhere(picked === "library")}
      />
      {replace === null ? (
        <>
          <button onClick={() => onHide(everywhere)} disabled={text.length < 4}>Hide whole lines</button>
          <button onClick={() => setReplace("")}>Replace words…</button>
        </>
      ) : (
        <>
          <input
            autoFocus
            placeholder="new words (empty = just delete these words)"
            value={replace}
            onChange={(e) => setReplace(e.target.value)}
          />
          <button onClick={() => onSwap(replace, everywhere)}>Save</button>
        </>
      )}
      <button onClick={onClose} aria-label="Close">✕</button>
    </div>
  );
}

export default FixBar;
