// Most books give their title as text, but some give a set of
// translations instead, like { ja: "シャドウ・スレイブ" }. Handle both.
export function getTitle(title: string | Record<string, string> | undefined) {
  if (!title) return "";
  if (typeof title === "string") return title;
  return Object.values(title)[0] ?? "";
}