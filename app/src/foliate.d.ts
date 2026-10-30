// Types for the parts of foliate-js that Nyxa uses.
// foliate-js is plain JavaScript, so TypeScript can't see inside it.
// This file describes it, so Reader.tsx doesn't need `as any`.

export type TocItem = {
  label: string;
  href: string;
  subitems?: TocItem[];
};

export type RelocateDetail = {
  cfi: string;
  fraction?: number;
  tocItem?: TocItem;
  range?: Range;
  section?: { current: number; total: number };
};

export type LoadDetail = {
  doc: Document;
  index: number;
};

export type FoliateSection = {
  id: string;
  size: number;
  linear: string;
  load(): Promise<string>;
  unload(): void;
};

export type FoliateBook = {
  metadata?: { title?: string | Record<string, string> };
  toc?: TocItem[];
  sections?: FoliateSection[];
  resolveHref?(href: string): { index: number; anchor(doc: Document): Element | number | null } | null;
  splitTOCHref?(href: string): string[];
  getTOCFragment?(doc: Document, fragment: string): Element | null;
};

export interface FoliateView extends HTMLElement {
  book: FoliateBook;
  renderer: HTMLElement & { setStyles(css: string): void };
  open(book: File | FoliateBook): Promise<void>;
  init(options: { lastLocation?: string; showTextStart?: boolean }): Promise<void>;
  goTo(target: string | number): Promise<unknown>;
  prev(): Promise<void>;
  next(): Promise<void>;
  goLeft(): Promise<void>;
  goRight(): Promise<void>;

  addEventListener(type: "relocate", listener: (e: CustomEvent<RelocateDetail>) => void): void;
  addEventListener(type: "load", listener: (e: CustomEvent<LoadDetail>) => void): void;
  addEventListener(type: string, listener: EventListenerOrEventListenerObject): void;
}

declare global {
  interface HTMLElementTagNameMap {
    "foliate-view": FoliateView;
  }
}   