export interface ParticipantData {
  id: string;
  name: string;
  company: string;
  offers: string[];
  needs: string[];
}

export function calculateAffinity(a: ParticipantData, b: ParticipantData): number {
  const aOffersToB = (a?.offers ?? []).filter((o: string) => (b?.needs ?? []).includes(o)).length;
  const bOffersToA = (b?.offers ?? []).filter((o: string) => (a?.needs ?? []).includes(o)).length;
  return aOffersToB + bOffersToA;
}

export function calculateAffinityPercentage(a: ParticipantData, b: ParticipantData): number {
  const score = calculateAffinity(a, b);
  const maxScore = 6;
  return Math.round((score / maxScore) * 100);
}

export function formTables(
  participants: ParticipantData[],
  minSize = 6,
  maxSize = 10
): { tableNumber: number; members: string[]; affinityScore: number }[] {
  const n = participants?.length ?? 0;
  if (n === 0) return [];

  // If fewer than minSize, put everyone in one table
  if (n <= maxSize) {
    const members = participants.map((p: ParticipantData) => p.id);
    let totalScore = 0;
    let pairs = 0;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        totalScore += calculateAffinity(participants[i], participants[j]);
        pairs++;
      }
    }
    const avg = pairs > 0 ? totalScore / pairs : 0;
    return [{ tableNumber: 1, members, affinityScore: Math.round((avg / 6) * 100) }];
  }

  // Calculate optimal table count targeting ~8 per table
  let numTables = Math.max(1, Math.round(n / 8));
  while (numTables > 1 && Math.ceil(n / numTables) < minSize) numTables--;
  while (Math.floor(n / numTables) > maxSize) numTables++;

  // Pre-compute pairwise scores
  const scores = new Map<string, number>();
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const key = `${participants[i].id}|${participants[j].id}`;
      scores.set(key, calculateAffinity(participants[i], participants[j]));
    }
  }

  function getScore(id1: string, id2: string): number {
    return scores.get(`${id1}|${id2}`) ?? scores.get(`${id2}|${id1}`) ?? 0;
  }

  // Calculate connectivity for each participant
  const connectivity = participants.map((p: ParticipantData) => {
    let total = 0;
    for (const other of participants) {
      if (other.id !== p.id) total += getScore(p.id, other.id);
    }
    return { id: p.id, total };
  }).sort((a: any, b: any) => b.total - a.total);

  // Greedy assignment
  const tables: string[][] = Array.from({ length: numTables }, () => []);
  const assigned = new Set<string>();

  // Seed each table with a high-connectivity participant
  for (let t = 0; t < numTables && t < connectivity.length; t++) {
    tables[t].push(connectivity[t].id);
    assigned.add(connectivity[t].id);
  }

  // Assign remaining
  const remaining = connectivity.filter((c: any) => !assigned.has(c.id));
  for (const { id } of remaining) {
    let bestTable = 0;
    let bestScore = -1;
    for (let t = 0; t < numTables; t++) {
      if (tables[t].length >= maxSize) continue;
      let tableScore = 0;
      for (const memberId of tables[t]) {
        tableScore += getScore(id, memberId);
      }
      const sizeBonus = (maxSize - tables[t].length) * 0.1;
      const adjusted = tableScore + sizeBonus;
      if (adjusted > bestScore) {
        bestScore = adjusted;
        bestTable = t;
      }
    }
    tables[bestTable].push(id);
  }

  // Calculate affinity scores
  return tables
    .filter((members: string[]) => members.length > 0)
    .map((members: string[], idx: number) => {
      let totalPairScore = 0;
      let pairCount = 0;
      for (let i = 0; i < members.length; i++) {
        for (let j = i + 1; j < members.length; j++) {
          totalPairScore += getScore(members[i], members[j]);
          pairCount++;
        }
      }
      const avg = pairCount > 0 ? totalPairScore / pairCount : 0;
      return {
        tableNumber: idx + 1,
        members,
        affinityScore: Math.round((avg / 6) * 100),
      };
    });
}
