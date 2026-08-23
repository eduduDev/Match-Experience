export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

    const event = await prisma.event.findFirst({
      where: { status: { not: 'archived' } },
      orderBy: { createdAt: 'desc' },
    });
    if (!event) return NextResponse.json({ error: 'Nenhum evento encontrado.' }, { status: 404 });

    await prisma.participant.updateMany({
      where: { eventId: event.id },
      data: { tableId: null },
    });
    await prisma.table.deleteMany({ where: { eventId: event.id } });
    await prisma.participant.deleteMany({ where: { eventId: event.id } });
    await prisma.event.update({
      where: { id: event.id },
      data: { status: 'waiting' },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Reset error:', error);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
