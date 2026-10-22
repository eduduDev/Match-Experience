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

const uniqueNormalized = (list: string[] | undefined): string[] =>
  Array.from(new Set((list ?? []).map(normalizeCategory)));

// How well two people fit: the average of how much of each one's needs the other
// covers. Each person counts the same no matter how many categories they chose,
// and both get the same number. 100% = each offers everything the other needs.
// (If only one of them has needs, that person's share is the match.)
export function matchFraction(satisfiedA: number, needsA: number, satisfiedB: number, needsB: number): number {
  const shares: number[] = [];
  if (needsA > 0) shares.push(satisfiedA / needsA);
  if (needsB > 0) shares.push(satisfiedB / needsB);
  return shares.length > 0 ? shares.reduce((a: number, b: number) => a + b, 0) / shares.length : 0;
}

// What `other` means for `me`:
//   covers  = how many of MY needs `other` offers
//   gives   = how many of THEIR needs I offer
//   percent = match between the two of us: the average of (covers / my needs)
//             and (gives / their needs)
export function pairInsight(
  me: ParticipantData,
  other: ParticipantData,
): { covers: number; gives: number; percent: number } {
  const myNeeds = uniqueNormalized(me?.needs);
  const theirNeeds = uniqueNormalized(other?.needs);
  const otherOffers = new Set(uniqueNormalized(other?.offers));
  const myOffers = new Set(uniqueNormalized(me?.offers));
  const covers = myNeeds.filter((c: string) => otherOffers.has(c)).length;
  const gives = theirNeeds.filter((c: string) => myOffers.has(c)).length;
  const percent = Math.round(matchFraction(covers, myNeeds.length, gives, theirNeeds.length) * 100);
  return { covers, gives, percent };
}

export function calculateAffinityPercentage(a: ParticipantData, b: ParticipantData): number {
  return pairInsight(a, b).percent;
}

// How many of `me`'s needs are offered by at least one of the people at their table.
export function needsCoverage(me: ParticipantData, mates: ParticipantData[]): { covered: number; total: number } {
  const needs = uniqueNormalized(me?.needs);
  const offered = new Set<string>();
  for (const m of mates ?? []) for (const c of uniqueNormalized(m?.offers)) offered.add(c);
  return { covered: needs.filter((c: string) => offered.has(c)).length, total: needs.length };
}

// "alta" when the table covers all of the person's needs, "média" when at least half, else "baixa".
export function affinityLabelFromCoverage(covered: number, total: number): 'alta' | 'média' | 'baixa' {
  if (total <= 0) return 'baixa';
  const ratio = covered / total;
  return ratio >= 1 ? 'alta' : ratio >= 0.5 ? 'média' : 'baixa';
}

export const MAX_TABLE_SIZE = 6;

// How many extra random starting points the optimizer tries (deterministic).
const SEARCH_RESTARTS = 12;

// PRIORITY: every (person, need) pair where someone at the table offers that
// category counts this much. It is large enough to always win over the
// secondary "overall usefulness" score below, so the optimizer first makes sure
// that whoever needs X is seated with someone who offers X whenever possible.
const NEED_COVERAGE_WEIGHT = 300;

// SECONDARY: each participant's satisfaction is value(affinity with their table
// mates). The exponent below 1 makes it concave: giving someone their first
// useful match is worth more than a fifth one for someone already well served.
const SATISFACTION_EXPONENT = 0.5;

// A pair's match (0-1) is multiplied by this so it weighs like a raw count of
// matching categories in the table score.
const MATCH_SCALE = 6;

// Above 1, strong matches count disproportionately more than weak ones (a 100%
// pair is worth more than two 50% pairs), so people are seated with their best
// matches rather than with many lukewarm ones. A 50% pair is worth the same.
const MATCH_POWER = 2;

// How much the total exchange between table mates counts (per ordered pair
// value), so the optimizer keeps looking for better matches even when
// everyone's needs are already covered.
const EXCHANGE_WEIGHT = 1;

// Penalty for each ordered pair of table mates with nothing in common in either
// direction (a 0% match). Kept high so the optimizer avoids them as much as it
// can, while still preferring strong matches over the sheer absence of 0%.
const UNRELATED_PENALTY = 8;

// Simulated-annealing refinement: steps per participant (capped) and the
// temperature range, in score units. Cooling from a few points down to almost
// nothing; a swap that gives up a covered need (worth far more) is never accepted.
const ANNEAL_STEPS_PER_PERSON = 3000;
const ANNEAL_MAX_STEPS = 200000;
const ANNEAL_START_TEMP = 12;
const ANNEAL_END_TEMP = 0.3;

