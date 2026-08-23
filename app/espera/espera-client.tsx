'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export function EsperaClient() {
  const router = useRouter();
  const [count, setCount] = useState(0);
  const [mounted, setMounted] = useState(false);

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
      if (data?.status === 'done') {
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

  return (
    <div className="flex flex-col items-center mt-20">
      {/* Spinner */}
      <div className="relative w-24 h-24 mb-10">
        <svg className="w-full h-full animate-spin-slow" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" stroke="#E8DFD1" strokeWidth="8" fill="none" />
          <circle
            cx="50" cy="50" r="42"
            stroke="#8B1A2E" strokeWidth="8" fill="none"
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
      <div className="mt-10 w-full bg-white rounded-xl p-6 shadow-sm">
        <p className="text-sm text-muted-foreground">Participantes confirmados</p>
        <p className="font-serif text-4xl font-bold text-foreground mt-1">{count}</p>
        <div className="mt-3 w-full bg-cream-dark rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-wine rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, (count / Math.max(count + 10, 50)) * 100)}%` }}
          />
        </div>
      </div>

      <p className="text-sm text-muted-foreground mt-6 italic">Não feche esta página.</p>
    </div>
  );
}
