import { Logo } from '@/components/logo';
import { EsperaClient } from './espera-client';

export default function EsperaPage() {
  return (
    <main className="min-h-screen bg-background flex flex-col items-center px-6 py-10">
      <div className="w-full max-w-md">
        <Logo />
        <EsperaClient />
      </div>
    </main>
  );
}
