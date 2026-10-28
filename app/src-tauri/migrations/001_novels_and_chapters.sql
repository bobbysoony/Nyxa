-- Lesson 14: Nyxa's first two tables.

CREATE TABLE novels (
  id INTEGER PRIMARY KEY,
  source TEXT NOT NULL,
  path TEXT NOT NULL,
  name TEXT NOT NULL,
  author TEXT,
  summary TEXT,
  UNIQUE (source, path)
);

CREATE TABLE chapters (
  id INTEGER PRIMARY KEY,
  novel_id INTEGER NOT NULL REFERENCES novels (id),
  number INTEGER NOT NULL,
  name TEXT NOT NULL,
  path TEXT NOT NULL,
  volume TEXT,
  downloaded INTEGER NOT NULL DEFAULT 0,
  UNIQUE (novel_id, number)
);