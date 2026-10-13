'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export function EsperaClient() {
  const router = useRouter();
  const [count, setCount] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [question, setQuestion] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem('sessionToken');
    if (!token) { router.replace('/'); return; }
  }, [router]);

  const poll = useCallback(async () => {
    try {
      const token = localStorage.getItem('sessionToken');
      if (!token) return;
      const res = await fetch(`/api/events/status?token=${encodeURIComponent(token)}`);
      if (!res.ok) return;
      const data = await res.json();
      setCount(data?.participantCount ?? 0);
      if (data?.status === 'done' && data?.hasTable) {
        router.push('/mesa');
      }
    } catch { /* silent */ }
  }, [router]);

  useEffect(() => {
    if (!mounted) return;
    poll();
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [mounted, poll]);

  async function handleSendQuestion(e: React.FormEvent) {
    e.preventDefault();
    const text = question.trim();
    if (!text || sending) return;
    const token = localStorage.getItem('sessionToken');
    if (!token) { router.replace('/'); return; }
    setSending(true);
    try {
      const res = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionToken: token, text }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(d?.error ?? 'Erro ao enviar a pergunta.');
      } else {
        setQuestion('');
        setSent(true);
      }
    } catch {
      toast.error('Erro de conexão.');
    }
    setSending(false);
  }

  return (
    <div className="flex flex-col items-center mt-20">
      {/* Spinner */}
      <div className="relative w-24 h-24 mb-10">
        <svg className="w-full h-full animate-spin-slow" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" stroke="#A88F65" strokeWidth="8" fill="none" />
          <circle
            cx="50" cy="50" r="42"
            stroke="#1B3A38" strokeWidth="8" fill="none"
            strokeDasharray="80 184"
            strokeLinecap="round"
          />
        </svg>
      </div>

      <h2 className="font-serif text-3xl sm:text-4xl font-bold text-foreground text-center">
        Suas respostas foram registradas
      </h2>
      <p className="text-muted-foreground text-center mt-3 text-base leading-relaxed">
        Aguarde: o organizador está formando as mesas.<br />
        Esta tela atualiza sozinha.
      </p>

      {/* Card de participantes */}
      <div className="mt-10 w-full bg-card rounded-xl p-6 shadow-sm border border-border">
        <p className="text-sm text-muted-foreground">Participantes confirmados</p>
        <p className="font-serif text-4xl font-bold text-foreground mt-1">{count}</p>
        <div className="mt-3 w-full bg-cream-dark rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-wine rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, (count / Math.max(count + 10, 50)) * 100)}%` }}
          />
        </div>
      </div>

      {/* Pergunta anônima */}
      <form onSubmit={handleSendQuestion} className="mt-10 w-full text-left">
        <div className="w-10 h-[3px] bg-amber rounded-full mb-4" />
        <h3 className="font-serif text-2xl font-bold text-foreground leading-snug">
          Enquanto você espera, queremos saber: qual pergunta você gostaria de fazer no dia de hoje que resolveria a dor do seu negócio?
        </h3>
        <textarea
          value={question}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => { setQuestion(e.target.value); if (sent) setSent(false); }}
          placeholder="Digite aqui sua resposta..."
          rows={4}
          maxLength={500}
          className="w-full mt-5 px-4 py-3 rounded-lg bg-card border border-border text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-wine focus:outline-none text-base resize-none"
        />
        <button
          type="submit"
          disabled={sending || !question.trim()}
          className="w-full mt-3 py-3 rounded-lg bg-wine text-white font-semibold hover:bg-wine-dark transition-colors disabled:opacity-60"
        >
          {sending ? 'Enviando...' : 'Enviar'}
        </button>
        {sent && (
          <p className="text-sm text-wine font-medium mt-3 text-center">Pergunta enviada. Obrigado!</p>
        )}
        <p className="text-xs text-muted-foreground mt-3 text-center italic">Todas as respostas são anônimas</p>
      </form>

      <p className="text-sm text-muted-foreground mt-8 italic">Não feche esta página.</p>
    </div>
  );
}
