// Every reading setting Nyxa has, in one place.
// Later lessons add new settings here.
export type Settings = {
  font: string;
  fontSize: number;
  lineHeight: number;
  margin: number;
};

// What Nyxa uses until you change something.
export const defaultSettings: Settings = {
  font: "Georgia, serif",
  fontSize: 18,
  lineHeight: 1.5,
  margin: 7,
};

// Turns the settings into CSS for the book's pages.
export function makeBookCSS(settings: Settings) {
  return `
    html, body {
      background: #15151c !important;
      color: #d8d8e0 !important;
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
  `;
}