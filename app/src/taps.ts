export type TapZone = "left" | "middle" | "right";

// Which part of the screen was tapped? The outer 30% on each side
// turns pages; the middle 40% shows or hides the bars.
export function tapZone(x: number, width: number): TapZone {
  if (x < width * 0.3) return "left";
  if (x > width * 0.7) return "right";
  return "middle";
}
