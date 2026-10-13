export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const MAX_LENGTH = 500;

// Participants send an anonymous question from the waiting screen.
// The session token is only used to confirm the sender is a registered
// participant and to find their event; it is NOT stored with the question.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { sessionToken, text } = body ?? {};
    if (!sessionToken) {
      return NextResponse.json({ error: 'Token inválido.' }, { status: 400 });
    }
    const clean = typeof text === 'string' ? text.trim() : '';
    if (!clean) {
      return NextResponse.json({ error: 'Digite sua pergunta.' }, { status: 400 });
    }
    if (clean.length > MAX_LENGTH) {
      return NextResponse.json({ error: `Máximo de ${MAX_LENGTH} caracteres.` }, { status: 400 });
    }

    const participant = await prisma.participant.findUnique({ where: { sessionToken } });
    if (!participant) {
      return NextResponse.json({ error: 'Participante não encontrado.' }, { status: 404 });
    }

    await prisma.question.create({
      data: { eventId: participant.eventId, text: clean },
    });
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error: any) {
    console.error('Question error:', error);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
