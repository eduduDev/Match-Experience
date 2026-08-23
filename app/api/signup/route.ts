export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body ?? {};
    if (!email || !password) {
      return NextResponse.json({ error: 'Email e senha são obrigatórios.' }, { status: 400 });
    }
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'Usuário já existe.' }, { status: 409 });
    }
    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, password: hash, name: 'Admin', role: 'admin' },
    });
    return NextResponse.json({ id: user.id, email: user.email }, { status: 201 });
  } catch (error: any) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
