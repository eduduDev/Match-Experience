import { Logo } from '@/components/logo';
import { FormularioClient } from './formulario-client';

export default function FormularioPage() {
  return (
    <main className="min-h-screen bg-background flex flex-col items-center px-6 py-10">
      <div className="w-full max-w-md">
        <Logo />
        <FormularioClient />
      </div>
    </main>
  );
}
