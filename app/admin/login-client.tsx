'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export function AdminLoginClient() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) { toast.error('Preencha email e senha.'); return; }
    setLoading(true);
    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });
    if (result?.error) {
      toast.error('Credenciais inválidas.');
      setLoading(false);
      return;
    }
    router.replace('/admin/dashboard');
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-semibold tracking-[0.15em] uppercase text-foreground mb-2">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
          className="w-full px-4 py-3 rounded-lg bg-card border border-border text-foreground focus:ring-2 focus:ring-wine focus:outline-none"
          placeholder="admin@exemplo.com"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold tracking-[0.15em] uppercase text-foreground mb-2">Senha</label>
        <input
          type="password"
          value={password}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
          className="w-full px-4 py-3 rounded-lg bg-card border border-border text-foreground focus:ring-2 focus:ring-wine focus:outline-none"
          placeholder="••••••••"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 rounded-lg bg-wine text-white font-semibold hover:bg-wine-dark transition-colors disabled:opacity-60"
      >
        {loading ? 'Entrando...' : 'Entrar'}
      </button>
    </form>
  );
}
