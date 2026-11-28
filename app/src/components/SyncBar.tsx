import { useEffect, useState } from "react";
import { goThere, stayHere, watchSync } from "../sync/sync";
import type { NovelPlace } from "../sync/places";
import "./DownloadBar.css"; // same thin bar look as the download one

type Question = { place: NovelPlace; device: string };

// Shows under the tabs for a few seconds when a sync brings in your place from another device.
// If the other device is further along but this one moved more recently, it asks instead of picking
function SyncBar() {
  const [message, setMessage] = useState("");
  const [question, setQuestion] = useState<Question | null>(null);

  useEffect(
    () =>
      watchSync(({ take, ahead, device }) => {
        if (take.length > 0) {
          const what = take.length === 1 ? "your place in 1 novel" : `your places in ${take.length} novels`;
          setMessage(`Synced ${what} from ${device}`);
        }
        // one at a time, the next sync asks about the next one
        if (ahead.length > 0) setQuestion({ place: ahead[0], device });
      }),
    [],
  );

  // a question waits for an answer, a plain message goes away on its own
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 8_000);
    return () => clearTimeout(timer);
  }, [message]);

  if (question) {
    const { place, device } = question;
    const who = device.charAt(0).toUpperCase() + device.slice(1);
    return (
      <div className="download-bar" role="status">
        <span>
          {who} is on chapter {place.chapter} of {place.name}. Go there?
        </span>
        <button
          onClick={() => {
            setQuestion(null);
            goThere(place, device).catch(console.error);
          }}
        >
          Go
        </button>
        <button
          onClick={() => {
            setQuestion(null);
            stayHere(place).catch(console.error);
          }}
        >
          Stay
        </button>
      </div>
    );
  }

  if (!message) return null;

  return (
    <div className="download-bar" role="status">
      <span>{message}</span>
      <button onClick={() => setMessage("")} aria-label="Close">✕</button>
    </div>
  );
}

export default SyncBar;
