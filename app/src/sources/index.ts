type ChapterParser = (html: string) => { title: string; paragraphs: string[] };

const found = import.meta.glob<ChapterParser>("./*/parse.ts", {
  eager: true,
  import: "parseChapterPage",
});

export const chapterParsers = Object.values(found);