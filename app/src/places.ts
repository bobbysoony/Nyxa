export type Place = {
  screen: "library" | "reader" | "browse" | "updates";
  novelId: number | null;
  bookId: number | null;
};

export const library: Place = { screen: "library", novelId: null, bookId: null };
export const reader: Place = { screen: "reader", novelId: null, bookId: null };
export const browse: Place = { screen: "browse", novelId: null, bookId: null };
export const updates: Place = { screen: "updates", novelId: null, bookId: null };

// Going somewhere new puts it on top of the pile. Going somewhere already in the pile cuts back to it.
export function goTo(places: Place[], next: Place): Place[] {
  const index = places.findIndex(
    (place) => place.screen === next.screen && place.novelId === next.novelId && place.bookId === next.bookId,
  );
  if (index === -1) return [...places, next];
  return index === places.length - 1 ? places : places.slice(0, index + 1);
}

// Back takes the top place off. With only one left there's nowhere to go back to.
export function goBack(places: Place[]): Place[] | null {
  return places.length > 1 ? places.slice(0, -1) : null;
}
