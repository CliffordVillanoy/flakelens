import { useEffect } from 'react';
import { Header, type DataMode } from './components/Header';
import { t } from './copy';
import { useStore } from './data/store';
import { useRoute } from './lib/router';

const HEADER_MODE = { empty: 'none', sample: 'sample', user: 'own' } as const satisfies Record<string, DataMode>;

// Shell only: screens arrive in DEV-13 to DEV-17.
export function App() {
  const route = useRoute();
  const mode = useStore((s) => s.mode);
  const restore = useStore((s) => s.restore);
  useEffect(() => void restore(), [restore]);
  return (
    <div className="flex min-h-screen flex-col">
      <Header mode={HEADER_MODE[mode]} />
      <main className="flex-1">
        <h1 className="sr-only">
          {t(route.name === 'start' ? 'start.title' : route.name === 'data' ? 'data.title' : 'tests.h1')}
        </h1>
      </main>
    </div>
  );
}
