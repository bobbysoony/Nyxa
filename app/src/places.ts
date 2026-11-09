// Where you are in Nyxa, and the places you came through to get here.
export type Place = {
  screen: "library" | "reader" | "browse";
  novelId: number | null;
  bookId: number | null;
};

export const library: Place = { screen: "library", novelId: null, bookId: null };
export const reader: Place = { screen: "reader", novelId: null, bookId: null };
export const browse: Place = { screen: "browse", novelId: null, bookId: null };

// Going somewhere puts it on top of the pile. Going where you already are adds nothing.
export function goTo(places: Place[], next: Place): Place[] {
  const here = places[places.length - 1];
  const same = here.screen === next.screen && here.novelId === next.novelId && here.bookId === next.bookId;
  return same ? places : [...places, next];
}

// Back takes the top place off. With only one left there's nowhere to go back to.
export function goBack(places: Place[]): Place[] | null {
  return places.length > 1 ? places.slice(0, -1) : null;
}
