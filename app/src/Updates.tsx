import { useEffect, useState } from "react";
import { listUpdates, saveNovelPosition, type UpdateRow } from "./library/db";
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
          onClick={async () => {
            // The Reader opens a novel at its saved place, so make that place the start of this chapter.
            await saveNovelPosition(row.novel_id, row.number, 0);
            onRead(row.novel_id);
          }}
        >
          <span className="updates-novel">{row.novel_name}</span>
          <span>{row.name}</span>
        </button>
      ))}
    </div>
  );
}

export default Updates;
