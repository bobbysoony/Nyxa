import { defaultSettings, Settings } from "./settings";
import { useEffect, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { openUrl } from "@tauri-apps/plugin-opener";
import Dropdown from "./Dropdown";

const feedbackForm = "https://docs.google.com/forms/d/e/1FAIpQLSeja2ymZtDo_tCi4P2g4_c4NjahdpdU1B3YhD85WibXniqqzg/viewform?usp=pp_url&entry.1358451065=";

type SettingsPanelProps = {
  settings: Settings;
  onChange: (newSettings: Settings) => void;
};

function SettingsPanel({ settings, onChange }: SettingsPanelProps) {
  const scrolled = settings.readingMode === "scrolled";
  const [version, setVersion] = useState("");
  const [showRules, setShowRules] = useState(false);
  const ruleCount = settings.filters.length + settings.novelFilters.length + settings.swaps.length;

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

      <button
        className="toggle"
        aria-pressed={settings.showTimeLeft}
        onClick={() =>
          onChange({ ...settings, showTimeLeft: !settings.showTimeLeft })
        }
      >
        Show time left
        <span className="tick">
          {settings.showTimeLeft && (
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
        Reading speed: {settings.wordsPerMinute} words a minute
        <input
          type="range"
          min="100"
          max="600"
          step="10"
          value={settings.wordsPerMinute}
          onChange={(e) =>
            onChange({ ...settings, wordsPerMinute: Number(e.target.value) })
          }
        />
      </label>
      <div>
        Font:
        <Dropdown
          label="Font"
          value={settings.font}
          options={[
            { value: "Georgia, serif", label: "Serif" },
            { value: "system-ui, sans-serif", label: "Sans-serif" },
          ]}
          onChange={(picked) => onChange({ ...settings, font: picked })}
        />
      </div>

      {ruleCount > 0 && (
        <button onClick={() => setShowRules(true)}>Hidden & replaced words ({ruleCount})</button>
      )}

      {/* pops out over everything, same look as the "are you sure?" box */}
      {showRules && (
        <>
          <div className="backdrop" onClick={() => setShowRules(false)}></div>
          <div
            className="confirm rules"
            role="dialog"
            aria-modal="true"
            aria-label="Hidden and replaced words"
            onKeyDown={(e) => e.key === "Escape" && setShowRules(false)}
          >
            {settings.filters.length + settings.novelFilters.length > 0 && <strong>Hidden lines</strong>}
            {settings.filters.map((phrase, i) => (
              <div className="swap-row" key={"all" + i}>
                <span>“{phrase}” · whole library</span>
                <button aria-label="Remove" onClick={() => onChange({ ...settings, filters: settings.filters.filter((_, j) => j !== i) })}>✕</button>
              </div>
            ))}
            {settings.novelFilters.map((hide, i) => (
              <div className="swap-row" key={"one" + i}>
                <span>“{hide.find}” · one novel</span>
                <button aria-label="Remove" onClick={() => onChange({ ...settings, novelFilters: settings.novelFilters.filter((_, j) => j !== i) })}>✕</button>
              </div>
            ))}

            {settings.swaps.length > 0 && <strong>Replaced words</strong>}
            {settings.swaps.map((swap, i) => (
              <div className="swap-row" key={i}>
                <span>
                  “{swap.find}” → {swap.replace === "" ? "(deleted)" : `“${swap.replace}”`}
                  {swap.novelId === undefined ? " · whole library" : " · one novel"}
                </span>
                <button aria-label="Remove" onClick={() => onChange({ ...settings, swaps: settings.swaps.filter((_, j) => j !== i) })}>✕</button>
              </div>
            ))}

            <div className="confirm-buttons">
              <button autoFocus onClick={() => setShowRules(false)}>Close</button>
            </div>
          </div>
        </>
      )}

      <button onClick={() => onChange(defaultSettings)}>Reset to default</button>

      <div className="about">
        <span>Nyxa {version}</span>
        <button onClick={() => openUrl(feedbackForm + version)}>Send feedback</button>
      </div>
    </div>
  );
}

export default SettingsPanel;
