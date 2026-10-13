export interface ParticipantData {
  id: string;
  name: string;
  company: string;
  offers: string[];
  needs: string[];
}

// Categories are compared ignoring case, accents and surrounding spaces, so
// "Jurídico", "juridico" and " JURÍDICO " are the same category.
export function normalizeCategory(c: string): string {
  return (c ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();
}

export function calculateAffinity(a: ParticipantData, b: ParticipantData): number {
  const aOffers = new Set((a?.offers ?? []).map(normalizeCategory));
  const bOffers = new Set((b?.offers ?? []).map(normalizeCategory));
  const aOffersToB = Array.from(new Set((b?.needs ?? []).map(normalizeCategory))).filter((c: string) => aOffers.has(c)).length;
  const bOffersToA = Array.from(new Set((a?.needs ?? []).map(normalizeCategory))).filter((c: string) => bOffers.has(c)).length;
  return aOffersToB + bOffersToA;
}

export function calculateAffinityPercentage(a: ParticipantData, b: ParticipantData): number {
  const score = calculateAffinity(a, b);
  const maxScore = 6;
  return Math.round((score / maxScore) * 100);
}

export const MAX_TABLE_SIZE = 6;

// How many extra random starting points the optimizer tries (deterministic).
const SEARCH_RESTARTS = 12;

// PRIORITY: every (person, need) pair where someone at the table offers that
// category counts this much. It is large enough to always win over the
// secondary "overall usefulness" score below, so the optimizer first makes sure
// that whoever needs X is seated with someone who offers X whenever possible.
const NEED_COVERAGE_WEIGHT = 100;

// SECONDARY: each participant's satisfaction is value(affinity with their table
// mates). The exponent below 1 makes it concave: giving someone their first
// useful match is worth more than a fifth one for someone already well served.
const SATISFACTION_EXPONENT = 0.5;

export interface FormTablesOptions {
  satisfactionExponent?: number;
  restarts?: number;
  needCoverageWeight?: number;
}

/**
 * Groups participants into tables of at most `maxSize` people. Priority order:
 *   1. whoever needs a category should share a table with someone who offers it
 *      (for as many of their needs as possible);
 *   2. people at a table should be as useful to each other as possible
 *      (mutual matches, fairly spread across everyone).
 * Table sizes are balanced: they differ by at most one, so there are no stray
 * tables with a single person.
 *
 * Approach: build a few starting arrangements (greedy by connectivity plus
 * deterministic random shuffles), improve each by swapping people between
 * tables while that raises the score, and keep the best result.
 */
export function formTables(
  participants: ParticipantData[],
  maxSize = MAX_TABLE_SIZE,
  options: FormTablesOptions = {}
): { tableNumber: number; members: string[]; affinityScore: number }[] {
  const n = participants?.length ?? 0;
  if (n === 0) return [];

  // Normalized offer / need sets per participant (by index).
  const offerSets: Set<string>[] = participants.map(
    (p: ParticipantData) => new Set((p?.offers ?? []).map(normalizeCategory))
  );
  const needLists: string[][] = participants.map(
    (p: ParticipantData) => Array.from(new Set((p?.needs ?? []).map(normalizeCategory)))
  );

  // Pairwise affinity matrix (by index).
  const s: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      let v = 0;
      for (const c of needLists[j]) if (offerSets[i].has(c)) v++;
      for (const c of needLists[i]) if (offerSets[j].has(c)) v++;
      s[i][j] = v;
      s[j][i] = v;
    }
  }

  function toResult(tables: number[][]) {
    return tables
      .filter((members: number[]) => members.length > 0)
      .map((members: number[], idx: number) => {
        let totalPairScore = 0;
        let pairCount = 0;
        for (let i = 0; i < members.length; i++) {
          for (let j = i + 1; j < members.length; j++) {
            totalPairScore += s[members[i]][members[j]];
            pairCount++;
          }
        }
        const avg = pairCount > 0 ? totalPairScore / pairCount : 0;
        return {
          tableNumber: idx + 1,
          members: members.map((m: number) => participants[m].id),
          affinityScore: Math.round((avg / 6) * 100),
        };
      });
  }

  // Everyone fits in one table
  if (n <= maxSize) {
    return toResult([Array.from({ length: n }, (_: unknown, i: number) => i)]);
  }

  // Fewest tables that respect the cap, then spread people evenly across them:
  // `extra` tables get one more person than the rest.
  const numTables = Math.ceil(n / maxSize);
  const baseSize = Math.floor(n / numTables);
  const extra = n % numTables;
  const capacity = Array.from({ length: numTables }, (_: unknown, t: number) => baseSize + (t < extra ? 1 : 0));

  const exponent = options.satisfactionExponent ?? SATISFACTION_EXPONENT;
  const coverageWeight = options.needCoverageWeight ?? NEED_COVERAGE_WEIGHT;
  const value = (x: number) => Math.pow(x, exponent);

  // Score of one table: (needs covered by a table mate) * weight + satisfaction.
  function tableScore(members: number[]): number {
    let covered = 0;
    let satisfaction = 0;
    for (const i of members) {
      let sum = 0;
      for (const j of members) {
        if (j !== i) sum += s[i][j];
      }
      satisfaction += value(sum);
      for (const need of needLists[i]) {
        for (const j of members) {
          if (j !== i && offerSets[j].has(need)) {
            covered++;
            break;
          }
        }
      }
    }
    return coverageWeight * covered + satisfaction;
  }

  // Deterministic PRNG so the same input always gives the same tables.
  let seed = (12345 + n * 7919) % 4294967296;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  // --- Starting arrangement: seed one person per table, then place the rest
  // where they fit best (affinity with who is already there).
  function greedy(order: number[]): number[][] {
    const tables: number[][] = Array.from({ length: numTables }, () => []);
    for (let t = 0; t < numTables; t++) tables[t].push(order[t]);
    for (let k = numTables; k < order.length; k++) {
      const id = order[k];
      let bestTable = -1;
      let bestScore = -Infinity;
      for (let t = 0; t < numTables; t++) {
        if (tables[t].length >= capacity[t]) continue;
        let tableAffinity = 0;
        for (const m of tables[t]) tableAffinity += s[id][m];
        const adjusted = tableAffinity + (capacity[t] - tables[t].length) * 0.1;
        if (adjusted > bestScore) {
          bestScore = adjusted;
          bestTable = t;
        }
      }
      tables[bestTable].push(id);
    }
    return tables;
  }

  // --- Local search: swap two people from different tables whenever it raises
  // the combined score of those two tables. Sizes never change, so the balance
  // is preserved.
  function improve(tables: number[][]): number {
    const scores = tables.map((t: number[]) => tableScore(t));
    for (let pass = 0; pass < 200; pass++) {
      let improved = false;
      for (let ta = 0; ta < numTables; ta++) {
        for (let tb = ta + 1; tb < numTables; tb++) {
          const A = tables[ta];
          const B = tables[tb];
          for (let ia = 0; ia < A.length; ia++) {
            for (let ib = 0; ib < B.length; ib++) {
              const x = A[ia];
              const y = B[ib];
              A[ia] = y;
              B[ib] = x;
              const newA = tableScore(A);
              const newB = tableScore(B);
              if (newA + newB > scores[ta] + scores[tb] + 1e-9) {
                scores[ta] = newA;
                scores[tb] = newB;
                improved = true;
              } else {
                A[ia] = x;
                B[ib] = y;
              }
            }
          }
        }
      }
      if (!improved) break;
    }
    return scores.reduce((a: number, b: number) => a + b, 0);
  }

  // Start 0: most connected people first; the rest are deterministic shuffles
  // to escape poor local optima.
  const connectivity = Array.from({ length: n }, (_: unknown, i: number) => i)
    .map((i: number) => ({ i, total: s[i].reduce((a: number, b: number) => a + b, 0) }))
    .sort((a: { total: number }, b: { total: number }) => b.total - a.total)
    .map((c: { i: number }) => c.i);

  const restarts = options.restarts ?? SEARCH_RESTARTS;
  let best: number[][] | null = null;
  let bestValue = -Infinity;
  for (let r = 0; r <= restarts; r++) {
    let order = connectivity;
    if (r > 0) {
      order = [...connectivity];
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
      }
    }
    const tables = greedy(order);
    const v = improve(tables);
    if (v > bestValue + 1e-9) {
      bestValue = v;
      best = tables;
    }
  }

  return toResult(best ?? greedy(connectivity));
}
