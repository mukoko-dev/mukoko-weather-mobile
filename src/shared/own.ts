/**
 * A lookup in a plain object by a key that came from the network, answering
 * only for the object's OWN keys. `table["constructor"]` is a function on every
 * plain object, so a Worker-supplied `icon`, `category` or `reportType` of
 * "constructor" would be taken for a real entry and crash the screen that
 * draws it.
 */
export function own<T>(
  table: Readonly<Record<string, T>>,
  key: string,
): T | undefined {
  return Object.prototype.hasOwnProperty.call(table, key)
    ? table[key]
    : undefined;
}
