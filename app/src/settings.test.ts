import { expect, test } from "vitest";
import { defaultSettings, getTheme, makeBookCSS, themes } from "./settings";

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

// Defaults

test("default settings are the ones Nyxa starts with", () => {
  expect(defaultSettings.theme).toBe("night");
  expect(defaultSettings.readingMode).toBe("paginated");
  expect(defaultSettings.fontSize).toBe(18);
});
