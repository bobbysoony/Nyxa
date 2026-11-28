// One novel's place, the way it goes in the sync file. Ids are different on every device,
// so a novel is matched by its source and path instead, those are the same everywhere
export type NovelPlace = {
  source: string;
  path: string;
  name: string;
  chapter: number | null;
  paragraph: number;
  list: string;
  changedAt: number;
};

export const keyOf =(place: NovelPlace) => `${place.source} ${place.path}`;

// Is a further along than b? Chapter first, then paragraph
function further(a: NovelPlace, b: NovelPlace) {
  if (a.chapter === null) return false;
  if (b.chapter === null) return true;
  return a.chapter > b.chapter || (a.chapter === b.chapter && a.paragraph > b.paragraph);
}

// This device moved within 5 minutes of the other one's place: you just switched devices and
// scrolled before the sync landed, so the other device's further place wins without asking
const SWITCH_GAP = 5 * 60 * 1000;

// Newest wins, one novel at a time. take = the ones this device should copy,
// file = what goes back in Drive, which keeps novels this device doesn't have so they aren't lost.
// ahead = the other device is further along but older, like a PC you touched before it synced.
// Neither wins on its own there: Drive keeps theirs and the person gets asked. keepMine = ones they said Stay to
export function mergePlaces(mine: NovelPlace[], theirs: NovelPlace[], keepMine = new Set<string>()) {
  const file = new Map(theirs.map((place) => [keyOf(place), place]));
  const take: NovelPlace[] = [];
  const ahead: NovelPlace[] = [];
  for (const place of mine) {
    const other = file.get(keyOf(place));
    if (other && other.changedAt > place.changedAt) take.push(other);
    else if (other && other.changedAt < place.changedAt && further(other, place) && !keepMine.has(keyOf(place))) {
      if (place.changedAt - other.changedAt < SWITCH_GAP) take.push(other);
      else ahead.push(other);
    } else file.set(keyOf(place), place);
  }
  return { take, ahead, file: [...file.values()] };
}
