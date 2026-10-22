export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  affinityLabelFromCoverage,
  calculateAffinity,
  needsCoverage,
  normalizeCategory,
  pairInsight,
  type ParticipantData,
} from '@/lib/matching';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    if (!token) return NextResponse.json({ error: 'Token obrigatório.' }, { status: 400 });

    const me = await prisma.participant.findUnique({ where: { sessionToken: token } });
    if (!me || !me.tableId) {
      return NextResponse.json({ error: 'Mesa não encontrada.' }, { status: 404 });
    }

    const table = await prisma.table.findUnique({
      where: { id: me.tableId },
      include: { participants: true },
    });
    if (!table) return NextResponse.json({ error: 'Mesa não encontrada.' }, { status: 404 });

    const meData: ParticipantData = {
      id: me.id, name: me.name, company: me.company,
      offers: me.offers ?? [], needs: me.needs ?? [],
    };

    const otherMembers = (table?.participants ?? []).filter((p: any) => p.id !== me.id);

    // Raw number of matching categories, used only to break ties between equal percentages.
    const rawMatches = new Map<string, number>();
    const members = otherMembers.map((p: any) => {
      const pData: ParticipantData = {
        id: p.id, name: p.name, company: p.company,
        offers: p.offers ?? [], needs: p.needs ?? [],
      };
      rawMatches.set(p.id, calculateAffinity(meData, pData));
      const insight = pairInsight(meData, pData);
      return {
        id: p.id, name: p.name, company: p.company,
        offers: p.offers ?? [], needs: p.needs ?? [],
        // Only people at the same table are returned here, so the optional
        // "Complemento" is visible to table mates (and the organizer), nobody else.
        complement: p.complement ?? '',
        // Match between the two of us, both directions: (their offers that I need +
        // my offers that they need) / (my needs + their needs). 100% = a perfect fit.
        affinity: insight.percent,
        coversNeeds: insight.covers, // how many of my needs they offer
        givesNeeds: insight.gives, // how many of THEIR needs I offer
      };
    }).sort((a: any, b: any) =>
      // Best match between the two of us first (both directions counted), then
      // the raw number of matching categories.
      (b.affinity - a.affinity) ||
      ((rawMatches.get(b.id) ?? 0) - (rawMatches.get(a.id) ?? 0)));

    // How well this table serves THIS person: how many of their needs someone at the
    // table offers. (A fixed pair-percentage threshold labelled almost every table "baixa".)
    const { covered: needsCovered, total: needsTotal } = needsCoverage(
      meData,
      otherMembers.map((p: any) => ({ id: p.id, name: p.name, company: p.company, offers: p.offers ?? [], needs: p.needs ?? [] })),
    );
    const affinityLabel = affinityLabelFromCoverage(needsCovered, needsTotal);

    // All connections at the table, with reasons, sorted by affinity
    const bestMatches = members.map((m: any) => {
      const reasons: { text: string; type: 'their-offer' | 'my-offer' }[] = [];
      const mOffers: string[] = m?.offers ?? [];
      const mNeeds: string[] = m?.needs ?? [];
      const myNeeds = new Set((meData?.needs ?? []).map(normalizeCategory));
      const myOffers: string[] = meData?.offers ?? [];
      const theirNeeds = new Set(mNeeds.map(normalizeCategory));

      // What they offer that I need
      for (const cat of mOffers) {
        if (myNeeds.has(normalizeCategory(cat))) {
          reasons.push({ text: `Oferece ${cat} \u2192 voc\u00ea precisa`, type: 'their-offer' });
        }
      }
      // What I offer that they need
      for (const cat of myOffers) {
        if (theirNeeds.has(normalizeCategory(cat))) {
          reasons.push({ text: `Voc\u00ea oferece ${cat} \u2192 precisa`, type: 'my-offer' });
        }
      }

      return { ...m, reasons };
    });

    return NextResponse.json({
      tableNumber: table.tableNumber,
      participantCount: table?.participants?.length ?? 0,
      affinityLabel,
      needsCovered,
      needsTotal,
      members,
      bestMatches,
    });
  } catch (error: any) {
    console.error('Mesa error:', error);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
