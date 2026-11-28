import { load } from "@tauri-apps/plugin-store";
import { defaultSettings, Settings } from "../settings";
import { listNovelPlaces, takeNovelPlace, tickChaptersBeforePlaces } from "../library/db";
import { loadSyncFile, saveSyncFile } from "./drive";
import { googleReady, restoreSignIn } from "./google";
import { keyOf, mergePlaces, type NovelPlace } from "./places";
import { deviceName } from "./device";

let running: Promise<void> | null = null;

// What a sync brought in from another device: the places it took, the ones further along that need
// a Go or Stay (see mergePlaces), and which device saved them
export type Synced = { take: NovelPlace[]; ahead: NovelPlace[]; device: string };

// Novels you said Stay to, so the next sync sends your place instead of asking again
const keepMine = new Set<string>();

// The sync bar and the Reader both listen here: the bar says what came in, the Reader jumps to a new place
const listeners = new Set<(synced: Synced) => void>();
export function watchSync(listener: (synced: Synced) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// Gets the file, takes anything newer from it, and puts the merged file back.
// Pass settings to send yours too (Save to Drive). Without them the file keeps the settings it has
export function syncNow(settings?: Settings) {
  // If a sync is already going, wait for that one. Two at once could both make a file
  running ??= syncOnce(settings).finally(() => (running = null));
  return running;
}

async function syncOnce(settings?: Settings) {
  if (!googleReady || !(await restoreSignIn())) return; // not signed in, nothing to sync
  const file = await loadSyncFile();
  const keep = new Set(keepMine); // only the Stays made before this sync started count as done after it
  const { take, ahead, file: novels } = mergePlaces(await listNovelPlaces(), file?.novels ?? [], keep);
  for (const place of take) await takeNovelPlace(place);
  if (take.length > 0) await tickChaptersBeforePlaces();
  if (file && take.length + ahead.length > 0) {
    for (const listener of listeners) listener({ take, ahead, device: file.device });
  }
  // nothing here is newer than Drive's copy, so the every-minute syncs don't write the same file again
  const same = file && !settings && novels.every((p) => (file.novels ?? []).some((f) => f.source === p.source && f.path === p.path && f.changedAt === p.changedAt));
  if (same) return;
  await saveSyncFile({
    savedAt: Date.now(),
    device: await deviceName(),
    settings: settings ?? file?.settings ?? (await savedSettings()),
    novels,
  });
  for (const key of keep) keepMine.delete(key);
}

// Go on the sync bar: take the other device's place, and tell the Reader so it jumps there if that novel is open
export async function goThere(place: NovelPlace, device: string) {
  await takeNovelPlace(place);
  await tickChaptersBeforePlaces();
  for (const listener of listeners) listener({ take: [place], ahead: [], device });
}

// Stay on the sync bar: send this device's place to Drive as the one to keep
export async function stayHere(place: NovelPlace) {
  keepMine.add(keyOf(place));
  await syncNow();
  if (keepMine.has(keyOf(place))) await syncNow(); // a sync that was already going didn't know about the Stay yet
}

// The very first sync has no file to copy settings from, so it uses this device's
async function savedSettings() {
  const store = await load("nyxa.json");
  return { ...defaultSettings, ...(await store.get<Settings>("settings")) };
}
