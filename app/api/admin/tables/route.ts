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
    if (!event) return NextResponse.json({ tables: [] });

    const tables = await prisma.table.findMany({
      where: { eventId: event.id },
      include: { participants: { select: { id: true, name: true, company: true } } },
      orderBy: { tableNumber: 'asc' },
    });

    return NextResponse.json({ tables });
  } catch (error: any) {
    console.error('Tables error:', error);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
