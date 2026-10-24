import { useEffect, useState } from "react";
import { load } from "@tauri-apps/plugin-store";
import Reader from "./Reader";
import { defaultSettings, Settings, getTheme } from "./settings";
import "./App.css";
import Browse from "./Browse";

function App() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [screen, setScreen] = useState<"reader" | "browse">("browse");

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

  if (!settings) return null;

  return (
    <div className="app">
      <nav className="app-tabs">
        <button onClick={() => setScreen("reader")}>Reader</button>
        <button onClick={() => setScreen("browse")}>Browse</button>
      </nav>
      {screen === "reader" ? (
        <Reader settings={settings} onSettingsChange={changeSettings} />
      ) : (
        <Browse />
      )}
    </div>
  );
}

export default App;

