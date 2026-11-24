import { sources } from "../sources";
import type { ChapterItem } from "../sources/types";
import { getChapters, listNovels, moveIfFinished, saveChapterList, saveNovelStatus, setBackFromHiatus } from "./db";
import { cameOffHiatus, toStatus } from "./status";
import { toList } from "./lists";
import { queueChapters, sleep } from "./download";

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
        // the site might say the series has finished since last time
        const status = toStatus(site.status);
        const before = toStatus(novel.status);
        await saveNovelStatus(novel.id, status);
        // only when it changes, so a novel you moved back to Reading yourself stays there
        if ((status === "completed" || status === "hiatus") && status !== before) await moveIfFinished(novel.id);
        if (cameOffHiatus(before, status, toList(novel.list))) await setBackFromHiatus(novel.id, true);
        // auto_limit is the cap: a novel you haven't opened for months could have hundreds waiting.
        if (novel.auto_download && found.length > 0) await queueChapters(novel.id, novel.auto_limit, true);
      } catch (err) {
        console.error(`Couldn't check ${novel.name}:`, err);
        check.failed++;
      }
      check.done++;
      onProgress({ ...check });
      await sleep(500);
    }
    return check;
  } finally {
    running = false;
  }
}
