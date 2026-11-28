import { fetch } from "@tauri-apps/plugin-http";
import { currentAccount, SignInError } from "./google";
import { Settings } from "../settings";

const FILES = "https://www.googleapis.com/drive/v3/files";
const UPLOAD = "https://www.googleapis.com/upload/drive/v3/files";

// The one file Nyxa keeps in your Drive, it shows up in My Drive with this name
const NAME = "Nyxa sync.json";

// What goes in the file for now, lesson 26d adds your place, lists and ticks
export type SyncFile = { savedAt: number; device: string; settings: Settings };

// Every Drive request goes through here so the token and the error checks are in one place
async function drive(url: string, init: { method?: string; headers?: Record<string, string>; body?: string } = {}) {
  const account = currentAccount();
  if (!account) throw new SignInError("Sign in first.");
  const res = await fetch(url, { ...init, headers: { ...init.headers, Authorization: `Bearer ${account.accessToken}` } });
  // Google's pass only lasts an hour, and Nyxa can't get a new one by itself yet
  if (res.status === 401) throw new SignInError("Google's sign-in ran out. Sign out and sign in again.");
  if (!res.ok) throw new Error(`drive ${res.status}: ${await res.text()}`);
  return res;
}

// With drive.file Google only ever lists files Nyxa made, so this can't find anything else of yours
async function findFile(): Promise<string | null> {
  const q = encodeURIComponent(`name = '${NAME}' and trashed = false`);
  const res = await drive(`${FILES}?q=${q}&fields=files(id)`);
  const { files } = await res.json();
  return files[0]?.id ?? null;
}

export async function saveSyncFile(data: SyncFile) {
  let id = await findFile();
  // The first save makes an empty file, after that we just write over it
  if (!id) {
    const res = await drive(FILES, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: NAME, mimeType: "application/json" }),
    });
    id = (await res.json()).id;
  }
  await drive(`${UPLOAD}/${id}?uploadType=media`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function loadSyncFile(): Promise<SyncFile | null> {
  const id = await findFile();
  if (!id) return null;
  const res = await drive(`${FILES}/${id}?alt=media`);
  return res.json();
}
