'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export function EntryForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !company.trim()) {
      toast.error('Preencha seu nome e empresa.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/participants/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), company: company.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error ?? 'Erro ao registrar.');
        setLoading(false);
        return;
      }
      localStorage.setItem('sessionToken', data.sessionToken);
      localStorage.setItem('participantName', name.trim());
      router.push('/formulario');
    } catch {
      toast.error('Erro de conexão. Tente novamente.');
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-10 space-y-6">
      <div>
        <label className="block text-xs font-semibold tracking-[0.15em] uppercase text-foreground mb-2">
          Seu nome
        </label>
        <input
          type="text"
          value={name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
          placeholder="Ludmila Gomes"
          className="w-full px-4 py-4 rounded-lg bg-card border border-border text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-wine focus:outline-none text-base"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold tracking-[0.15em] uppercase text-foreground mb-2">
          Empresa
        </label>
        <input
          type="text"
          value={company}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCompany(e.target.value)}
          placeholder="Ex.: Papo Jurídico"
          className="w-full px-4 py-4 rounded-lg bg-card border border-border text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-wine focus:outline-none text-base"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full py-4 rounded-lg bg-wine text-white font-serif text-lg font-semibold hover:bg-wine-dark transition-colors disabled:opacity-60"
      >
        {loading ? 'Entrando...' : 'Começar'}
      </button>
      <p className="text-center text-sm text-muted-foreground italic">
        Sem cadastro. Sem senha. Só um link.
      </p>
    </form>
  );
}
