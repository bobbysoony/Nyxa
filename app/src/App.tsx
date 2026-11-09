import { useEffect, useState } from "react";
import { load } from "@tauri-apps/plugin-store";
import { exit, onBackButtonPress } from "@tauri-apps/api/app";
import Reader from "./Reader";
import Browse from "./Browse";
import Library from "./Library";
import { defaultSettings, Settings, getTheme } from "./settings";
import { Place, browse, goBack, goTo, library, reader } from "./places";
import "./App.css";

function App() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [places, setPlaces] = useState<Place[]>([library]);
  const place = places[places.length - 1];

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (!navigator.userAgent.includes("Android")) return; // only phones have a Back button
    const listener = onBackButtonPress(() => {
      const before = goBack(places);
      if (before) setPlaces(before);
      else exit(0);
    });
    return () => {
      listener.then((l) => l.unregister());
    };
  }, [places]);

  useEffect(() => {
    function handleMouseUp(event: MouseEvent) {
      if (event.button !== 3) return; // 3 is the mouse's Back button
      const before = goBack(places);
      if (before) setPlaces(before);
    }

    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, [places]);


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

      </nav>
      {place.screen === "library" && <Library onReadNovel={readNovel} onReadBook={readBook} />}
      {place.screen === "reader" && (
        <Reader settings={settings} onSettingsChange={changeSettings} novelId={place.novelId} bookId={place.bookId} />
      )}
      {place.screen === "browse" && <Browse onRead={readNovel} />}
    </div>
  );
}

export default App;
