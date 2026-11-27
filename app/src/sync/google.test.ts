import { describe, expect, it } from "vitest";
import { makeChallenge, randomText } from "./google";

describe("Google sign-in", () => {
  it("scrambles the verifier the way Google expects", async () => {
    // the answer was worked out separately with Python, so a slip in linkSafe would show up here
    expect(await makeChallenge("dBjftJeZ4CVP-mJ92IgXo3QxLKrAxNNc4xj8Fl3tc4o")).toBe("zo_GBtSzxpEQ4gnyy4h6VdBDeUvRb6SeDAiw4PI0azw");
  });

  it("makes random text that's safe in a link and long enough for Google", () => {
    const text = randomText();
    expect(text).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(randomText()).not.toBe(text);
  });
});
