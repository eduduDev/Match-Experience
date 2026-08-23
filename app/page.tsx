import { Logo } from '@/components/logo';
import { EntryForm } from './entry-form';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background flex flex-col items-center px-6 py-10">
      <div className="w-full max-w-md">
        <Logo />
        <div className="mt-12">
          <h2 className="font-serif text-4xl sm:text-5xl font-bold text-foreground leading-tight">
            Conexões que fazem negócio.
          </h2>
          <p className="mt-4 text-muted-foreground text-base leading-relaxed">
            Diga o que você oferece e o que precisa. Nós montamos a sua mesa com quem realmente importa.
          </p>
        </div>
        <EntryForm />
      </div>
    </main>
  );
}
