import { useEffect, useRef, useState } from "react";
import { load } from "@tauri-apps/plugin-store";
import { exit, onBackButtonPress } from "@tauri-apps/api/app";
import Reader from "./Reader";
import Browse from "./Browse";
import Library from "./Library";
import { defaultSettings, Settings, getTheme } from "./settings";
import { Place, browse, goBack, goTo, library, reader, updates } from "./places";
import Updates from "./Updates";
import { checkForUpdates, type Check } from "./library/updates";
import { listNovels } from "./library/db";
import DownloadBar from "./DownloadBar";
import "./App.css";

function App() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [places, setPlaces] = useState<Place[]>([library]);
  const place = places[places.length - 1];
  const [check, setCheck] = useState<Check | null>(null);
  const [fresh, setFresh] = useState(0);
  const latestPlaces = useRef(places); // lets the once-only Back listeners see the current pile

  useEffect(() => {
    loadSettings();
    checkOnOpen();
  }, []);

  useEffect(() => {
    latestPlaces.current = places;
  }, [places]);

  // Counted from the database like the covers, so it survives a restart and drops as you read.
  useEffect(() => {
    listNovels().then((novels) => setFresh(novels.reduce((sum, novel) => sum + novel.fresh, 0)));
  }, [place, check?.found]);

  useEffect(() => {
    if (!navigator.userAgent.includes("Android")) return; // only phones have a Back button
    const listener = onBackButtonPress(() => {
      if (!back()) exit(0);
    });
    return () => {
      listener.then((l) => l.unregister());
    };
  }, []);

  useEffect(() => {
    function handleMouseUp(event: MouseEvent) {
      if (event.button !== 3) return; // 3 is the mouse's Back button
      back();
    }

    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, []);

  useEffect(() => {
    if (!settings) return;
    const theme = getTheme(settings.theme);
    document.documentElement.style.setProperty("--page", theme.background);
    document.documentElement.style.setProperty("--text", theme.text);
  }, [settings]);

  // At most once an hour, so opening Nyxa ten times doesn't ask every site ten times.
  async function checkOnOpen() {
    const store = await load("nyxa.json");
    const last = (await store.get<number>("lastCheck")) ?? 0;
    if (Date.now() - last < 60 * 60 * 1000) return;
    const result = await checkForUpdates(setCheck);
    // Only once a novel really got checked, so opening Nyxa offline doesn't wait an hour to try again.
    if (result && result.failed < result.total) await store.set("lastCheck", Date.now());
  }

  async function loadSettings() {
    const store = await load("nyxa.json");
    const saved = await store.get<Settings>("settings");
    setSettings({ ...defaultSettings, ...saved });
  }

  async function changeSettings(newSettings: Settings) {
    setSettings(newSettings);
    const store = await load("nyxa.json");
    await store.set("settings", newSettings);
  }

  function go(next: Place) {
    setPlaces(goTo(places, next));
  }

  // Returns false when there's nowhere left to go back to.
  function back() {
    const before = goBack(latestPlaces.current);
    if (before) setPlaces(before);
    return before !== null;
  }

  function readNovel(id: number) {
    go({ ...reader, novelId: id });
  }

  function readBook(id: number) {
    go({ ...reader, bookId: id });
  }

  if (!settings) return <p>Loading…</p>;

  return (
    <div className="app">
      <nav className="app-tabs">
        <button className={place.screen === "library" ? "active" : ""} onClick={() => go(library)}>Library</button>
        <button className={place.screen === "reader" ? "active" : ""} onClick={() => go(reader)}>Reader</button>
        <button className={place.screen === "browse" ? "active" : ""} onClick={() => go(browse)}>Browse</button>
        <button className={place.screen === "updates" ? "active" : ""} onClick={() => go(updates)}>
          Updates{fresh ? ` (${fresh})` : ""}
        </button>
      </nav>
      <DownloadBar />
      {place.screen === "library" && <Library onReadNovel={readNovel} onReadBook={readBook} found={check?.found ?? 0} />}
      {place.screen === "reader" && (
        <Reader
          settings={settings}
          onSettingsChange={changeSettings}
          novelId={place.novelId}
          bookId={place.bookId}
          onShowNovel={(id) => go({ ...browse, novelId: id })}
        />
      )}
      {/* The key starts Browse fresh when the novel changes, e.g. Back from a novel page to plain Browse. */}
      {place.screen === "browse" && <Browse key={place.novelId ?? "all"} onRead={readNovel} novelId={place.novelId} />}
      {place.screen === "updates" && (
        <Updates check={check} onCheck={() => checkForUpdates(setCheck)} onRead={readNovel} />
      )}
    </div>
  );
}

export default App;
