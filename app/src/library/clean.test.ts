import { expect, test } from "vitest";
import { cleanChapter, isCredit, isJunk, tidy } from "./clean";

test("tidy squeezes spaces and trims the ends", () => {
  expect(tidy("  Hello \n   world\u00a0 ")).toBe("Hello world");
});

// One test per rule in junkRules, in the same order.

test("an advert label is junk", () => {
  expect(isJunk("Advertisement")).toBe(true);
  expect(isJunk("SPONSORED CONTENT")).toBe(true);
});

test("'this chapter is updated by' is junk", () => {
  expect(isJunk("This chapter is updated by some-site.example")).toBe(true);
});

test("'read latest chapters at' is junk", () => {
  expect(isJunk("Read latest chapters at some-site.example only")).toBe(true);
});

test("'visit … for the latest chapters' is junk", () => {
  expect(isJunk("Please visit some-site.example for the latest chapters!")).toBe(true);
});

test("'join our discord/telegram' is junk", () => {
  expect(isJunk("Join our Discord for early chapters!")).toBe(true);
  expect(isJunk("Join the Telegram channel for updates")).toBe(true);
});

// Just as important: what must stay.

test("story lines that only look like junk stay", () => {
  expect(isJunk("The advertisement on the wall was old and torn.")).toBe(false);
  expect(isJunk("\"We should visit the capital for the festival,\" she said.")).toBe(false);
  expect(isJunk("He would read the latest chapters of the old scroll at dawn.")).toBe(false);
  expect(isJunk("He wanted to join the others.")).toBe(false);
});

test("credits and official notices are not junk", () => {
  expect(isJunk("Translator: Moonlight")).toBe(false);
  expect(isJunk("This story is published on its official site. Please read it there.")).toBe(false);
});

test("a short line that only credits someone is a credit", () => {
  expect(isCredit("Translator: Moonlight")).toBe(true);
  expect(isCredit("Edited by Sun")).toBe(true);
  expect(isCredit("TL - Moonlight")).toBe(true);
});

test("story lines about an author or an editor are not credits", () => {
  expect(isCredit("The translator bowed and left the hall.")).toBe(false);
  expect(isCredit("Ed walked in.")).toBe(false);
  expect(isCredit("\"Author? I am no author,\" he said.")).toBe(false);
});

test("your own filters hide a line, whatever the capitals", () => {
  expect(isJunk("Join my Book Club today", ["book club"])).toBe(true);
  expect(isJunk("He joined the army.", ["book club"])).toBe(false);
});

test("an empty filter line hides nothing", () => {
  expect(isJunk("A normal line.", ["", "   "])).toBe(false);
});

test("cleanChapter removes junk and empty paragraphs and keeps the rest", () => {
  const html = "<p>One.</p><p>Advertisement</p><p>&nbsp; </p><p>Two.</p>";
  expect(cleanChapter(html)).toBe("<p>One.</p><p>Two.</p>");
});

test("cleanChapter keeps a paragraph that is only a picture", () => {
  const html = '<p><img src="map.png"></p>';
  expect(cleanChapter(html)).toBe(html);
});

test("cleanChapter moves credits out of the story to one line at the end, each one once", () => {
  const html = "<p>Translator: Moonlight</p><p>One.</p><p>Editor: Sun</p><p>Two.</p><p>Translator: Moonlight</p>";
  expect(cleanChapter(html)).toBe('<p>One.</p><p>Two.</p><p class="credits">Translator: Moonlight · Editor: Sun</p>');
});

test("your own filter can hide a credit too", () => {
  expect(cleanChapter("<p>One.</p><p>Translator: Moonlight</p>", ["translator"])).toBe("<p>One.</p>");
});

test("a line that is only a web address is junk", () => {
  expect(isJunk("https://some-site.example/novel")).toBe(true);
  expect(isJunk("www.some-site.example")).toBe(true);
});

test("a story line with a web address in it stays", () => {
  expect(isJunk("He typed https://some-site.example into the bar.")).toBe(false);
});
