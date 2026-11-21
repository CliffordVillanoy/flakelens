import { Header, type DataMode } from './components/Header';
import { t } from './copy';
import { useRoute } from './lib/router';

// Shell only (DEV-11): screens arrive in DEV-13 to DEV-17, and the data mode comes from the store in DEV-12.
export function App() {
  const route = useRoute();
  // shortcut: no store yet, so screens with data show the sample-mode header; replace with the store's mode in DEV-12.
  const mode: DataMode = route.name === 'start' ? 'none' : 'sample';
  return (
    <div className="flex min-h-screen flex-col">
      <Header mode={mode} />
      <main className="flex-1">
        {route.name === 'start' && <h1 className="sr-only">{t('start.title')}</h1>}
        {route.name !== 'start' && <h1 className="sr-only">{t(route.name === 'data' ? 'data.title' : 'tests.h1')}</h1>}
      </main>
    </div>
  );
}
