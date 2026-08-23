export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

    const body = await req.json();
    const { participantId, toTableId } = body ?? {};
    if (!participantId || !toTableId) {
      return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 });
    }

    await prisma.participant.update({
      where: { id: participantId },
      data: { tableId: toTableId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Move error:', error);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
