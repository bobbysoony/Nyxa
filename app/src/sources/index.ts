import type { Source } from "./types";

const found = import.meta.glob<Source>("./*/index.ts", { eager: true, import: "default" });

export const sources = Object.values(found);