'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BestMatchesSheet } from './best-matches-sheet';

interface TableMember {
  id: string;
  name: string;
  company: string;
  offers: string[];
  needs: string[];
  affinity: number;
}

interface MesaData {
  tableNumber: number;
  participantCount: number;
  affinityLabel: string;
  members: TableMember[];
  bestMatches: (TableMember & { reasons: { text: string; type: 'their-offer' | 'my-offer' }[] })[];
}

export function MesaClient() {
  const router = useRouter();
  const [data, setData] = useState<MesaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('sessionToken');
    if (!token) { router.replace('/'); return; }
    fetch(`/api/mesa?token=${encodeURIComponent(token)}`)
      .then((r: Response) => r.json())
      .then((d: any) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [router]);

  if (loading) {
    return <div className="flex justify-center mt-20"><p className="text-muted-foreground">Carregando...</p></div>;
  }

  if (!data || (data as any)?.error) {
    return <div className="flex justify-center mt-20"><p className="text-muted-foreground">Mesa ainda não disponível.</p></div>;
  }

  function getInitials(name: string): string {
    const parts = (name ?? '').split(' ').filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return (parts[0]?.[0] ?? '').toUpperCase();
    return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase();
  }

  const tableNumStr = String(data?.tableNumber ?? 0).padStart(2, '0');

  return (
    <div className="mt-8">
      {/* Mesa header */}
      <div className="text-center">
        <p className="text-xs font-semibold tracking-[0.2em] uppercase text-muted-foreground">
          Você é da mesa
        </p>
        <p className="font-serif text-7xl sm:text-8xl font-bold mt-2">
          <span className="text-wine">{tableNumStr[0]}</span>
          <span className="text-foreground">{tableNumStr[1]}</span>
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          {data?.participantCount ?? 0} participantes • afinidade {data?.affinityLabel ?? 'alta'}
        </p>
      </div>

      {/* Members list */}
      <div className="mt-8">
        <p className="text-xs font-semibold tracking-[0.15em] uppercase text-foreground mb-4">
          Quem está com você
        </p>
        <div className="space-y-3">
          {(data?.members ?? []).map((member: TableMember, idx: number) => (
            <div key={member?.id ?? `member-${idx}`} className="bg-card rounded-xl p-4 shadow-sm border border-border flex items-start gap-3">
              <div className="w-11 h-11 rounded-full bg-cream-dark flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-semibold text-brown">{getInitials(member?.name ?? '')}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-foreground text-sm">{member?.name ?? ''}</p>
                    <p className="text-xs text-muted-foreground">{member?.company ?? ''}</p>
                  </div>
                  <span className="font-serif text-2xl font-bold text-wine ml-2">{member?.affinity ?? 0}%</span>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {(member?.offers ?? []).map((o: string) => (
                    <span key={`o-${o}`} className="text-xs px-2 py-1 rounded-full bg-cream-dark text-brown-dark">
                      Oferece {o}
                    </span>
                  ))}
                  {(member?.needs ?? []).map((n: string) => (
                    <span key={`n-${n}`} className="text-xs px-2 py-1 rounded-full bg-cream-dark text-brown-dark">
                      Precisa {n}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Button */}
      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        className="w-full mt-8 py-4 rounded-lg bg-wine text-white font-serif text-lg font-semibold hover:bg-wine-dark transition-colors"
      >
        Ver minhas conexões
      </button>

      {/* Bottom sheet */}
      <BestMatchesSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        matches={data?.bestMatches ?? []}
      />
    </div>
  );
}
