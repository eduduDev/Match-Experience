'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { signOut } from 'next-auth/react';

interface Stats {
  totalParticipants: number;
  tablesFormed: number;
  avgPerTable: number;
  avgAffinity: number;
  eventStatus: string;
}

interface TableData {
  id: string;
  tableNumber: number;
  affinityScore: number;
  participants: { id: string; name: string; company: string }[];
}

export function DashboardClient() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [tables, setTables] = useState<TableData[]>([]);
  const [forming, setForming] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [dragItem, setDragItem] = useState<{ participantId: string; fromTableId: string } | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/admin');
  }, [status, router]);

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, tablesRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/tables'),
      ]);
      if (statsRes.ok) {
        const s = await statsRes.json();
        setStats(s);
      }
      if (tablesRes.ok) {
        const t = await tablesRes.json();
        setTables(t?.tables ?? []);
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [status, fetchData]);

  async function handleFormTables() {
    setForming(true);
    try {
      const res = await fetch('/api/admin/form-tables', { method: 'POST' });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(d?.error ?? 'Erro ao formar mesas.');
      } else {
        toast.success('Mesas formadas com sucesso!');
        await fetchData();
      }
    } catch {
      toast.error('Erro de conexão.');
    }
    setForming(false);
  }

  async function handleReset() {
    if (!window.confirm('Isso vai apagar todos os participantes e mesas deste evento. Essa ação não pode ser desfeita. Continuar?')) return;
    setResetting(true);
    try {
      const res = await fetch('/api/admin/reset', { method: 'POST' });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(d?.error ?? 'Erro ao resetar evento.');
      } else {
        toast.success('Evento resetado!');
        await fetchData();
      }
    } catch {
      toast.error('Erro de conexão.');
    }
    setResetting(false);
  }

  async function handleDrop(targetTableId: string) {
    if (!dragItem || dragItem.fromTableId === targetTableId) {
      setDragItem(null);
      return;
    }
    try {
      const res = await fetch('/api/admin/move-participant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId: dragItem.participantId, toTableId: targetTableId }),
      });
      if (!res.ok) {
        toast.error('Erro ao mover participante.');
      } else {
        toast.success('Participante movido!');
        await fetchData();
      }
    } catch {
      toast.error('Erro de conexão.');
    }
    setDragItem(null);
  }

  if (status === 'loading') {
    return <div className="flex justify-center mt-20"><p className="text-muted-foreground">Carregando...</p></div>;
  }

  if (status !== 'authenticated') return null;

  return (
    <div className="mt-8">
      {/* Actions */}
      <div className="flex gap-3 justify-end mb-6 flex-wrap">
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: '/admin' })}
          className="px-5 py-2 rounded-lg border border-gray-300 text-foreground font-medium hover:bg-white transition-colors text-sm"
        >
          Sair
        </button>
        <button
          type="button"
          onClick={handleReset}
          disabled={resetting}
          className="px-5 py-2 rounded-lg border border-red-300 text-red-600 font-medium hover:bg-red-50 transition-colors disabled:opacity-60 text-sm"
        >
          {resetting ? 'Resetando...' : 'Resetar evento'}
        </button>
        <button
          type="button"
          onClick={handleFormTables}
          disabled={forming}
          className="px-6 py-2 rounded-lg bg-wine text-white font-semibold hover:bg-wine-dark transition-colors disabled:opacity-60 text-sm"
        >
          {forming ? 'Formando...' : 'Formar mesas'}
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard value={stats?.totalParticipants ?? 0} label="Participantes" />
        <KpiCard value={stats?.tablesFormed ?? 0} label="Mesas formadas" />
        <KpiCard value={stats?.avgPerTable ?? 0} label="Média por mesa" />
        <KpiCard value={`${stats?.avgAffinity ?? 0}%`} label="Afinidade média" highlight />
      </div>

      {/* Tables Grid */}
      {(tables?.length ?? 0) > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {tables.map((table: TableData) => (
            <div
              key={table?.id}
              className="bg-white rounded-xl p-5 shadow-sm border border-transparent hover:border-wine/20 transition-colors"
              onDragOver={(e: React.DragEvent) => e.preventDefault()}
              onDrop={() => handleDrop(table?.id ?? '')}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-serif text-lg font-bold text-foreground">
                  Mesa {String(table?.tableNumber ?? 0).padStart(2, '0')}
                </h3>
                <span className="text-xs px-3 py-1 rounded-full bg-[#FCEEF0] text-wine font-medium">
                  {table?.participants?.length ?? 0} pessoas
                </span>
              </div>
              <div className="space-y-1">
                {(table?.participants ?? []).map((p: any) => (
                  <div
                    key={p?.id}
                    draggable
                    onDragStart={() => setDragItem({ participantId: p?.id ?? '', fromTableId: table?.id ?? '' })}
                    className="text-sm text-foreground py-1 cursor-grab active:cursor-grabbing hover:text-wine transition-colors"
                  >
                    {p?.name ?? ''} · {p?.company ?? ''}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <p className="text-xs text-muted-foreground mt-8 text-center">
        Atualização em tempo real · mesas de 6 a 10 participantes · ajuste fino manual disponível
      </p>
    </div>
  );
}

function KpiCard({ value, label, highlight }: { value: number | string; label: string; highlight?: boolean }) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm">
      <p className={`font-serif text-4xl font-bold ${highlight ? 'text-wine' : 'text-foreground'}`}>
        {value}
      </p>
      <p className="text-xs font-semibold tracking-[0.1em] uppercase text-muted-foreground mt-1">
        {label}
      </p>
    </div>
  );
}
