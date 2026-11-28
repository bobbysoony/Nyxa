import { invoke } from "@tauri-apps/api/core";

// A phone's model from the WebView's user agent, like "SM-S937B" in "Linux; Android 14; SM-S937B Build/...".
// Newer Androids can hide it as just "K", which tells you nothing, so that counts as no model
export function phoneModel(userAgent: string) {
  const model = userAgent.match(/Android [^;)]*; ([^;)]+?)(?: Build\/|;|\))/)?.[1]?.trim();
  return model && model !== "K" ? model : null;
}

// What the other device shows in "Synced ... from ___": the phone's model, or the computer's name
export async function deviceName() {
  if (navigator.userAgent.includes("Android")) {
    const model = phoneModel(navigator.userAgent);
    return model ? `your phone (${model})` : "your phone";
  }
  const name = await invoke<string>("computer_name").catch(() => "");
  return name ? `your computer (${name})` : "a computer";
}
