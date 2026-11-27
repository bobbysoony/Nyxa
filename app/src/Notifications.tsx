import { useEffect, useState } from "react";
import { listNovels, saveNovelList, setBackFromHiatus, type LibraryRow } from "./library/db";
import type { List } from "./library/lists";
import "./Notifications.css";

type NotificationsProps = {
  onAnswer: () => void; // lets App recount the number on the tab
};

// Novels you were caught up on that came back from hiatus. Picking a list answers it and it goes away.
function Notifications({ onAnswer }: NotificationsProps) {
  const [rows, setRows] = useState<LibraryRow[]>([]);

  async function load() {
    setRows((await listNovels()).filter((novel) => novel.back_from_hiatus === 1));
  }

  useEffect(() => {
    load();
  }, []);

  async function answer(novelId: number, list: List) {
    await saveNovelList(novelId, list);
    await setBackFromHiatus(novelId, false);
    await load();
    onAnswer();
  }

  return (
    <div className="updates">
      {rows.length === 0 && <p className="updates-empty">No notifications.</p>}
      {rows.map((novel) => (
        <div key={novel.id} className="updates-row fresh notification">
          <span>
            <strong>{novel.name}</strong> is off hiatus
          </span>
          <div className="notification-buttons">
            <button onClick={() => answer(novel.id, "reading")}>Move to Reading</button>
            <button onClick={() => answer(novel.id, "paused")}>Keep On hold</button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default Notifications;
