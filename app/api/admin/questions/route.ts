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
    if (!event) return NextResponse.json({ questions: [] });

    const questions = await prisma.question.findMany({
      where: { eventId: event.id },
      orderBy: { createdAt: 'desc' },
      select: { id: true, text: true, createdAt: true },
    });
    return NextResponse.json({ questions });
  } catch (error: any) {
    console.error('Questions error:', error);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
