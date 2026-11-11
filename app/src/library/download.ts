import { invoke } from "@tauri-apps/api/core";
import { getDb, type ChapterRow } from "./db";
import { failReason, makePool, withRetry, type Pool } from "./pool";
import type { Source } from "../sources/types";

// Wait for `ms` milliseconds. `await sleep(1000)` pauses for one second.
export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// How many chapters one site gets asked for at the same time.
const PER_SITE = 4;

export type Downloads = {
  waiting: number;
  downloading: number;
  done: number;
  failed: number;
  step: string; // what's happening right now, like "Saving Chapter 12"
};

type Job = { source: Source; chapter: ChapterRow };

// The download queue lives here, outside every screen, so it keeps going when you leave Browse.
const downloads: Downloads = { waiting: 0, downloading: 0, done: 0, failed: 0, step: "" };
const pools = new Map<string, Pool<Job>>(); // one pool per site, so each site has its own limit
const queued = new Set<number>(); // chapter ids waiting or downloading, so none is added twice
const watchers = new Set<(downloads: Downloads) => void>();

function tell() {
  watchers.forEach((watcher) => watcher({ ...downloads }));
}

function setStep(step: string) {
  downloads.step = step;
  tell();
}

// Call `watcher` now and every time the queue changes. Returns a function that stops watching.
export function watchDownloads(watcher: (downloads: Downloads) => void) {
  watchers.add(watcher);
  watcher({ ...downloads });
  return () => {
    watchers.delete(watcher);
  };
}

async function downloadOne({ source, chapter }: Job) {
  downloads.waiting--;
  downloads.downloading++;
  setStep(`Fetching ${chapter.name}`);
  try {
    const html = await withRetry(() => source.parseChapter(chapter.path), 4, (ms, err) => {
      setStep(`${chapter.name} didn't load: ${failReason(err)}. Trying again in ${ms / 1000} s`);
      return sleep(ms);
    });
    setStep(`Saving ${chapter.name}`);
    await invoke("save_chapter_text", { chapterId: chapter.id, html });
    const db = await getDb();
    await db.execute("UPDATE chapters SET downloaded = 1 WHERE id = $1", [chapter.id]);
    downloads.done++;
  } catch (err) {
    console.error(`Chapter ${chapter.number} failed after 4 tries`, err);
    downloads.failed++;
  }
  downloads.downloading--;
  queued.delete(chapter.id);
  tell();
  await sleep(1000 + Math.random() * 1000); // a short rest before this worker asks the site again
}

// Puts the next `count` chapters of a novel that aren't downloaded yet into the queue.
export async function queueChapters(source: Source, novelId: number, count: number) {
  const db = await getDb();
  const chapters = await db.select<ChapterRow[]>(
    `SELECT * FROM chapters
     WHERE novel_id = $1 AND downloaded = 0
     ORDER BY number`,
    [novelId],
  );
  // Skip the ones already in the queue, so pressing Download again queues the next lot.
  const jobs = chapters
    .filter((chapter) => !queued.has(chapter.id))
    .slice(0, count)
    .map((chapter) => ({ source, chapter }));
  if (jobs.length === 0) return;

  // Starting again after everything finished: forget the old counts.
  if (downloads.waiting === 0 && downloads.downloading === 0) {
    downloads.done = 0;
    downloads.failed = 0;
  }
  jobs.forEach((job) => queued.add(job.chapter.id));
  downloads.waiting += jobs.length;
  tell();

  let pool = pools.get(source.id);
  if (!pool) {
    pool = makePool(PER_SITE, downloadOne);
    pools.set(source.id, pool);
  }
  pool.add(jobs);
}

// Stop button: empties every waiting line. Chapters already downloading finish.
export function stopDownloads() {
  for (const pool of pools.values()) {
    pool.clear().forEach((job) => queued.delete(job.chapter.id));
  }
  downloads.waiting = 0;
  tell();
}

// The ✕ on "Downloads finished": forget the counts, which hides the bar.
export function clearFinished() {
  downloads.done = 0;
  downloads.failed = 0;
  tell();
}
