import type { List } from "./lists";

// what the site says about the series, still coming out, on a break, or finished
export type Status = "ongoing" | "hiatus" | "completed" | "unknown";

// every site writes it differently (Ongoing, COMPLETED, On Hiatus), so this turns it into one of four
// anything else is unknown, and unknown never moves a novel
export function toStatus(text?: string | null): Status {
  const word = (text ?? "").trim().toLowerCase();
  if (word.startsWith("complete")) return "completed";
  if (word === "ongoing") return "ongoing";
  if (word.includes("hiatus")) return "hiatus";
  return "unknown";
}

// what shows on the novel page, unknown shows nothing
export function statusLabel(status: Status) {
  if (status === "completed") return "Completed";
  if (status === "ongoing") return "Ongoing";
  if (status === "hiatus") return "On hiatus";
  return "";
}

// if the site says the series is finished and you've read every chapter, it moves from Reading (or Rereading) to Completed
// ongoing ones stay put cause more chapters are coming, and other lists you picked yourself are left alone
export function shouldComplete(list: List, status: Status, unread: number, total: number) {
  const reading = list === "reading" || list === "rereading";
  return reading && status === "completed" && total > 0 && unread === 0;
}

// same idea for a series on a break: once you're caught up it moves from Reading (or Rereading) to On hold
export function shouldPause(list: List, status: Status, unread: number, total: number) {
  const reading = list === "reading" || list === "rereading";
  return reading && status === "hiatus" && total > 0 && unread === 0;
}

// a series sitting On hold that the site says is back (ongoing or finished) gets a notification
// unknown doesn't count, a page that failed to load shouldn't look like the break ended
export function cameOffHiatus(before: Status, now: Status, list: List) {
  return list === "paused" && before === "hiatus" && (now === "ongoing" || now === "completed");
}
