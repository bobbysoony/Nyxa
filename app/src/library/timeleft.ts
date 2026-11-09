// How many words a piece of text has: the bits between spaces and line breaks.
export function countWords(text: string) {
  return text.split(/\s+/).filter((word) => word !== "").length;
}

// Every word from the top of the page to the end of its chapter.
export function wordsLeft(range?: Range) {
  const doc = range?.startContainer.ownerDocument;
  if (!range || !doc?.body) return 0;
  const rest = doc.createRange();
  rest.setStart(range.startContainer, range.startOffset);
  rest.setEnd(doc.body, doc.body.childNodes.length);
  return countWords(rest.toString());
}

// "About 6 min left", from the words still to read and your reading speed.
export function timeLeft(words: number, wordsPerMinute: number) {
  if (words === 0) return "";
  if (words < wordsPerMinute) return "Less than a minute left";
  const minutes = Math.ceil(words / wordsPerMinute); // round first, so 59.6 becomes 1 h, not 60 min
  if (minutes < 60) return `About ${minutes} min left`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `About ${hours} h ${rest} min left` : `About ${hours} h left`;
}
