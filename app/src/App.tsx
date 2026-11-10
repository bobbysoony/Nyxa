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
import "./App.css";

function App() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [places, setPlaces] = useState<Place[]>([library]);
  const place = places[places.length - 1];
  const [check, setCheck] = useState<Check | null>(null);
  const latestPlaces = useRef(places); // lets the once-only Back listeners see the current pile

  useEffect(() => {
    loadSettings();
    checkForUpdates(setCheck);
  }, []);

  useEffect(() => {
    latestPlaces.current = places;
  }, [places]);

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
        <button className={place.screen === "updates" ? "active" : ""} onClick={() => go(updates)}>Updates</button>

      </nav>
      {place.screen === "library" && <Library onReadNovel={readNovel} onReadBook={readBook} found={check?.found ?? 0} />}
      {place.screen === "reader" && (
        <Reader settings={settings} onSettingsChange={changeSettings} novelId={place.novelId} bookId={place.bookId} />
      )}
      {place.screen === "browse" && <Browse onRead={readNovel} />}
      {place.screen === "updates" && (
        <Updates check={check} onCheck={() => checkForUpdates(setCheck)} onRead={readNovel} />
      )}
    </div>
  );
}

export default App;
