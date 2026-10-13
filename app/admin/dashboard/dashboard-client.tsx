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

interface QuestionData {
  id: string;
  text: string;
  createdAt: string;
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
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [questionsOpen, setQuestionsOpen] = useState(false);
  const [dragItem, setDragItem] = useState<{ participantId: string; fromTableId: string } | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/admin');
  }, [status, router]);

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, tablesRes, questionsRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/tables'),
        fetch('/api/admin/questions'),
      ]);
      if (statsRes.ok) {
        const s = await statsRes.json();
        setStats(s);
      }
      if (tablesRes.ok) {
        const t = await tablesRes.json();
        setTables(t?.tables ?? []);
      }
      if (questionsRes.ok) {
        const q = await questionsRes.json();
        setQuestions(q?.questions ?? []);
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
          className="px-5 py-2 rounded-lg border border-border text-foreground font-medium hover:bg-card transition-colors text-sm"
        >
          Sair
        </button>
        <button
          type="button"
          onClick={() => setQuestionsOpen(true)}
          className="px-5 py-2 rounded-lg border border-border text-foreground font-medium hover:bg-card transition-colors text-sm"
        >
          Perguntas{questions.length > 0 ? ` (${questions.length})` : ''}
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
              className="bg-card rounded-xl p-5 shadow-sm border border-border hover:border-wine/30 transition-colors"
              onDragOver={(e: React.DragEvent) => e.preventDefault()}
              onDrop={() => handleDrop(table?.id ?? '')}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-serif text-lg font-bold text-foreground">
                  Mesa {String(table?.tableNumber ?? 0).padStart(2, '0')}
                </h3>
                <span className="text-xs px-3 py-1 rounded-full bg-[#E3EDEC] text-wine font-medium">
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
        Atualização em tempo real · mesas de até 6 participantes · ajuste fino manual disponível
      </p>

      {/* Perguntas dos participantes (popup) */}
      {questionsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brown-dark/50"
          onClick={() => setQuestionsOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Perguntas dos participantes"
            className="w-full max-w-lg max-h-[80vh] flex flex-col bg-card rounded-2xl border border-border shadow-lg"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <div className="p-6 pb-4 border-b border-border">
              <p className="text-xs font-semibold tracking-[0.2em] uppercase text-amber">Anônimas</p>
              <h3 className="font-serif text-2xl font-bold text-foreground mt-1">Perguntas dos participantes</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {questions.length === 0
                  ? 'Nenhuma pergunta enviada ainda.'
                  : `${questions.length} ${questions.length === 1 ? 'pergunta enviada' : 'perguntas enviadas'}, da mais recente para a mais antiga.`}
              </p>
            </div>
            <div className="p-6 pt-4 overflow-y-auto space-y-3">
              {questions.map((q: QuestionData) => (
                <div key={q.id} className="bg-cream-light rounded-xl p-4 border border-border">
                  <p className="text-sm text-foreground whitespace-pre-wrap break-words">{q.text}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(q.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                  </p>
                </div>
              ))}
            </div>
            <div className="p-6 pt-0">
              <button
                type="button"
                onClick={() => setQuestionsOpen(false)}
                className="w-full py-3 rounded-lg bg-card border border-border text-foreground font-semibold hover:bg-muted transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({ value, label, highlight }: { value: number | string; label: string; highlight?: boolean }) {
  return (
    <div className="bg-card rounded-xl p-5 shadow-sm border border-border">
      <p className={`font-serif text-4xl font-bold ${highlight ? 'text-wine' : 'text-foreground'}`}>
        {value}
      </p>
      <p className="text-xs font-semibold tracking-[0.1em] uppercase text-muted-foreground mt-1">
        {label}
      </p>
    </div>
  );
}
