import { useEffect, useState } from "react";
import { clearFinished, stopDownloads, watchDownloads, type Downloads } from "./library/download";

// A thin bar under the tabs, on every screen, while chapters download.
function DownloadBar() {
  const [downloads, setDownloads] = useState<Downloads | null>(null);

  // watchDownloads hands back its own "stop watching", which React runs when the bar goes away.
  useEffect(() => watchDownloads(setDownloads), []);

  if (!downloads) return null;
  const left = downloads.waiting + downloads.downloading;
  if (left + downloads.done + downloads.failed === 0) return null; // nothing to show
  const failed = downloads.failed ? `, ${downloads.failed} failed` : "";

  return (
    <div className="download-bar">
      {left > 0 ? (
        <>
          <span>
            Downloading: {downloads.done} done, {left} to go{failed}
            {downloads.step && ` · ${downloads.step}`}
          </span>
          <button onClick={stopDownloads}>Stop</button>
        </>
      ) : (
        <>
          <span>
            Downloads finished: {downloads.done} done{failed}
          </span>
          <button onClick={clearFinished}>✕</button>
        </>
      )}
    </div>
  );
}

export default DownloadBar;
