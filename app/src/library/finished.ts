export function finishedChapter(previous: number | null, current: number) {
  if (previous === null) return null;
  return current === previous + 1 ? previous : null;
}