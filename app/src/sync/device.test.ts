import { expect, test } from "vitest";
import { phoneModel } from "./device";

test("finds the phone's model in the user agent", () => {
  const ua = "Mozilla/5.0 (Linux; Android 14; SM-S937B Build/UP1A.231005.007; wv) AppleWebKit/537.36";
  expect(phoneModel(ua)).toBe("SM-S937B");
});

test("a model without Build after it still counts", () => {
  expect(phoneModel("Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36")).toBe("Pixel 7");
});

test("a hidden model or no Android gives none", () => {
  expect(phoneModel("Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36")).toBe(null);
  expect(phoneModel("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")).toBe(null);
});
