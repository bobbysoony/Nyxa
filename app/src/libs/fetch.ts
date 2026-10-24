import { fetch } from "@tauri-apps/plugin-http";

// Every request Nyxa sends goes through here. It has the same name as LNReader api,
// so we can use thier plugins later.
const USER_AGENT =
  "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Mobile Safari/537.36";

export async function fetchApi(url: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  if (!headers.has("User-Agent")) headers.set("User-Agent", USER_AGENT);
  return fetch(url, { ...init, headers });
}