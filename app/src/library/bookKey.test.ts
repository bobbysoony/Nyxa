import { expect, test } from "vitest";
import { bookKey, fingerprint } from "./bookKey";

const abc = new TextEncoder().encode("abc");

test("same bytes give the same fingerprint", async () => {
  expect(await fingerprint(abc)).toBe(await fingerprint(new TextEncoder().encode("abc")));
  expect(await fingerprint(abc)).not.toBe(await fingerprint(new TextEncoder().encode("abd")));
});

test("a book is known by its own ID", async () => {
  const book = { metadata: { identifier: "urn:uuid:1234" } };
  expect(await bookKey(book, abc)).toBe("urn:uuid:1234");
});

test("a book with no ID is known by its fingerprint", async () => {
  const key = await bookKey({ metadata: {} }, abc);
  expect(key).toBe("sha256:ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
});