import { Logo } from '@/components/logo';
import { DashboardClient } from './dashboard-client';

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <Logo />
            <h2 className="font-serif text-2xl font-bold text-foreground mt-4">Painel do organizador</h2>
          </div>
        </div>
        <DashboardClient />
      </div>
    </main>
  );
}
