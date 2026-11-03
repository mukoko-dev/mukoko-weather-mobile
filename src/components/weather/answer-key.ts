/**
 * One key per answer object, for a section boundary's `resetKey`: a refresh
 * brings a new object, so a section that crashed on the last answer gets
 * another go, even when the Worker served the same timestamps from its cache.
 * The same object always has the same key.
 */

const keys = new WeakMap<object, string>();
let next = 0;

export function answerKey(answer: unknown): string | undefined {
  if (typeof answer !== "object" || answer === null) return undefined;
  let key = keys.get(answer);
  if (key === undefined) {
    next += 1;
    key = String(next);
    keys.set(answer, key);
  }
  return key;
}
