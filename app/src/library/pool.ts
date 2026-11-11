export type Pool<T> = {
  add(jobs: T[]): void;
  clear(): T[];
};

// A waiting line with `size` workers. Each worker takes the next job, does it,
// and comes back for another, until the line is empty. So at most `size` jobs
// run at the same time, however many are waiting.
export function makePool<T>(size: number, work: (job: T) => Promise<void>): Pool<T> {
  const line: T[] = [];
  let workers = 0;

  async function worker() {
    workers++;
    while (line.length > 0) {
      const job = line.shift()!;
      try {
        await work(job);
      } catch (err) {
        console.error("A job failed:", err); // one broken job must not stop the worker
      }
    }
    workers--;
  }

  return {
    // Jobs added while the pool is busy join the end of the line.
    add(jobs: T[]) {
      line.push(...jobs);
      while (workers < size && line.length > 0) worker();
    },
    // Empties the line and hands back what was in it. Jobs already running finish by themselves.
    clear() {
      return line.splice(0);
    },
  };
}

// How long to wait before try number `attempt + 1`: 2 s, then 4 s, then 8 s.
// Each wait is double the last, so a struggling site gets more and more breathing room.
export function retryWait(attempt: number) {
  return 2000 * 2 ** (attempt - 1);
}

// Runs `work`, and if it fails tries again after a growing wait, up to `tries` times in all.
// `pause` does the waiting: Nyxa passes sleep, the tests pass one that doesn't really wait.
// It also gets the error, so it can say why it's waiting.
export async function withRetry<T>(
  work: () => Promise<T>,
  tries: number,
  pause: (ms: number, err: unknown) => Promise<unknown>,
) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await work();
    } catch (err) {
      if (attempt === tries) throw err;
      await pause(retryWait(attempt), err);
    }
  }
}

// A short reason a try failed, for people. When the site answered with an error code,
// the source puts that number on the error as `status`.
export function failReason(err: unknown) {
  const text = err instanceof Error ? err.message : String(err);
  const status = err instanceof Error && "status" in err ? Number(err.status) : 0;
  if (status === 429) return "too many requests (429)";
  if (status === 403) return "the site blocked it (403)";
  if (status === 404) return "chapter not found (404)";
  if (status >= 500) return `the site had a problem (${status})`;
  if (status) return `the site said ${status}`;
  if (/timed out|timeout|cancel/i.test(text)) return "the site is too slow to answer";
  if (/error sending request|network|connect/i.test(text)) return "couldn't reach the site";
  return text;
}
