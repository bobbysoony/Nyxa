// Every reading setting Nyxa has, in one place.
export type Settings = {
  font: string;
  fontSize: number;
  lineHeight: number;
  margin: number;
  theme: string;
  readingMode: string;
  wordsPerMinute: number;
  showTimeLeft: boolean;
  filters: string[];
  swaps: Swap[];
  novelFilters: NovelFilter[];
};

// One "swap these words for those words" rule, made in the Reader with the Fix bar.
// novelId is the one novel it counts for, leave it out and it counts for the whole library
export type Swap = { find: string; replace: string; novelId?: number };
// Same idea for "hide every line with these words", but only for the one novel it was made in
export type NovelFilter = { find: string; novelId: number };

// What Nyxa uses until you change something.
export const defaultSettings: Settings = {
  font: "Georgia, serif",
  fontSize: 18,
  lineHeight: 1.5,
  margin: 7,
  theme: "night",
  readingMode: "paginated",
  wordsPerMinute: 250,
  showTimeLeft: true,
  filters: [],
  swaps: [],
  novelFilters: []
};

type Theme = {
  background: string;
  text: string;
};

export const themes: Record<string, Theme> = {
  night: { background: "#15151c", text: "#d8d8e0" },
  sepia: { background: "#f4ecd8", text: "#5b4636" },
  light: { background: "#ffffff", text: "#1f1f24" },
  contrast: { background: "#000000", text: "#ffffff" }
};

export function getTheme(name: string) {
  return themes[name] || themes.night;
}

// Turns the settings into CSS for the book's pages.
export function makeBookCSS(settings: Settings) {
  const theme = getTheme(settings.theme);
  return `
    html, body {
      background: ${theme.background} !important;
      color: ${theme.text} !important;
      font-size: ${settings.fontSize}px !important;
    }
    body {
      font-family: ${settings.font} !important;
      line-height: ${settings.lineHeight} !important;
    }
    body * {
      color: inherit !important;
      font-family: inherit !important;
      line-height: inherit !important;
    }
    body *:not(h1, h2, h3, h4, h5, h6) {
      font-size: inherit !important;
    }
    .credits {
      opacity: 0.6;
    }
  `;
}
