import { Logo } from '@/components/logo';
import { AdminLoginClient } from './login-client';

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <Logo className="mb-8" />
        <h2 className="font-serif text-2xl font-bold text-foreground mb-6">Entrar como organizador</h2>
        <AdminLoginClient />
      </div>
    </main>
  );
}
