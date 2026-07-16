// lib/fuzzySearch.ts
// Order-preserving subsequence match, case/diacritic-insensitive, spaces ignored
// on the query side so "d t12" can match "Điện trở 120".

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .toLowerCase();
}

/** Returns true if every char of query appears in target, in order (spaces in query ignored). */
export function fuzzyMatch(query: string, target: string): boolean {
  const q = normalize(query).replace(/\s+/g, "");
  if (!q) return true;
  const t = normalize(target);
  let ti = 0;
  for (let qi = 0; qi < q.length; qi++) {
    const ch = q[qi];
    let found = false;
    while (ti < t.length) {
      if (t[ti] === ch) {
        found = true;
        ti++;
        break;
      }
      ti++;
    }
    if (!found) return false;
  }
  return true;
}

export interface Searchable {
  id: string;
  name: string;
}

export function fuzzySearchList<T extends Searchable>(query: string, items: T[]): T[] {
  return items.filter((i) => fuzzyMatch(query, i.name));
}
