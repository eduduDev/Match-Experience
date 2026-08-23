import { Logo } from '@/components/logo';
import { MesaClient } from './mesa-client';

export default function MesaPage() {
  return (
    <main className="min-h-screen bg-background flex flex-col items-center px-6 py-10">
      <div className="w-full max-w-md">
        <Logo />
        <MesaClient />
      </div>
    </main>
  );
}
