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
  auto_download: number;
  auto_limit: number;
};

export type ChapterRow = {
  id: number;
  novel_id: number;
  number: number;
  name: string;
  path: string;
  volume: string | null;
  downloaded: number;
  read: number;
};

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
// Numbers start at `first`. foundAt is when an update check found them (lesson 21).
export async function saveChapterList(
  novelId: number,
  chapters: ChapterItem[],
  first = 1,
  foundAt: number | null = null,
) {
  const db = await getDb();
  for (let start = 0; start < chapters.length; start += 100) {
    const batch = chapters.slice(start, start + 100);
    const values: (string | number | null)[] = [];
    const rows = batch.map((chapter, i) => {
      const n = values.length;
      values.push(novelId, first + start + i, chapter.name, chapter.path, foundAt);
      return `($${n + 1}, $${n + 2}, $${n + 3}, $${n + 4}, $${n + 5})`;
    });

    await db.execute(
      `INSERT INTO chapters (novel_id, number, name, path, found_at)
       VALUES ${rows.join(", ")}
       ON CONFLICT (novel_id, number) DO UPDATE
       SET name = excluded.name, path = excluded.path`,
      values,
    );
  }
}

export type LibraryRow = NovelRow & { total: number; unread: number; fresh: number };

export async function listNovels() {
  const db = await getDb();
  return db.select<LibraryRow[]>(
    `SELECT novels.*,
       (SELECT COUNT(*) FROM chapters
        WHERE chapters.novel_id = novels.id) AS total,
       (SELECT COUNT(*) FROM chapters
        WHERE chapters.novel_id = novels.id AND chapters.read = 0) AS unread,
       (SELECT COUNT(*) FROM chapters
        WHERE chapters.novel_id = novels.id AND chapters.read = 0
          AND chapters.found_at IS NOT NULL) AS fresh
     FROM novels
     ORDER BY name`,
  );
}

// One line of the Updates screen: a chapter an update check found, with its novel's name.
export type UpdateRow = {
  novel_id: number;
  novel_name: string;
  number: number;
  name: string;
  read: number;
  downloaded: number;
};

export async function listUpdates() {
  const db = await getDb();
  return db.select<UpdateRow[]>(
    `SELECT chapters.novel_id, novels.name AS novel_name,
       chapters.number, chapters.name, chapters.read, chapters.downloaded
     FROM chapters JOIN novels ON novels.id = chapters.novel_id
     WHERE chapters.found_at IS NOT NULL
     ORDER BY chapters.found_at DESC, chapters.number DESC
     LIMIT 200`,
  );
}

// Clear button on Updates: the chapters stay, they just stop counting as "found by a check".
export async function clearUpdates() {
  const db = await getDb();
  await db.execute("UPDATE chapters SET found_at = NULL WHERE found_at IS NOT NULL");
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

export async function saveAutoDownload(novelId: number, on: boolean, limit: number) {
  const db = await getDb();
  await db.execute("UPDATE novels SET auto_download = $1, auto_limit = $2 WHERE id = $3", [
    on ? 1 : 0,
    limit,
    novelId,
  ]);
}

export async function saveNovelPosition(novelId: number, chapter: number, paragraph: number) {
  const db = await getDb();
  await db.execute(
    "UPDATE novels SET last_chapter = $1, last_paragraph = $2 WHERE id = $3",
    [chapter, paragraph, novelId],
  );
}

export async function setChapterRead(novelId: number, number: number, read: boolean) {
  const db = await getDb();
  await db.execute(
    "UPDATE chapters SET read = $1 WHERE novel_id = $2 AND number = $3",
    [read ? 1 : 0, novelId, number],
  );
}

export async function markReadBefore(novelId: number, number: number) {
  const db = await getDb();
  await db.execute(
    "UPDATE chapters SET read = 1 WHERE novel_id = $1 AND number < $2",
    [novelId, number],
  );
}

export async function setAllRead(novelId: number, read: boolean) {
  const db = await getDb();
  await db.execute("UPDATE chapters SET read = $1 WHERE novel_id = $2", [read ? 1 : 0, novelId]);
}

export type BookRow = {
  id: number;
  key: string;
  file: string;
  title: string;
  position: string | null;
  read: string;
  chapters: number; 
};

export async function getBook(id: number) {
  const db = await getDb();
  const rows = await db.select<BookRow[]>("SELECT * FROM books WHERE id = $1", [id]);
  return rows[0] ?? null;
}

export async function getBookByKey(key: string) {
  const db = await getDb();
  const rows = await db.select<BookRow[]>("SELECT * FROM books WHERE key = $1", [key]);
  return rows[0] ?? null;
}

// A new book gets a new row; a book that's already there keeps its row
// (and its place and ticks), with the file and title brought up to date.
export async function saveBook(key: string, file: string, title: string) {
  const db = await getDb();
  await db.execute(
    `INSERT INTO books (key, file, title) VALUES ($1, $2, $3)
     ON CONFLICT (key) DO UPDATE SET file = excluded.file, title = excluded.title`,
    [key, file, title],
  );
  const rows = await db.select<{ id: number }[]>("SELECT id FROM books WHERE key = $1", [key]);
  return rows[0].id;
}

export async function saveBookPosition(id: number, position: string) {
  const db = await getDb();
  await db.execute("UPDATE books SET position = $1 WHERE id = $2", [position, id]);
}

export async function listBooks() {
  const db = await getDb();
  return db.select<BookRow[]>("SELECT * FROM books ORDER BY title");
}

export async function saveBookChapters(id: number, chapters: number) {
  const db = await getDb();
  await db.execute("UPDATE books SET chapters = $1 WHERE id = $2", [chapters, id]);
}

export async function saveBookRead(id: number, read: number[]) {
  const db = await getDb();
  await db.execute("UPDATE books SET read = $1 WHERE id = $2", [JSON.stringify(read), id]);
}
