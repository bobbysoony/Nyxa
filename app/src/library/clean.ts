import * as cheerio from "cheerio";

// Each rule is one kind of junk line that sites add to chapters.
// A paragraph that matches any rule is removed. Every rule has a test in clean.test.ts.
export const junkRules: RegExp[] = [
  /^(advertisements?|sponsored( content)?)$/i,
  /\bthis chapter (is|was) (updated|uploaded) by\b/i,
  /^read (the )?(latest|newest) chapters? (at|on)\b/i,
  /\bvisit\b.{0,40}\bfor (the )?(latest|newest|fastest|more) (chapters|updates|releases)\b/i,
  /\bjoin\b.{0,40}\b(book club|discord|telegram|telegram channel|telegram group)\b/i,
  /^(https?:\/\/|www\.)\S+$/i
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

// `myFilters` are the reader's own phrases from Settings: plain text, not regular expressions.
export function isJunk(line: string, myFilters: string[] = []) {
  if (line === "") return true;
  const lower = line.toLowerCase();
  for (const filter of myFilters) {
    const phrase = tidy(filter).toLowerCase();
    if (phrase !== "" && lower.includes(phrase)) return true;
  }
  return junkRules.some((rule) => rule.test(line));
}

// Takes a chapter's HTML and gives back a copy without the junk paragraphs,
// and with the credit lines gathered into one line at the end.
export function cleanChapter(html: string, myFilters: string[] = []) {
  const $ = cheerio.load(html, null, false); // false = a piece of a page, so no <html> or <body> gets added
  const credits = new Set<string>(); // a Set keeps each credit once, however many times the chapter repeats it
  $("p").each((_, p) => {
    if ($(p).find("img").length > 0) return; // a picture is never junk
    const line = tidy($(p).text());
    if (isJunk(line, myFilters)) {
      $(p).remove();
    } else if (isCredit(line)) {
      credits.add(line);
      $(p).remove();
    }
  });
  if (credits.size > 0) $.root().append($('<p class="credits"></p>').text([...credits].join(" · ")));
  return $.html();
}
