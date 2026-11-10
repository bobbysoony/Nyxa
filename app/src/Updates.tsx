import { useEffect, useState } from "react";
import { ask } from "@tauri-apps/plugin-dialog";
import { getNovel, listUpdates, saveNovelPosition, type UpdateRow } from "./library/db";
import type { Check } from "./library/updates";

type UpdatesProps = {
  check: Check | null;
  onCheck: () => void;
  onRead: (novelId: number) => void;
};

function checkText(check: Check | null) {
  if (!check) return "";
  if (check.done < check.total) return `Checking for new chapters… ${check.done} of ${check.total}`;
  const found = check.found === 1 ? "1 new chapter" : `${check.found.toLocaleString()} new chapters`;
  const failed = check.failed ? `, ${check.failed} couldn't be checked` : "";
  const novels = check.total === 1 ? "1 novel" : `${check.total} novels`;
  return `Checked ${novels}: ${found}${failed}`;
}

function Updates({ check, onCheck, onRead }: UpdatesProps) {
  const [rows, setRows] = useState<UpdateRow[]>([]);
  const checking = check !== null && check.done < check.total;

  // Load again whenever a check finds more, so new chapters appear while you watch.
  useEffect(() => {
    listUpdates().then(setRows);
  }, [check?.found]);

  // The Reader opens a novel at its saved place, so "start at this chapter" means
  // changing the saved place first. Only do that if the person agrees.
  async function openFromUpdate(row: UpdateRow) {
    const novel = await getNovel(row.novel_id);
    const current = novel?.last_chapter;

    // Already on this chapter: nothing to override, keep the exact spot.
    if (current === row.number) {
      onRead(row.novel_id);
      return;
    }

    // No saved place yet: nothing to lose, so start at this chapter.
    if (!current) {
      await saveNovelPosition(row.novel_id, row.number, 0);
      onRead(row.novel_id);
      return;
    }

    const override = await ask(
      `Your current place is chapter ${current}.\nMove it to "${row.name}"?`,
      {
        title: row.novel_name,
        kind: "info",
        okLabel: "Yes, move it",
        cancelLabel: "No, keep my place",
      },
    );

    // "No" (or closing the box) leaves the saved place alone and opens the novel where you were.
    if (override) await saveNovelPosition(row.novel_id, row.number, 0);
    onRead(row.novel_id);
  }

  return (
    <div className="updates">
      <div className="updates-bar">
        <span>{checkText(check)}</span>
        <button onClick={onCheck} disabled={checking}>Check again</button>
      </div>
      {rows.length === 0 && <p className="updates-empty">No new chapters yet.</p>}
      {rows.map((row) => (
        <button
          key={`${row.novel_id}-${row.number}`}
          className={row.read ? "updates-row" : "updates-row fresh"}
          onClick={() => openFromUpdate(row)}
        >
          <span className="updates-novel">{row.novel_name}</span>
          <span>{row.name}</span>
        </button>
      ))}
    </div>
  );
}

export default Updates;
