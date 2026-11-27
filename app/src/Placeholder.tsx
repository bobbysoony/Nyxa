import type { Settings } from "./settings";

// How wide each grey line is, in %. Three paragraphs, each ending on a shorter line like real text
const paragraphs = [
  [100, 97, 100, 64],
  [100, 100, 95, 100, 41],
  [100, 98, 77],
];

type PlaceholderProps = {
  settings: Settings;
  shown: boolean;
  message: string;
};

// Soft grey lines where the text will be, while a chapter or book opens, so the page is never blank.
// They're the same size and spacing as your text, so nothing jumps when the words arrive.
// The idea is from LNReader's chapter loading screen (MIT licence), drawn our own way
function Placeholder({ settings, shown, message }: PlaceholderProps) {
  const lineGap = (settings.lineHeight - 0.6) / 2; // a bar is 0.6 of a letter tall, the rest of the line is space
  return (
    <div
      className={shown ? "reader-placeholder" : "reader-placeholder done"}
      style={{ fontSize: settings.fontSize, padding: `48px ${settings.margin}%` }}
      aria-hidden={!shown}
    >
      {message ? (
        <p className="reader-message">{message}</p>
      ) : (
        // scrolled mode puts the text in a centred column, page mode runs it from the left, so the lines do the same
        <div className={settings.readingMode === "scrolled" ? "placeholder-column scrolled" : "placeholder-column"}>
          <div className="placeholder-title" />
          {paragraphs.map((widths, i) => (
            <div key={i} className="placeholder-paragraph" style={{ marginBottom: `${settings.paragraphGap}em` }}>
              {widths.map((width, j) => (
                <div key={j} className="placeholder-line" style={{ width: `${width}%`, margin: `${lineGap}em 0` }} />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Placeholder;
