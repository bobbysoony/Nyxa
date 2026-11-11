import { useState } from "react";

type AutoDownloadProps = {
  on: boolean;
  limit: number;
  onDone: (on: boolean, limit: number) => void;
};

// The pop-out for one novel's auto-download settings.
// It changes its own copy, and hands the result back once, when it closes.
function AutoDownload({ on, limit, onDone }: AutoDownloadProps) {
  const [isOn, setIsOn] = useState(on);
  const [max, setMax] = useState(limit);

  return (
    <>
      <div className="backdrop" onClick={() => onDone(isOn, max)}></div>
      <div className="confirm auto-download" role="dialog" aria-modal="true" aria-labelledby="auto-title">
        <strong id="auto-title">Auto-download</strong>
        <button className="toggle" aria-pressed={isOn} onClick={() => setIsOn(!isOn)}>
          Download new chapters by themselves
          <span className="tick">
            {isOn && (
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M3 8.5 L6.5 12 L13 4.5" />
              </svg>
            )}
          </span>
        </button>
        <label>
          At most {max} chapters each check
          <input
            type="range"
            min="5"
            max="100"
            step="5"
            value={max}
            disabled={!isOn}
            onChange={(e) => setMax(Number(e.target.value))}
          />
        </label>
        <div className="confirm-buttons">
          <button onClick={() => onDone(isOn, max)}>Done</button>
        </div>
      </div>
    </>
  );
}

export default AutoDownload;
