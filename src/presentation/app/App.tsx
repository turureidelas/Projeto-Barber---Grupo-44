import { Scissors } from 'lucide-react';
import { ptBR } from '../i18n/pt-BR';

export function App() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <Scissors aria-hidden="true" className="size-12 text-accent" />
      <h1 className="text-4xl font-bold tracking-tight">{ptBR.app.name}</h1>
      <p className="text-lg text-stone-300">{ptBR.app.tagline}</p>
      <p className="max-w-sm text-sm text-stone-400">{ptBR.app.underConstruction}</p>
    </main>
  );
}
