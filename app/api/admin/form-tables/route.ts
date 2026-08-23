export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { formTables, type ParticipantData } from '@/lib/matching';

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

    const event = await prisma.event.findFirst({
      where: { status: { not: 'archived' } },
      orderBy: { createdAt: 'desc' },
    });
    if (!event) return NextResponse.json({ error: 'Nenhum evento ativo.' }, { status: 404 });

    // Get participants who have filled the form
    const participants = await prisma.participant.findMany({
      where: { eventId: event.id, offers: { isEmpty: false } },
    });

    if (participants.length < 2) {
      return NextResponse.json({ error: 'Participantes insuficientes (mínimo 2).' }, { status: 400 });
    }

    // Delete existing tables for this event
    await prisma.participant.updateMany({
      where: { eventId: event.id },
      data: { tableId: null },
    });
    await prisma.table.deleteMany({ where: { eventId: event.id } });

    // Run matching algorithm
    const pData: ParticipantData[] = participants.map((p: any) => ({
      id: p.id, name: p.name, company: p.company,
      offers: p.offers ?? [], needs: p.needs ?? [],
    }));

    const minSize = Math.min(6, participants.length);
    const result = formTables(pData, minSize, 10);

    // Create tables and assign participants
    for (const group of result) {
      const table = await prisma.table.create({
        data: {
          eventId: event.id,
          tableNumber: group.tableNumber,
          affinityScore: group.affinityScore,
        },
      });
      await prisma.participant.updateMany({
        where: { id: { in: group.members } },
        data: { tableId: table.id },
      });
    }

    // Update event status
    await prisma.event.update({
      where: { id: event.id },
      data: { status: 'done' },
    });

    return NextResponse.json({ success: true, tablesCreated: result.length });
  } catch (error: any) {
    console.error('Form tables error:', error);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
