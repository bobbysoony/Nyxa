import { invoke } from "@tauri-apps/api/core";
import { getDb, type ChapterRow, type NovelRow } from "./db";
import { escapeHtml } from "../sources/html";
import { sources } from "../sources";
import type { Source } from "../sources/types";
import type { FoliateBook, FoliateSection } from "../foliate";

export type Volume = {
  label: string;
  chapters: ChapterRow[];
};

// "Volume 3 - Chapter 12" → "Volume 3". No volume in the title → null.
function volumeFromTitle(name: string) {
  const match = name.match(/\b(?:volume|vol\.?)\s*(\d+)/i);
  return match ? `Volume ${match[1]}` : null;
}

// Chapter 312 with blocks of 250 → "Chapters 251–500"
function blockLabel(number: number, size: number) {
  const start = Math.floor((number - 1) / size) * size + 1;
  return `Chapters ${start}–${start + size - 1}`;
}

// Group chapters into volumes: from the site, else from the chapter
// titles, else in blocks of 250.
export function groupVolumes(chapters: ChapterRow[], blockSize = 250): Volume[] {
  const volumes: Volume[] = [];
  for (const chapter of chapters) {
    const label =
      chapter.volume ?? volumeFromTitle(chapter.name) ?? blockLabel(chapter.number, blockSize);
    const last = volumes[volumes.length - 1];
    if (last && last.label === label) last.chapters.push(chapter);
    else volumes.push({ label, chapters: [chapter] });
  }
  return volumes;
}

export function chapterHref(number: number) {
  return `chapter-${number}`;
}

// One chapter as a small web page that foliate can show.
function chapterPage(title: string, body: string) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head>
<body>
<h2>${escapeHtml(title)}</h2>
${body}
</body>
</html>`;
}

// A downloaded chapter comes from chapters.db. Any other chapter comes
// straight from the site, like LNReader, without being saved.
async function chapterBody(chapter: ChapterRow, source?: Source) {
  const saved = await invoke<string | null>("load_chapter_text", { chapterId: chapter.id });
  if (saved !== null) return saved;
  if (!source) return "<p>This chapter isn't downloaded.</p>";
  try {
    return await source.parseChapter(chapter.path);
  } catch (err) {
    return `<p>Couldn't load this chapter: ${escapeHtml(String(err))}</p>
<p>Check your internet, or download it to read it offline.</p>`;
  }
}

export type NovelBook = FoliateBook & {
  novelId: number;
  chapters: ChapterRow[];
};

export async function makeNovelBook(novelId: number): Promise<NovelBook | null> {
  const db = await getDb();
  const novels = await db.select<NovelRow[]>("SELECT * FROM novels WHERE id = $1", [novelId]);
  const chapters = await db.select<ChapterRow[]>(
    "SELECT * FROM chapters WHERE novel_id = $1 ORDER BY number",
    [novelId],
  );
  if (novels.length === 0 || chapters.length === 0) return null;
  const source = sources.find((s) => s.id === novels[0].source);

  const sections: FoliateSection[] = chapters.map((chapter) => {
    let url = "";
    return {
      id: chapterHref(chapter.number),
      size: 20000,
      linear: "yes",
      async load() {
        const page = chapterPage(chapter.name, await chapterBody(chapter, source));
        url = URL.createObjectURL(new Blob([page], { type: "text/html" }));
        return url;
      },
      unload() {
        URL.revokeObjectURL(url);
      },
    };
  });

  const toc = groupVolumes(chapters).map((volume) => ({
    label: volume.label,
    href: chapterHref(volume.chapters[0].number),
    subitems: volume.chapters.map((chapter) => ({
      label: chapter.name,
      href: chapterHref(chapter.number),
    })),
  }));

  return {
    novelId,
    chapters,
    metadata: { title: novels[0].name },
    sections,
    toc,
    resolveHref(href) {
      const index = sections.findIndex((section) => section.id === href.split("#")[0]);
      return index < 0 ? null : { index, anchor: () => 0 };
    },
    splitTOCHref(href) {
      return href.split("#");
    },
    getTOCFragment() {
      return null;
    },
  };
}
