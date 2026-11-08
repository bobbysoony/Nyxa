import type { FoliateBook } from "../foliate";

// A file's bytes, the way readFile gives them to you.
export type Bytes = Uint8Array<ArrayBuffer>;

// A file's fingerprint: the same bytes always give the same 64 characters.
export async function fingerprint(bytes: Bytes) {
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// What the library knows a book by: its own ID from content.opf, or else its fingerprint.
export async function bookKey(book: FoliateBook, bytes: Bytes) {
  return book.metadata?.identifier || `sha256:${await fingerprint(bytes)}`;
}