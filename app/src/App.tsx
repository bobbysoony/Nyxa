import { useEffect, useState } from "react";
import { load } from "@tauri-apps/plugin-store";
import Reader from "./Reader";
import { defaultSettings, Settings } from "./settings";
import "./App.css";

function App() {
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

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

  return <Reader settings={settings} onSettingsChange={changeSettings} />;
}

export default App;

