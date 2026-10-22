export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

// People who registered (name + company) but did not finish the form. They get no table, so the
// organizer needs to see who they are in order to help them before forming the tables.
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

    const event = await prisma.event.findFirst({
      where: { status: { not: 'archived' } },
      orderBy: { createdAt: 'desc' },
    });
    if (!event) return NextResponse.json({ participants: [] });

    const participants = await prisma.participant.findMany({
      where: {
        eventId: event.id,
        OR: [{ offers: { isEmpty: true } }, { needs: { isEmpty: true } }],
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true, name: true, company: true, createdAt: true },
    });
    return NextResponse.json({ participants });
  } catch (error: any) {
    console.error('Incomplete error:', error);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
