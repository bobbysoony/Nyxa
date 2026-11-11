import { expect, test, vi } from "vitest";
import { failReason, makePool, retryWait, withRetry } from "./pool";
import { sleep } from "./download";

test("never runs more jobs at once than it has workers", async () => {
  let running = 0;
  let most = 0;
  const done: number[] = [];
  const pool = makePool<number>(2, async (job) => {
    running++;
    most = Math.max(most, running);
    await sleep(10);
    running--;
    done.push(job);
  });

  pool.add([1, 2, 3, 4, 5]);
  await vi.waitFor(() => expect(done).toHaveLength(5));
  expect(most).toBe(2);
  expect(done.sort()).toEqual([1, 2, 3, 4, 5]);
});

test("jobs added later still get done, and a failing job doesn't stop the rest", async () => {
  const done: number[] = [];
  const pool = makePool<number>(2, async (job) => {
    await sleep(5);
    if (job === 2) throw new Error("broken chapter");
    done.push(job);
  });

  pool.add([1, 2]);
  await vi.waitFor(() => expect(done).toEqual([1]));
  pool.add([3]); // the pool was empty by now
  await vi.waitFor(() => expect(done).toEqual([1, 3]));
});

test("the wait doubles each time", () => {
  expect([1, 2, 3].map(retryWait)).toEqual([2000, 4000, 8000]);
});

test("tries again after a growing wait, then gives up", async () => {
  const waits: number[] = [];
  const pause = async (ms: number) => {
    waits.push(ms);
  };

  let calls = 0;
  const flaky = async () => {
    calls++;
    if (calls < 3) throw new Error("site busy");
    return "chapter text";
  };
  expect(await withRetry(flaky, 4, pause)).toBe("chapter text");
  expect(waits).toEqual([2000, 4000]);

  waits.length = 0;
  const broken = async () => {
    throw new Error("gone");
  };
  await expect(withRetry(broken, 4, pause)).rejects.toThrow("gone");
  expect(waits).toEqual([2000, 4000, 8000]); // 4 tries, 3 waits between them
});

test("says why a try failed", () => {
  expect(failReason(new Error("429 Too Many Requests from https://x"))).toBe("too many requests (429)");
  expect(failReason(new Error("503 Service Unavailable from https://x"))).toBe("the site had a problem (503)");
  expect(failReason(new Error("403 Forbidden from https://x"))).toBe("the site blocked it (403)");
  expect(failReason(new Error("418 I'm a teapot from https://x"))).toBe("the site said 418");
  expect(failReason(new DOMException("signal timed out", "TimeoutError"))).toBe("the site is too slow to answer");
  expect(failReason("error sending request for url (https://x)")).toBe("couldn't reach the site");
  expect(failReason(new Error("no chapter text on the page"))).toBe("no chapter text on the page");
});

test("clear() hands back the waiting jobs, and the running ones still finish", async () => {
  const done: number[] = [];
  const pool = makePool<number>(1, async (job) => {
    await sleep(10);
    done.push(job);
  
});
