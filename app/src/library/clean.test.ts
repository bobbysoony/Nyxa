import { expect, test } from "vitest";
import { cleanChapter, curlyQuotes, isCredit, isJunk, matchesMyFilter, swapText, tidy } from "./clean";

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
  expect(matchesMyFilter("Join my Book Club today", ["book club"])).toBe(true);
  expect(matchesMyFilter("He joined the army.", ["book club"])).toBe(false);
});

test("an empty filter line hides nothing", () => {
  expect(matchesMyFilter("A normal line.", ["", "   "])).toBe(false);
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

test("a line that is only a web address is junk", () => {
  expect(isJunk("https://some-site.example/novel")).toBe(true);
  expect(isJunk("www.some-site.example")).toBe(true);
});

test("a story line with a web address in it stays", () => {
  expect(isJunk("He typed https://some-site.example into the bar.")).toBe(false);
});

test("a swap changes the words every time they show up", () => {
  expect(swapText("Sunny ran. He said Sunny twice.", [{ find: "Sunny", replace: "Sunless" }])).toBe(
    "Sunless ran. He said Sunless twice.",
  );
});

test("a swap with nothing to put in deletes just those words", () => {
  expect(swapText("He left. (TN: lol)", [{ find: " (TN: lol)", replace: "" }])).toBe("He left.");
});

test("a swap minds capitals", () => {
  expect(swapText("the Em dash", [{ find: "em", replace: "X" }])).toBe("the Em dash");
});

test("a swap with an empty find does nothing", () => {
  expect(swapText("Hello", [{ find: "", replace: "X" }])).toBe("Hello");
});

test("straight quotes turn curly, opening and closing", () => {
  expect(curlyQuotes('"Run," she said. "Now!"')).toBe("“Run,” she said. “Now!”");
  expect(curlyQuotes("He said 'no' twice.")).toBe("He said ‘no’ twice.");
});

test("apostrophes become closing quotes", () => {
  expect(curlyQuotes("don't, Sunny's, James' sword")).toBe("don’t, Sunny’s, James’ sword");
});

test("a quote after a dash or a bracket opens", () => {
  expect(curlyQuotes('He shouted—"Wait!" ("Why?")')).toBe("He shouted—“Wait!” (“Why?”)");
});

test("a quote inside a quote", () => {
  expect(curlyQuotes(`"She said 'hi' to me."`)).toBe("“She said ‘hi’ to me.”");
});

test("curly quotes that are already there stay as they are", () => {
  expect(curlyQuotes("“Hi,” she said. Don’t.")).toBe("“Hi,” she said. Don’t.");
});

test("text after a tag knows the character before it", () => {
  // "<em>Run</em>" is three bits of text: the quote, Run, and the closing quote after Run
  expect(curlyQuotes('" he said', "n")).toBe("” he said");
  expect(curlyQuotes('"Run', " ")).toBe("“Run");
});

test("a swap or filter saved with straight quotes still works on curly text", () => {
  expect(swapText("Sunny’s shadow", [{ find: "Sunny's", replace: "Sunless's" }])).toBe("Sunless's shadow");
  expect(matchesMyFilter("“Translated by moon”", ['"translated by'])).toBe(true);
});

test("a swap whose new words contain the old ones still runs once", () => {
  expect(swapText("a cat", [{ find: "cat", replace: "cats" }])).toBe("a cats");
});

test("an apostrophe that starts a word after a space still curls the right way", () => {
  expect(curlyQuotes("Get 'em")).toBe("Get ’em");
  expect(curlyQuotes("the '90s")).toBe("the ’90s");
  expect(curlyQuotes("'Emma'")).toBe("‘Emma’");
});
