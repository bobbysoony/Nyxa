import { invoke } from "@tauri-apps/api/core";
import { getDb, type ChapterRow } from "./db";
import { failReason, makePool, withRetry, type Pool } from "./pool";
import { sources } from "../sources";
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
  steps: string[]; // what each chapter downloading right now is doing, like "Saving Chapter 12"
};

type Job = { source: Source; chapter: ChapterRow };

// The queue itself is in the database: chapters.download_state says 'waiting' or 'failed'.
// What's here is only this run of Nyxa: the workers, and the numbers the bar shows.
const downloads: Downloads = { waiting: 0, downloading: 0, done: 0, failed: 0, steps: [] };
const pools = new Map<string, Pool<Job>>(); // one pool per site, so each site has its own limit
const queued = new Set<number>(); // chapter ids a worker has or will get, so none is handed out twice
const watchers = new Set<(downloads: Downloads) => void>();
const steps = new Map<number, string>(); // chapter id → its step, so workers don't talk over each other

function tell() {
  watchers.forEach((watcher) => watcher({ ...downloads }));
}

// `null` means the chapter is finished, so its line goes away.
function setStep(chapterId: number, step: string | null) {
  if (step === null) steps.delete(chapterId);
  else steps.set(chapterId, step);
  downloads.steps = [...steps.values()];
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
  setStep(chapter.id, `Fetching ${chapter.name}`);
  const db = await getDb();
  try {
    const html = await withRetry(() => source.parseChapter(chapter.path), 4, (ms, err) => {
      setStep(chapter.id, `${chapter.name} didn't load: ${failReason(err)}. Trying again in ${ms / 1000} s`);
      return sleep(ms);
    });
    setStep(chapter.id, `Saving ${chapter.name}`);
    await invoke("save_chapter_text", { chapterId: chapter.id, html });
    // waiting → done: one UPDATE, so a chapter is never "downloaded but still waiting".
    await db.execute("UPDATE chapters SET downloaded = 1, download_state = NULL WHERE id = $1", [chapter.id]);
    downloads.done++;
  } catch (err) {
    console.error(`Chapter ${chapter.number} failed after 4 tries`, err);
    await db.execute("UPDATE chapters SET download_state = 'failed' WHERE id = $1", [chapter.id]);
    downloads.failed++;
  }
  downloads.downloading--;
  queued.delete(chapter.id);
  setStep(chapter.id, null);
  await sleep(1000 + Math.random() * 1000); // a short rest before this worker asks the site again
}

// Hands every chapter marked 'waiting' in the database to its site's pool, unless a worker has it already.
// Every way into the queue ends here: Download, Try again, and Nyxa opening.
export async function startWaiting() {
  const db = await getDb();
  const rows = await db.select<(ChapterRow & { source: string })[]>(
    `SELECT chapters.*, novels.source
     FROM chapters JOIN novels ON novels.id = chapters.novel_id
     WHERE chapters.download_state = 'waiting'
     ORDER BY chapters.novel_id, chapters.number`,
  );
  const failed = await db.select<{ n: number }[]>(
    "SELECT COUNT(*) AS n FROM chapters WHERE download_state = 'failed'",
  );
  downloads.failed = failed[0].n;
  // Starting again after everything finished: forget the old count.
  if (downloads.waiting === 0 && downloads.downloading === 0) downloads.done = 0;

  for (const chapter of rows) {
    if (queued.has(chapter.id)) continue;
    const source = sources.find((s) => s.id === chapter.source);
    if (!source) continue; // that site isn't on this device, so the chapter keeps waiting
    let pool = pools.get(source.id);
    if (!pool) {
      pool = makePool(PER_SITE, downloadOne);
      pools.set(source.id, pool);
    }
    queued.add(chapter.id);
    downloads.waiting++;
    pool.add([{ source, chapter }]);
  }
  tell();
}

// Marks the next `count` chapters of a novel that aren't downloaded as 'waiting'.
// Ones already waiting are skipped, so pressing Download again queues the next lot. Failed ones get another go.
// With `onlyNew`, only chapters an update check found that you haven't read (lesson 23b).
export async function queueChapters(novelId: number, count: number, onlyNew = false) {
  const db = await getDb();
  await db.execute(
    `UPDATE chapters SET download_state = 'waiting'
     WHERE id IN (
       SELECT id FROM chapters
       WHERE novel_id = $1 AND downloaded = 0
         AND (download_state IS NULL OR download_state = 'failed')
         AND ($3 = 0 OR (found_at IS NOT NULL AND read = 0))
       ORDER BY number
       LIMIT $2
     )`,
    [novelId, count, onlyNew ? 1 : 0],
  );
  await startWaiting();
}

// Stop button: nothing is waiting any more. Chapters already downloading finish.
export async function stopDownloads() {
  for (const pool of pools.values()) {
    pool.clear().forEach((job) => queued.delete(job.chapter.id));
  }
  downloads.waiting = 0;
  tell();
  const db = await getDb();
  await db.execute("UPDATE chapters SET download_state = NULL WHERE download_state = 'waiting'");
}

// Try again button: every failed chapter goes back to waiting.
export async function retryFailed() {
  const db = await getDb();
  await db.execute("UPDATE chapters SET download_state = 'waiting' WHERE download_state = 'failed'");
  await startWaiting();
}

// The ✕ on "Downloads finished": forget the failed ones too, which hides the bar.
export async function clearFinished() {
  const db = await getDb();
  await db.execute("UPDATE chapters SET download_state = NULL WHERE download_state = 'failed'");
  downloads.done = 0;
  downloads.failed = 0;
  tell();
}
