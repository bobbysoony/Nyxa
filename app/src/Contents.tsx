import type { TocItem } from "./foliate";

type ContentsProps = {
  toc: TocItem[];
  current: string;
  downloaded: number | null;
  onPick: (href: string) => void;
  onClose: () => void;
};

function Contents({ toc, current, downloaded, onPick, onClose }: ContentsProps) {

  function entry(item: TocItem) {
    return (
      <button
        className={item.label === current ? "contents-item current" : "contents-item"}
        onClick={() => onPick(item.href)}
      >
        {item.label}
      </button>
    );
  }

  return (
    <nav className="contents">
      <button onClick={onClose}>✕ Close</button>
      {downloaded !== null && <p>{downloaded.toLocaleString()} chapters downloaded</p>}
      <ol>
        {toc.map((item) => (
          <li key={item.href + item.label}>
            {item.subitems?.length ? (
              <details open={item.subitems.some((sub) => sub.label === current)}>
                <summary>{item.label}</summary>
                <ol>
                  {item.subitems.map((sub) => (
                    <li key={sub.href}>{entry(sub)}</li>
                  ))}
                </ol>
              </details>
            ) : (
              entry(item)
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export default Contents;
