import * as cheerio from "cheerio";
import type { Swap } from "../settings";

// Each rule is one kind of junk line that sites add to chapters.
// A paragraph that matches any rule is removed. Every rule has a test in clean.test.ts.
export const junkRules: RegExp[] = [
  /^(advertisements?|sponsored( content)?)$/i,
  /\bthis chapter (is|was) (updated|uploaded) by\b/i,
  /^read (the )?(latest|newest) chapters? (at|on)\b/i,
  /\bvisit\b.{0,40}\bfor (the )?(latest|newest|fastest|more) (chapters|updates|releases)\b/i,
  /\bjoin\b.{0,40}\b(book club|discord|telegram)\b/i,
  /^(https?:\/\/|www\.)\S+$/i,
];

// A short line that only credits the people who made the chapter, like "Translator: Moonlight".
// These aren't junk. They get moved out of the story to one small line at the end of the chapter.
const creditLine = /^((author|translator|editor|proofreader|tl|tlc|ed)\s*[:：-]|(translated|edited|proofread) by\b)/i;

export function isCredit(line: string) {
  return line.length <= 80 && creditLine.test(line);
}

// "  Hello    world " → "Hello world". \s also matches the odd spaces sites pad lines with.
export function tidy(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

// Straight quotes turned into the curly ones a printed book uses. Curly ones are already right, so they're left alone.
// A quote at the start, or after a space, bracket or dash, opens. Anywhere else it closes,
// so the ' in don't and in James' becomes a closing one, which is the right mark for those too.
// before is the character just in front of the text, for text that carries on after a tag like <em>
export function curlyQuotes(text: string, before = "") {
  // 'em and '90s are cut-off words, not quotes, so they always get the closing one even after a space
  text = text.replace(/'(?=em\b|\d)/g, "’");
  let out = "";
  for (const char of text) {
    const opens = before === "" || /[\s([{“‘—–-]/.test(before);
    if (char === '"') before = opens ? "“" : "”";
    else if (char === "'") before = opens ? "‘" : "’";
    else before = char;
    out += before;
  }
  return out;
}

// `myFilters` are the reader's own phrases from Settings: plain text, not regular expressions.
// Chapters have curly quotes now, so a phrase saved with straight ones is checked both ways
export function matchesMyFilter(line: string, myFilters: string[]) {
  const lower = line.toLowerCase();
  return myFilters.some((filter) => {
    const phrase = tidy(filter).toLowerCase();
    return phrase !== "" && (lower.includes(phrase) || lower.includes(curlyQuotes(phrase)));
  });
}

export function isJunk(line: string) {
  if (line === "") return true;
  return junkRules.some((rule) => rule.test(line));
}

// cut the text at every find, then glue the pieces back with the new words. An empty find would cut between every letter, so skip those
// A swap made before chapters had curly quotes still has straight ones, so it's tried with curly ones too
export function swapText(text: string, swaps: Swap[]) {
  for (const swap of swaps) {
    if (swap.find === "") continue;
    text = text.split(swap.find).join(swap.replace);
    const curly = curlyQuotes(swap.find);
    if (curly !== swap.find) text = text.split(curly).join(swap.replace);
  }
  return text;
}

// each bit of text's words from before any swap, so taking a swap away can put them back
const originals = new WeakMap<Text, string>();

// The reader's swaps, on a chapter that's already showing. Changes the text right there, no reload, so nothing flickers.
// Only the story paragraphs, so the chapter title at the top stays as the site wrote it.
export function applySwaps(doc: Document, swaps: Swap[]) {
  for (const p of doc.querySelectorAll("body > p")) {
    const walker = doc.createTreeWalker(p, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
      const original = originals.get(node) ?? node.data;
      originals.set(node, original);
      const swapped = swapText(original, swaps);
      if (node.data !== swapped) node.data = swapped;
    }
  }
}

// Curly quotes on a page that's showing, web novel or EPUB. Only the words change, never a tag or a link,
// and every quote stays one character, so saved places in an EPUB still point at the same spot
export function curlyPage(doc: Document) {
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
  let block: Element | null = null;
  let before = "";
  for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
    const parent = node.parentElement;
    if (!parent || parent.closest("code, pre, script, style")) continue; // code keeps its straight quotes
    // a new paragraph starts fresh, so its first quote opens
    const here = parent.closest("p, div, li, blockquote, td, h1, h2, h3, h4, h5, h6");
    if (here !== block) before = "";
    block = here;
    const curly = curlyQuotes(node.data, before);
    if (curly !== node.data) node.data = curly;
    before = curly.slice(-1) || before;
  }
}

// The reader's filters, on a chapter that's already showing. Hidden, not removed,
// so changing a filter shows the paragraph again and paragraph numbers (saved places) don't shift.
export function hideMyFilters(doc: Document, myFilters: string[]) {
  for (const p of doc.querySelectorAll<HTMLElement>("body > p")) {
    p.hidden = !p.querySelector("img") && matchesMyFilter(tidy(p.textContent ?? ""), myFilters);
  }
}

// Takes a chapter's HTML and gives back a copy without the junk paragraphs,
// and with the credit lines gathered into one line at the end.
export function cleanChapter(html: string) {
  const $ = cheerio.load(html, null, false); // false = a piece of a page, so no <html> or <body> gets added
  const credits = new Set<string>(); // a Set keeps each credit once, however many times the chapter repeats it
  $("p").each((_, p) => {
    if ($(p).find("img").length > 0) return; // a picture is never junk
    const line = tidy($(p).text());
    if (isJunk(line)) {
      $(p).remove();
    } else if (isCredit(line)) {
      credits.add(line);
      $(p).remove();
    }
  });
  if (credits.size > 0) $.root().append($('<p class="credits"></p>').text([...credits].join(" · ")));
  return $.html();
}
