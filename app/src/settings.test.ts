import { expect, test } from "vitest";
import { defaultSettings, getTheme, makeBookCSS, resetLook, themes } from "./settings";

// Themes

test("getTheme finds each theme by its name", () => {
  expect(getTheme("night")).toEqual(themes.night);
  expect(getTheme("sepia")).toEqual(themes.sepia);
  expect(getTheme("light")).toEqual(themes.light);
  expect(getTheme("contrast")).toEqual(themes.contrast);
});

test("getTheme falls back to night for a name it doesn't know", () => {
  expect(getTheme("purple")).toEqual(themes.night);
});

test("makeBookCSS uses the chosen theme's colours", () => {
  const css = makeBookCSS({ ...defaultSettings, theme: "sepia" });
  expect(css).toContain(`background: ${themes.sepia.background}`);
  expect(css).toContain(`color: ${themes.sepia.text}`);
});

// Text settings

test("makeBookCSS with a size makes CSS that size", () => {
  const css = makeBookCSS({ ...defaultSettings, fontSize: 42 });
  expect(css).toContain("font-size: 42px");
});

test("makeBookCSS uses the chosen font", () => {
  const css = makeBookCSS({ ...defaultSettings, font: "system-ui, sans-serif" });
  expect(css).toContain("font-family: system-ui, sans-serif");
});

test("makeBookCSS uses the chosen line height", () => {
  const css = makeBookCSS({ ...defaultSettings, lineHeight: 2.1 });
  expect(css).toContain("line-height: 2.1");
});

test("makeBookCSS gives every paragraph the chosen gap", () => {
  const css = makeBookCSS({ ...defaultSettings, paragraphGap: 0.6 });
  expect(css).toContain("margin: 0 0 0.6em");
});

test("reset puts the look back but keeps your hidden lines and swaps", () => {
  const mine = {
    ...defaultSettings,
    fontSize: 30,
    theme: "sepia",
    filters: ["join our discord"],
    swaps: [{ find: "colour", replace: "color" }],
    novelFilters: [{ find: "ads", novelId: 1 }],
  };
  const reset = resetLook(mine);
  expect(reset.fontSize).toBe(defaultSettings.fontSize);
  expect(reset.theme).toBe(defaultSettings.theme);
  expect(reset.filters).toEqual(mine.filters);
  expect(reset.swaps).toEqual(mine.swaps);
  expect(reset.novelFilters).toEqual(mine.novelFilters);
});
