import { useState } from "react";
import { Settings, defaultSettings } from "../settings";
import { loadSyncFile, saveSyncFile, SyncFile } from "../sync/drive";
import { SignInError } from "../sync/google";

type DriveSyncProps = {
  settings: Settings;
  onSettingsChange: (settings: Settings) => void;
};

// Just so the other device can say where the file came from
const thisDevice = navigator.userAgent.includes("Android") ? "your phone" : "a computer";

function DriveSync({ settings, onSettingsChange }: DriveSyncProps) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [found, setFound] = useState<SyncFile | null>(null);

  // Both buttons do the same dance, clear the note, do the work, show a message if it broke
  async function run(work: () => Promise<void>) {
    try {
      setNote("");
      setBusy(true);
      await work();
    } catch (err) {
      setNote(err instanceof SignInError ? err.message : "Couldn't reach your Drive. Check your internet and try again.");
      console.error(err);
    } finally {
      setBusy(false);
    }
  }

  const save = () =>
    run(async () => {
      await saveSyncFile({ savedAt: Date.now(), device: thisDevice, settings });
      setFound(null);
      setNote("Saved to your Drive");
    });

  const get = () =>
    run(async () => {
      const file = await loadSyncFile();
      setFound(file);
      if (!file) setNote("Nothing in your Drive yet. Press Save to Drive on your other device first.");
    });

  function takeSettings(file: SyncFile) {
    // Your fixes stay as they are, like with Reset, because they point at novels by this device's numbers
    onSettingsChange({
      ...defaultSettings,
      ...file.settings,
      filters: settings.filters,
      swaps: settings.swaps,
      novelFilters: settings.novelFilters,
    });
    setFound(null);
    setNote("Using those settings now");
  }

  return (
    <div className="sync">
      <button disabled={busy} onClick={save}>Save to Drive</button>
      <button disabled={busy} onClick={get}>Get from Drive</button>
      {found && (
        <>
          <span>
            Saved from {found.device}, {new Date(found.savedAt).toLocaleString()} ({found.settings.theme}, {found.settings.fontSize}px)
          </span>
          <button onClick={() => takeSettings(found)}>Use these settings</button>
        </>
      )}
      {note && <span className="sync-note">{note}</span>}
    </div>
  );
}

export default DriveSync;
