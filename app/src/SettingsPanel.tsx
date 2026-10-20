import { defaultSettings, Settings } from "./settings";

type SettingsPanelProps = {
  settings: Settings;
  onChange: (newSettings: Settings) => void;
};

function SettingsPanel({ settings, onChange }: SettingsPanelProps) {
  return (
    <div className="settings-panel">
      <div className="theme-buttons">
        <button onClick={() => onChange({ ...settings, theme: "night" })}>Night</button>
        <button onClick={() => onChange({ ...settings, theme: "sepia" })}>Sepia</button>
        <button onClick={() => onChange({ ...settings, theme: "light" })}>Light</button>
      </div>
      
      <label>
        Reading mode
        <select
          value={settings.flow}
          onChange={(e) => onChange({ ...settings, flow: e.target.value })}
        >
          <option value="paginated">Turn pages</option>
          <option value="scrolled">Scroll</option>
        </select>
      </label>

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
    </div>
  );
}

export default SettingsPanel;
