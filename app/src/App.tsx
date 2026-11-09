import { useEffect, useState } from "react";
import { load } from "@tauri-apps/plugin-store";
import Reader from "./Reader";
import Browse from "./Browse";
import { defaultSettings, Settings, getTheme } from "./settings";
import Library from "./Library";
import "./App.css";

function App() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [screen, setScreen] = useState<"library" | "reader" | "browse">("reader");
  const [novelId, setNovelId] = useState<number | null>(null);
  const [bookId, setBookId] = useState<number | null>(null);


  useEffect(() => {
    loadSettings();
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

  function readNovel(id: number) {
    setNovelId(id);
    setBookId(null);
    setScreen("reader");
  }

  function readBook(id: number) {
    setBookId(id);
    setNovelId(null);
    setScreen("reader");
  }

  function showReader() {
    setNovelId(null);
    setBookId(null);
    setScreen("reader");
  }

  if (!settings) return <p>Loading…</p>;

  return (
    <div className="app">
      <nav className="app-tabs">
        <button onClick={() => setScreen("library")}>Library</button>
        <button onClick={showReader}>Reader</button>
        <button onClick={() => setScreen("browse")}>Browse</button>
      </nav>
      {screen === "library" && <Library onReadNovel={readNovel} onReadBook={readBook} />}
      {screen === "reader" && (
        <Reader settings={settings} onSettingsChange={changeSettings} novelId={novelId} bookId={bookId} />
      )}
      {screen === "browse" && <Browse onRead={readNovel} />}
    </div>
  );
}

export default App;

