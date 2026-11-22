// the six lists a title can be on, same as AniList so syncing with it later just lines up
export type List = "reading" | "rereading" | "planning" | "completed" | "paused" | "dropped";

// value is what gets saved in the database, label is what you see on screen
export const lists: { value: List; label: string }[] = [
  { value: "reading", label: "Reading" },
  { value: "rereading", label: "Rereading" },
  { value: "planning", label: "Plan to read" },
  { value: "completed", label: "Completed" },
  { value: "paused", label: "On hold" },
  { value: "dropped", label: "Dropped" },
];

// the database can give back any text, so this makes sure it's one of the six lists
// if it isn't (like a typo), it goes on Reading so the title never goes missing
export function toList(value: string): List {
  const found = lists.find((list) => list.value === value);
  return found ? found.value : "reading";
}