export interface FormTablesOptions {
  annealSteps?: number;
  satisfactionExponent?: number;
  restarts?: number;
  needCoverageWeight?: number;
  matchPower?: number;
  exchangeWeight?: number;
  unrelatedPenalty?: number;
}

/**
 * Groups participants into tables of at most `maxSize` people. Priority order:
 *   1. whoever needs a category should share a table with someone who offers it
 *      (for as many of their needs as possible);
 *   2. people at a table should be as useful to each other as possible
 *      (best possible match between table mates, fairly spread across everyone).
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

  const matchPower = options.matchPower ?? MATCH_POWER;
  const exchangeWeight = options.exchangeWeight ?? EXCHANGE_WEIGHT;
  const unrelatedPenalty = options.unrelatedPenalty ?? UNRELATED_PENALTY;

  // Pairwise affinity matrix (by index).
  const s: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  const pairValue: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  const matchPct: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      let iGivesJ = 0;
      let jGivesI = 0;
      for (const c of needLists[j]) if (offerSets[i].has(c)) iGivesJ++;
      for (const c of needLists[i]) if (offerSets[j].has(c)) jGivesI++;
      const v = iGivesJ + jGivesI;
      s[i][j] = v;
      s[j][i] = v;
      // Match of the pair (same number the participants see), scaled to the
      // size of a typical raw count.
      const frac = matchFraction(iGivesJ, needLists[j].length, jGivesI, needLists[i].length);
      const w = (MATCH_SCALE * Math.pow(frac, matchPower)) / Math.pow(0.5, matchPower - 1);
      pairValue[i][j] = w;
      pairValue[j][i] = w;
      matchPct[i][j] = frac;
      matchPct[j][i] = matchPct[i][j];
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
            totalPairScore += matchPct[members[i]][members[j]];
            pairCount++;
          }
        }
        const avg = pairCount > 0 ? totalPairScore / pairCount : 0;
        return {
          tableNumber: idx + 1,
          members: members.map((m: number) => participants[m].id),
          // average match between the people at the table, 0-100
          affinityScore: Math.round(avg * 100),
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

  // Score of one table: (needs covered by a table mate) * weight
  // + per-person satisfaction + total exchange between the table mates.
  function tableScore(members: number[]): number {
    let covered = 0;
    let satisfaction = 0;
    let exchange = 0;
    let unrelated = 0;
    for (const i of members) {
      let sum = 0;
      for (const j of members) {
        if (j !== i) {
          sum += pairValue[i][j];
          exchange += pairValue[i][j];
          if (s[i][j] === 0) unrelated++;
        }
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
    return coverageWeight * covered + satisfaction + exchangeWeight * exchange - unrelatedPenalty * unrelated;
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

  // --- Refinement: simulated annealing over the same kind of swaps. Early on it
  // accepts a slightly worse swap (less and less as it cools), which gets it out
  // of arrangements that plain swapping cannot improve. Deterministic.
  const annealSteps = options.annealSteps ?? Math.min(ANNEAL_STEPS_PER_PERSON * n, ANNEAL_MAX_STEPS);
  if (best && annealSteps > 0 && numTables > 1) {
    const cur: number[][] = best.map((t: number[]) => [...t]);
    const curScores = cur.map((t: number[]) => tableScore(t));
    let curTotal = curScores.reduce((a: number, b: number) => a + b, 0);
    let bestTotal = curTotal;
    let bestState: number[][] = cur.map((t: number[]) => [...t]);
    for (let step = 0; step < annealSteps; step++) {
      const temp = ANNEAL_START_TEMP * Math.pow(ANNEAL_END_TEMP / ANNEAL_START_TEMP, step / annealSteps);
      const ta = Math.floor(rand() * numTables);
      let tb = Math.floor(rand() * (numTables - 1));
      if (tb >= ta) tb++;
      const A = cur[ta];
      const B = cur[tb];
      const ia = Math.floor(rand() * A.length);
      const ib = Math.floor(rand() * B.length);
      const x = A[ia];
      const y = B[ib];
      A[ia] = y;
      B[ib] = x;
      const newA = tableScore(A);
      const newB = tableScore(B);
      const delta = newA + newB - curScores[ta] - curScores[tb];
      if (delta >= 0 || rand() < Math.exp(delta / temp)) {
        curScores[ta] = newA;
        curScores[tb] = newB;
        curTotal += delta;
        if (curTotal > bestTotal + 1e-9) {
          bestTotal = curTotal;
          bestState = cur.map((t: number[]) => [...t]);
        }
      } else {
        A[ia] = x;
        B[ib] = y;
      }
    }
    // Finish with a plain swap pass from the best arrangement found.
    improve(bestState);
    best = bestState;
  }

  return toResult(best ?? greedy(connectivity));
}
