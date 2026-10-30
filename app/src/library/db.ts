import Database from "@tauri-apps/plugin-sql";
import type { ChapterItem, SourceNovel } from "../sources/types";

export type NovelRow = {
  id: number;
  source: string;
  path: string;
  name: string;
  author: string | null;
  summary: string | null;
  last_chapter: number | null;
  last_paragraph: number;
};

export type ChapterRow = {
  id: number;
  novel_id: number;
  number: number;
  name: string;
  path: string;
  volume: string | null;
  downloaded: number;
};

export type LibraryRow = NovelRow & { total: number };

let db: Database | null = null;

// Open nyxa.db once, then keep using the same connection.
export async function getDb() {
  if (!db) db = await Database.load("sqlite:nyxa.db");
  return db;
}

export async function saveNovel(source: string, novel: SourceNovel) {
  const db = await getDb();
  await db.execute(
    `INSERT INTO novels (source, path, name, author, summary)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (source, path) DO UPDATE
     SET name = excluded.name, author = excluded.author, summary = excluded.summary`,
    [source, novel.path, novel.name, novel.author ?? null, novel.summary ?? null],
  );

  const rows = await db.select<{ id: number }[]>(
    "SELECT id FROM novels WHERE source = $1 AND path = $2",
    [source, novel.path],
  );
  const novelId = rows[0].id;
  await saveChapterList(novelId, novel.chapters ?? []);
  return novelId;
}

// Saving 2,000 chapters one at a time would be 2,000 trips to Rust.
// Instead we send them in batches of 100 rows per INSERT.
async function saveChapterList(novelId: number, chapters: ChapterItem[]) {
  const db = await getDb();
  for (let start = 0; start < chapters.length; start += 100) {
    const batch = chapters.slice(start, start + 100);
    const values: (string | number)[] = [];
    const rows = batch.map((chapter, i) => {
      const n = values.length;
      values.push(novelId, start + i + 1, chapter.name, chapter.path);
      return `($${n + 1}, $${n + 2}, $${n + 3}, $${n + 4})`;
    });

    await db.execute(
      `INSERT INTO chapters (novel_id, number, name, path)
       VALUES ${rows.join(", ")}
       ON CONFLICT (novel_id, number) DO UPDATE
       SET name = excluded.name, path = excluded.path`,
      values,
    );
  }
}

export async function listNovels() {
  const db = await getDb();
  return db.select<LibraryRow[]>(
    `SELECT novels.*,
       (SELECT COUNT(*) FROM chapters WHERE chapters.novel_id = novels.id) AS total
     FROM novels ORDER BY name`,
  );
}


export async function getChapters(novelId: number) {
  const db = await getDb();
  return db.select<ChapterRow[]>(
    "SELECT * FROM chapters WHERE novel_id = $1 ORDER BY number",
    [novelId],
  );
}

export async function getNovel(novelId: number) {
  const db = await getDb();
  const rows = await db.select<NovelRow[]>("SELECT * FROM novels WHERE id = $1", [novelId]);
  return rows[0] ?? null;
}

export async function saveNovelPosition(novelId: number, chapter: number, paragraph: number) {
  const db = await getDb();
  await db.execute(
    "UPDATE novels SET last_chapter = $1, last_paragraph = $2 WHERE id = $3",
    [chapter, paragraph, novelId],
  );
}