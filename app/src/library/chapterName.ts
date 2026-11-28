import type { FoliateBook, TocItem } from "../foliate";
import { tidy } from "./clean";

// Does the chapter's first paragraph already show its name? Some EPUBs put the title in a styled <p>, not a heading.
// A one word name ("I", "II") has to be the whole paragraph, or "I woke up" would count as the title "I".
// A longer one can carry on after it, like "Chapter 1" in "Chapter 1 The Start".
export function hasTitleAlready(firstParagraph: string, name: string) {
  const text = tidy(firstParagraph.slice(0, 200)).toLowerCase(); // only the start matters, no need to tidy a whole chapter
  const title = tidy(name).toLowerCase();
  if (title === "" || text === title) return true;
  return title.includes(" ") && text.startsWith(title) && !/[\p{L}\p{N}]/u.test(text.charAt(title.length)); // letter or digit next means it's a different word or number ("Chapter 12")
}

// A chapter's name from the Contents list, for chapters whose page doesn't show one
export function chapterName(book: FoliateBook, index: number) {
  const items = (book.toc ?? []).flatMap((item: TocItem) => [item, ...(item.subitems ?? [])]);
  return items.find((item) => book.resolveHref?.(item.href)?.index === index)?.label.trim() ?? "";
}
