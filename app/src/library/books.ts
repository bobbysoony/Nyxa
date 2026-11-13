import { BaseDirectory, exists, mkdir, readDir, readFile, remove, writeFile } from "@tauri-apps/plugin-fs";
import { load } from "@tauri-apps/plugin-store";
import { makeBook } from "../../foliate-js/view.js";
import type { FoliateBook } from "../foliate";
import { getTitle } from "../getTitle";
import { bookKey, type Bytes } from "./bookKey";
import { sources } from "../sources";
import { downloadCover, saveCover } from "./covers";
import { sleep } from "./download";
import { getBook, getBookByKey, listBooks, listNovels, saveBook, saveBookChapters, saveBookPosition, saveBookRead } from "./db";

const appData = { baseDir: BaseDirectory.AppData };

async function readBook(bytes: Bytes) {
  const book = (await makeBook(new File([bytes], "book.epub"))) as FoliateBook;
  const key = await bookKey(book, bytes);
  return { book, key, title: getTitle(book.metadata?.title) || "Untitled" };
}

export function tocHrefs(book: FoliateBook) {
  return (book.toc ?? []).flatMap((item) => [item.href, ...(item.subitems ?? []).map((sub) => sub.href)]);
}

// Adds an EPUB to the library, or finds it if it's already there,
// so opening the same book again keeps its place and its ticks.
export async function addBook(bytes: Bytes) {
  const { key, title } = await readBook(bytes);
  const old = await getBookByKey(key);
  const file = old?.file ?? `books/${Date.now()}.epub`;
  await mkdir("books", { ...appData, recursive: true });
  await writeFile(file, bytes, appData);
  return saveBook(key, file, title);
}

// The book in a library row, ready for foliate. null if its file is gone.
export async function loadBook(id: number) {
  const row = await getBook(id);
  if (!row || !(await exists(row.file, appData))) return null;
  const { book } = await readBook(await readFile(row.file, appData));
  return { row, book };
}

// A book the library hasn't looked inside yet (chapters is still 0) gets its cover
// and its chapter count, once. That's every book the first time, then only new ones.
export async function prepareBooks() {
  for (const row of await listBooks()) {
    if (row.chapters > 0) continue;
    try {
      const loaded = await loadBook(row.id);
      if (!loaded) continue;
      const cover = await loaded.book.getCover?.();
      if (cover) await saveCover(`book-${row.id}`, cover);
      await saveBookChapters(row.id, tocHrefs(loaded.book).length);
    } catch (err) {
      console.error(`Couldn't prepare ${row.title}`, err);
    }
  }
}

// The library's Refresh button: asks each novel's site for its cover again, and pulls the
// cover out of any EPUB that doesn't have one. One novel at a time, like the update check.
export async function refreshCovers() {
  for (const novel of await listNovels()) {
    try {
      const source = sources.find((s) => s.id === novel.source);
      if (!source) continue;
      const site = await source.parseNovel(novel.path);
      if (site.cover) await downloadCover(`novel-${novel.id}`, site.cover);
    } catch (err) {
      console.error(`Couldn't refresh ${novel.name}`, err);
    }
    await sleep(500);
  }
  for (const row of await listBooks()) {
    if (await exists(`covers/book-${row.id}.jpg`, appData)) continue;
    try {
      const cover = await (await loadBook(row.id))?.book.getCover?.();
      if (cover) await saveCover(`book-${row.id}`, cover);
    } catch (err) {
      console.error(`Couldn't refresh ${row.title}`, err);
    }
  }
}

// Moves books from the old nyxa.json store to the new library table.
export async function moveOldBooks() {
  const store = await load("nyxa.json");
  if (await store.get("booksMoved")) return;

  const last = await store.get<{ file: string; position: string }>("lastBook");
  const entries = (await exists("books", appData)) ? await readDir("books", appData) : [];
  // The names are Date.now() numbers, so sorting puts the oldest copy first.
  const files = entries.map((e) => `books/${e.name}`).filter((f) => f.endsWith(".epub")).sort();

  for (const file of files) {
    try {
      const { key, title } = await readBook(await readFile(file, appData));
      const older = await getBookByKey(key);
      const id = await saveBook(key, file, title); // the newest copy wins
      if (older && older.file !== file) await remove(older.file, appData);

      const ticks = await store.get<number[]>(`read ${file}`);
      const read = new Set<number>([...JSON.parse(older?.read ?? "[]"), ...(ticks ?? [])]);
      await saveBookRead(id, [...read]);
      if (last?.file === file) {
        await saveBookPosition(id, last.position);
        await store.set("lastBookId", id);
      }
      await store.delete(`read ${file}`);
    } catch (err) {
      console.error(`Couldn't move ${file}`, err);
    }
  }
  await store.delete("lastBook");
  await store.set("booksMoved", true);
}
