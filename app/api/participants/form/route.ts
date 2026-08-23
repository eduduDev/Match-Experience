export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { sessionToken, offers, needs, complement } = body ?? {};
    if (!sessionToken) {
      return NextResponse.json({ error: 'Token inválido.' }, { status: 400 });
    }
    if (!offers?.length || !needs?.length) {
      return NextResponse.json({ error: 'Selecione ao menos 1 categoria em cada seção.' }, { status: 400 });
    }
    const participant = await prisma.participant.findUnique({ where: { sessionToken } });
    if (!participant) {
      return NextResponse.json({ error: 'Participante não encontrado.' }, { status: 404 });
    }
    await prisma.participant.update({
      where: { sessionToken },
      data: {
        offers: offers.slice(0, 3),
        needs: needs.slice(0, 3),
        complement: complement || null,
      },
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Form error:', error);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
