import { defaultSettings, Settings } from "./settings";
import { useEffect, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { openUrl } from "@tauri-apps/plugin-opener";

const feedbackForm = "https://docs.google.com/forms/d/e/1FAIpQLSeja2ymZtDo_tCi4P2g4_c4NjahdpdU1B3YhD85WibXniqqzg/viewform?usp=pp_url&entry.1358451065=";

type SettingsPanelProps = {
  settings: Settings;
  onChange: (newSettings: Settings) => void;
};

function SettingsPanel({ settings, onChange }: SettingsPanelProps) {
  const scrolled = settings.readingMode === "scrolled";
  const [version, setVersion] = useState("");

  useEffect(() => {
    loadVersion();
  }, []);

  async function loadVersion() {
    setVersion(await getVersion());
  }

  return (
    <div className="settings-panel">
      <div className="theme-buttons">
        <button
          disabled={settings.theme === "night"}
          onClick={() => onChange({ ...settings, theme: "night" })}
        >
          Night
        </button>
        <button
          disabled={settings.theme === "sepia"}
          onClick={() => onChange({ ...settings, theme: "sepia" })}
        >
          Sepia
        </button>
        <button
          disabled={settings.theme === "light"}
          onClick={() => onChange({ ...settings, theme: "light" })}
        >
          Light
        </button>
        <button
          disabled={settings.theme === "contrast"}
          onClick={() => onChange({ ...settings, theme: "contrast" })}
        >
          Contrast
        </button>
      </div>

      <button
        className="toggle"
        aria-pressed={scrolled}
        onClick={() =>
          onChange({ ...settings, readingMode: scrolled ? "paginated" : "scrolled" })
        }
      >
        Scroll
        <span className="tick">
          {scrolled && (
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M3 8.5 L6.5 12 L13 4.5" />
            </svg>
          )}
        </span>
      </button>

      <label>
        Text size: {settings.fontSize}px
        <input
          type="range"
          min="12"
          max="32"
          value={settings.fontSize}
          onChange={(e) =>
            onChange({ ...settings, fontSize: Number(e.target.value) })
          }
        />
      </label>
      <label>
        Margin: {settings.margin}%
        <input
          type="range"
          min="0"
          max="20"
          value={settings.margin}
          onChange={(e) =>
            onChange({ ...settings, margin: Number(e.target.value) })
          }
        />
      </label>
      <label>
        Line height: {settings.lineHeight}
        <input
          type="range"
          min="1"
          max="2.2"
          step="0.1"
          value={settings.lineHeight}
          onChange={(e) =>
            onChange({ ...settings, lineHeight: Number(e.target.value) })
          }
        />
      </label>
      <label>
        Font:
        <select
          value={settings.font}
          onChange={(e) => onChange({ ...settings, font: e.target.value })}
        >
          <option value="Georgia, serif">Serif</option>
          <option value="system-ui, sans-serif">Sans-serif</option>
        </select>
      </label>

      <button onClick={() => onChange(defaultSettings)}>Reset to default</button>

      <div className="about">
        <span>Nyxa {version}</span>
        <button onClick={() => openUrl(feedbackForm + version)}>Send feedback</button>
      </div>
    </div>
  );
}

export default SettingsPanel;
