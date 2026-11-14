// Positions in a web novel are "chapter number + paragraph number".
// In a link they look like "chapter-2088#p14".

export function positionHref(chapter: number, paragraph: number) {
  return `chapter-${chapter}#p${paragraph}`;
}

// paragraphs you hid with your own filters don't count, so hiding or showing one doesn't move saved places
function storyParagraphs(doc: Document) {
  return Array.from(doc.querySelectorAll("body > p:not([hidden])"));
}

// "p14" → the 15th paragraph of the chapter (counting from 0).
export function findParagraph(doc: Document, fragment?: string) {
  if (!fragment?.startsWith("p")) return null;
  return storyParagraphs(doc)[Number(fragment.slice(1))] ?? null;
}

// Which paragraph does this page belong to? The first paragraph that
// starts on the page, or, if a long one fills the whole page, that one.
// Reopening at its start then shows this very same page.
export function paragraphAt(range?: Range) {
  if (!range) return 0;
  const node = range.startContainer;
  const element = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
  const top = element?.closest("body > p");
  if (!top) return 0;

  const paragraphs = storyParagraphs(top.ownerDocument);
  const index = paragraphs.indexOf(top);
  if (index < 0) return 0; // a hidden paragraph isn't in the count
  if (node === top || range.startOffset === 0) return index;

  const next = paragraphs[index + 1];
  return next && range.intersectsNode(next) ? index + 1 : index;
}

export function chapterFromHref(href: string) {
  return Number(href.split("#")[0].replace("chapter-", ""));
}