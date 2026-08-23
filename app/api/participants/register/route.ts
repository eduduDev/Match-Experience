export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, company } = body ?? {};
    if (!name || !company) {
      return NextResponse.json({ error: 'Nome e empresa são obrigatórios.' }, { status: 400 });
    }
    // Get the active event (most recent with status != 'archived')
    let event = await prisma.event.findFirst({
      where: { status: { not: 'archived' } },
      orderBy: { createdAt: 'desc' },
    });
    if (!event) {
      // Create a default event
      event = await prisma.event.create({
        data: { name: 'Evento Principal', slug: 'evento-principal', status: 'waiting' },
      });
    }
    const sessionToken = crypto.randomUUID();
    const participant = await prisma.participant.create({
      data: {
        eventId: event.id,
        name,
        company,
        sessionToken,
        offers: [],
        needs: [],
      },
    });
    return NextResponse.json({ sessionToken, participantId: participant.id }, { status: 201 });
  } catch (error: any) {
    console.error('Register error:', error);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
