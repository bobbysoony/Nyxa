// The reader's icons, all drawn the same way: thin lines with round ends on a 24 by 24 grid
// Drawn by hand, so there's no icon package to install
const paths = {
  contents: "M9 6h16 M9 12h16 M9 18h10 M4.5 6v.01 M4.5 12v.01 M4.5 18v.01",
  info: "M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18 M12 11v6 M12 7.5v.5",
  text: "M3 19 8.5 5 14 19 M5.2 14h6.6 M21 13v6 M21 16a3 3 0 1 1-6 0a3 3 0 1 1 6 0",
  back: "M15 5l-7 7 7 7",
  next: "M9 5l7 7-7 7",
};

export type IconName = keyof typeof paths;

function Icon({ name }: { name: IconName }) {
  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  );
}

export default Icon;