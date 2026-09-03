'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { CATEGORIES } from '@/lib/categories';

export function FormularioClient() {
  const router = useRouter();
  const [offers, setOffers] = useState<string[]>([]);
  const [needs, setNeeds] = useState<string[]>([]);
  const [complement, setComplement] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('sessionToken');
    if (!token) router.replace('/');
  }, [router]);

  function toggleChip(list: string[], setList: (v: string[]) => void, cat: string) {
    if (list.includes(cat)) {
      setList(list.filter((c: string) => c !== cat));
    } else if (list.length < 3) {
      setList([...list, cat]);
    } else {
      toast.error('Máximo de 3 categorias.');
    }
  }

  async function handleSubmit() {
    if (offers.length === 0) { toast.error('Selecione ao menos 1 categoria que você oferece.'); return; }
    if (needs.length === 0) { toast.error('Selecione ao menos 1 categoria que você precisa.'); return; }
    setLoading(true);
    try {
      const token = localStorage.getItem('sessionToken');
      const res = await fetch('/api/participants/form', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionToken: token, offers, needs, complement: complement.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data?.error ?? 'Erro ao enviar.');
        setLoading(false);
        return;
      }
      router.push('/espera');
    } catch {
      toast.error('Erro de conexão.');
      setLoading(false);
    }
  }

  return (
    <div className="mt-8 space-y-8">
      {/* O que você oferece */}
      <section>
        <h2 className="font-serif text-3xl font-bold text-foreground">O que você oferece?</h2>
        <p className="text-sm text-muted-foreground mt-1">Selecione até 3 categorias</p>
        <div className="flex flex-wrap gap-3 mt-4">
          {CATEGORIES.map((cat: string) => {
            const selected = offers.includes(cat);
            return (
              <button
                key={`offer-${cat}`}
                type="button"
                onClick={() => toggleChip(offers, setOffers, cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  selected
                    ? 'bg-wine text-white shadow-md'
                    : 'bg-card text-foreground border border-gray-300 hover:border-wine'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </section>

      {/* O que você precisa */}
      <section>
        <h2 className="font-serif text-3xl font-bold text-foreground">O que você precisa?</h2>
        <p className="text-sm text-muted-foreground mt-1">Selecione até 3 categorias</p>
        <div className="flex flex-wrap gap-3 mt-4">
          {CATEGORIES.map((cat: string) => {
            const selected = needs.includes(cat);
            return (
              <button
                key={`need-${cat}`}
                type="button"
                onClick={() => toggleChip(needs, setNeeds, cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  selected
                    ? 'bg-brown text-white shadow-md'
                    : 'bg-card text-foreground border border-gray-300 hover:border-brown'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </section>

      {/* Complemento */}
      <section>
        <label className="block text-xs font-semibold tracking-[0.15em] uppercase text-foreground mb-2">
          Complemento (opcional)
        </label>
        <textarea
          value={complement}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setComplement(e.target.value)}
          placeholder="Conte em uma frase o seu momento..."
          rows={3}
          className="w-full px-4 py-3 rounded-lg bg-card border-0 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-wine focus:outline-none text-base resize-none"
        />
      </section>

      {/* Aviso */}
      <div className="border-l-4 border-wine bg-card rounded-r-lg p-4">
        <p className="text-sm text-muted-foreground">
          Ao prosseguir, você concorda em compartilhar seu nome e empresa com os integrantes da sua mesa.
        </p>
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={loading}
        className="w-full py-4 rounded-lg bg-wine text-white font-serif text-lg font-semibold hover:bg-wine-dark transition-colors disabled:opacity-60"
      >
        {loading ? 'Enviando...' : 'Enviar respostas'}
      </button>
    </div>
  );
}
