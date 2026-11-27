import type { FoliateBook, TocItem } from "../foliate";

// A chapter's name from the Contents list, for chapters whose page doesn't show one
export function chapterName(book: FoliateBook, index: number) {
  const items = (book.toc ?? []).flatMap((item: TocItem) => [item, ...(item.subitems ?? [])]);
  return items.find((item) => book.resolveHref?.(item.href)?.index === index)?.label.trim() ?? "";
}
