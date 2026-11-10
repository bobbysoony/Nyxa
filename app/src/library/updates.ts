import { sources } from "../sources";
import type { ChapterItem } from "../sources/types";
import { getChapters, listNovels, saveChapterList } from "./db";
import { sleep } from "./download";

// The chapters on the site that Nyxa doesn't have yet, in the site's order.
// A chapter is known by its path, because names can change ("Chapter 12" → "Chapter 12: The Spire").
export function newChapters(known: string[], fetched: ChapterItem[]) {
  const have = new Set(known);
  return fetched.filter((chapter) => !have.has(chapter.path));
}

export type Check = { done: number; total: number; found: number; failed: number };

let running = false;

// Asks each novel's site for its chapter list and saves the chapters Nyxa didn't have.
// One novel at a time, with a short pause between, so no site gets a burst of requests.
export async function checkForUpdates(onProgress: (check: Check) => void) {
  if (running) return; // already checking (React runs effects twice in development)
  running = true;
  try {
    const novels = await listNovels();
    const check: Check = { done: 0, total: novels.length, found: 0, failed: 0 };
    onProgress({ ...check });
    for (const novel of novels) {
      try {
        const source = sources.find((s) => s.id === novel.source);
        if (!source) throw new Error(`no source called ${novel.source} on this device`);
        const site = await source.parseNovel(novel.path);
        const chapters = await getChapters(novel.id);
        const found = newChapters(chapters.map((c) => c.path), site.chapters ?? []);
        // New chapters go after the last one Nyxa has.
        await saveChapterList(novel.id, found, chapters.length + 1, Date.now());
        check.found += found.length;
      } catch (err) {
        console.error(`Couldn't check ${novel.name}:`, err);
        check.failed++;
      }
      check.done++;
      onProgress({ ...check });
      await sleep(500);
    }
  } finally {
    running = false;
  }
}
