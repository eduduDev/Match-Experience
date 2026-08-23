export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

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
        totalParticipants: 0, tablesFormed: 0, avgPerTable: 0, avgAffinity: 0, eventStatus: 'waiting',
      });
    }

    const totalParticipants = await prisma.participant.count({ where: { eventId: event.id } });
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

    return NextResponse.json({
      totalParticipants,
      tablesFormed,
      avgPerTable,
      avgAffinity,
      eventStatus: event.status,
    });
  } catch (error: any) {
    console.error('Stats error:', error);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
