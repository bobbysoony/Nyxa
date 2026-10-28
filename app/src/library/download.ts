import { invoke } from "@tauri-apps/api/core";
import { getDb, type ChapterRow } from "./db";
import type { Source } from "../sources/types";

// Wait for `ms` milliseconds. `await sleep(1000)` pauses for one second.
export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type Progress = {
  done: number;
  total: number;
  failed: number;
};

export async function downloadChapters(
  source: Source,
  novelId: number,
  count: number,
  onProgress: (progress: Progress) => void,
  shouldStop: () => boolean,
) {
  const db = await getDb();
  const chapters = await db.select<ChapterRow[]>(
    `SELECT * FROM chapters
     WHERE novel_id = $1 AND downloaded = 0
     ORDER BY number
     LIMIT $2`,
    [novelId, count],
  );

  const progress: Progress = { done: 0, total: chapters.length, failed: 0 };
  onProgress({ ...progress });

  for (const chapter of chapters) {
    if (shouldStop()) break;

    // Try twice: a failure is often a brief hiccup, so wait 5 seconds and retry once.
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const html = await source.parseChapter(chapter.path);
        await invoke("save_chapter_text", { chapterId: chapter.id, html });
        await db.execute("UPDATE chapters SET downloaded = 1 WHERE id = $1", [chapter.id]);
        progress.done++;
        break;
      } catch (err) {
        console.error(`Chapter ${chapter.number} failed (attempt ${attempt})`, err);
        if (attempt === 2) {
          progress.failed++;
        } else {
          await sleep(5000);
          if (shouldStop()) break;
        }
      }
    }

    onProgress({ ...progress });
    await sleep(500 + Math.random() * 1000);
  }

  return progress;
}