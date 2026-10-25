// The shapes LNReader's plugins use (Plugin.NovelItem and friends in
// their src/types/plugin.ts). Nyxa's sources use the same shapes, so
// LNReader plugins and Nyxa's own sources can be swapped freely later.

export type NovelItem = {
  name: string;
  path: string; // the address without the site, like "book/shadow-slave"
  cover?: string;
};

export type ChapterItem = {
  name: string;
  path: string;
  chapterNumber?: number;
  releaseTime?: string | null;
};

export type SourceNovel = NovelItem & {
  author?: string;
  summary?: string;
  status?: string;
  genres?: string;
  chapters?: ChapterItem[];
};

export type Source = {
  id: string;
  name: string;
  site: string;
  version: string;
  icon: string;
  popularNovels(pageNo: number, options?: { showLatestNovels?: boolean }): Promise<NovelItem[]>;
  searchNovels(searchTerm: string, pageNo: number): Promise<NovelItem[]>;
  parseNovel(novelPath: string): Promise<SourceNovel>;
  parseChapter(chapterPath: string): Promise<string>;
};