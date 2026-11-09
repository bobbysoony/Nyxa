import { BaseDirectory, exists, mkdir, readFile, writeFile } from "@tauri-apps/plugin-fs";
import { fetchApi } from "../libs/fetch";

const appData = { baseDir: BaseDirectory.AppData };
const WIDTH = 300;

// How big the thumbnail is: WIDTH wide, the same shape as the picture, never bigger than it.
export function thumbnailSize(width: number, height: number) {
  const scale = Math.min(1, WIDTH / width);
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

// Draws the cover small on a canvas and saves it as a JPEG: a few KB instead of a few MB.
async function thumbnail(image: Blob) {
  const bitmap = await createImageBitmap(image);
  const canvas = document.createElement("canvas");
  Object.assign(canvas, thumbnailSize(bitmap.width, bitmap.height));
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise<Blob | null>((done) => canvas.toBlob(done, "image/jpeg", 0.85));
}

// Covers live in the covers folder as book-3.jpg or novel-1.jpg.
export async function saveCover(name: string, image: Blob) {
  const small = await thumbnail(image);
  if (!small) return;
  await mkdir("covers", { ...appData, recursive: true });
  await writeFile(`covers/${name}.jpg`, new Uint8Array(await small.arrayBuffer()), appData);
}

// A web novel's cover comes from its site, through lesson 11's fetchApi.
export async function downloadCover(name: string, url: string) {
  const response = await fetchApi(url);
  if (response.ok) await saveCover(name, await response.blob());
}

// A blob: link the page can show (the CSP allows blob: images), or null if there's no cover.
export async function coverLink(name: string) {
  const file = `covers/${name}.jpg`;
  if (!(await exists(file, appData))) return null;
  return URL.createObjectURL(new Blob([await readFile(file, appData)], { type: "image/jpeg" }));
}
