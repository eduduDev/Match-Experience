export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { normalizeCategory } from '@/lib/matching';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

    const event = await prisma.event.findFirst({
      where: { status: { not: 'archived' } },
      orderBy: { createdAt: 'desc' },
    });
    if (!event) {
      return NextResponse.json({
        totalParticipants: 0, incompleteParticipants: 0, tablesFormed: 0, avgPerTable: 0, avgAffinity: 0,
        needsCovered: 0, needsFeasible: 0, needsCoveragePct: null, eventStatus: 'waiting',
      });
    }

    const participants = await prisma.participant.findMany({
      where: { eventId: event.id },
      select: { id: true, tableId: true, offers: true, needs: true },
    });
    // "Participants" = people who finished the form: the same people who get a table and are
    // counted on the waiting screen. Registrations without a form are reported separately.
    const completed = participants.filter((p: any) => (p.offers?.length ?? 0) > 0 && (p.needs?.length ?? 0) > 0);
    const totalParticipants = completed.length;
    const incompleteParticipants = participants.length - completed.length;

    const tables = await prisma.table.findMany({
      where: { eventId: event.id },
      include: { _count: { select: { participants: true } } },
    });
    const tablesFormed = tables.length;
    const avgPerTable = tablesFormed > 0
      ? Math.round(tables.reduce((s: number, t: any) => s + (t?._count?.participants ?? 0), 0) / tablesFormed)
      : 0;
    const avgAffinity = tablesFormed > 0
      ? Math.round(tables.reduce((s: number, t: any) => s + (t?.affinityScore ?? 0), 0) / tablesFormed)
      : 0;

    // Needs served: for every (person, need) that someone else in the event offers, is there
    // someone at the person's own table offering it?
    const seated = completed.filter((p: any) => p.tableId);
    const eventCount = new Map<string, number>();
    const tableCount = new Map<string, Map<string, number>>();
    for (const p of seated) {
      const offered = new Set<string>((p.offers ?? []).map(normalizeCategory));
      let perTable = tableCount.get(p.tableId as string);
      if (!perTable) { perTable = new Map(); tableCount.set(p.tableId as string, perTable); }
      for (const c of offered) {
        eventCount.set(c, (eventCount.get(c) ?? 0) + 1);
        perTable.set(c, (perTable.get(c) ?? 0) + 1);
      }
    }
    let needsFeasible = 0;
    let needsCovered = 0;
    for (const p of seated) {
      const mine = new Set<string>((p.offers ?? []).map(normalizeCategory));
      const perTable = tableCount.get(p.tableId as string);
      for (const need of new Set<string>((p.needs ?? []).map(normalizeCategory))) {
        const self = mine.has(need) ? 1 : 0;
        if ((eventCount.get(need) ?? 0) - self <= 0) continue; // nobody else offers it
        needsFeasible++;
        if (((perTable?.get(need) ?? 0) - self) > 0) needsCovered++;
      }
    }
    const needsCoveragePct = needsFeasible > 0 ? Math.round((needsCovered / needsFeasible) * 100) : null;

    return NextResponse.json({
      totalParticipants,
      incompleteParticipants,
      tablesFormed,
      avgPerTable,
      avgAffinity,
      needsCovered,
      needsFeasible,
      needsCoveragePct,
      eventStatus: event.status,
    });
  } catch (error: any) {
    console.error('Stats error:', error);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
