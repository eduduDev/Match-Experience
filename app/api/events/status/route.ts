export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    if (!token) {
      return NextResponse.json({ error: 'Token obrigatório.' }, { status: 400 });
    }
    const participant = await prisma.participant.findUnique({
      where: { sessionToken: token },
      include: { event: true },
    });
    if (!participant) {
      return NextResponse.json({ error: 'Participante não encontrado.' }, { status: 404 });
    }
    const count = await prisma.participant.count({
      where: { eventId: participant.eventId, offers: { isEmpty: false } },
    });
    return NextResponse.json({
      status: participant?.event?.status ?? 'waiting',
      participantCount: count,
      hasTable: !!participant.tableId,
    });
  } catch (error: any) {
    console.error('Status error:', error);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
