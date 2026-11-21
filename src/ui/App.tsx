import { useEffect, useRef, useState, type DragEvent } from 'react';
import { Header, type DataMode } from './components/Header';
import { filesFrom } from './components/DropZone';
import { LeaveSampleDialog } from './components/LeaveSampleDialog';
import { t } from './copy';
import { useStore } from './data/store';
import { navigate, useRoute } from './lib/router';
import { shortcutsSheet } from './lib/shortcuts';
import { Start } from './screens/Start';
import { Tests } from './screens/Tests';
import { Toasts } from './components/Toasts';

const HEADER_MODE = { empty: 'none', sample: 'sample', user: 'own' } as const satisfies Record<string, DataMode>;

export function App() {
  const route = useRoute();
  const s = useStore();
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState<File[] | null>(null);
  const picker = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void useStore.getState().restore().then(() => setReady(true));
  }, []);
  // With data loaded, Start is skipped (IA F5); without data, every route shows Start.
  useEffect(() => {
    if (ready && s.mode !== 'empty' && route.name === 'start') navigate('#/tests');
  }, [ready, s.mode, route.name]);

  const runImport = async (files: File[]) => {
    await useStore.getState().importFiles(files);
    if (useStore.getState().lastImport?.records.some((r) => r.result !== 'failed')) navigate('#/tests');
  };
  // In sample mode, confirm first: the user's files replace the sample (board 2, state D).
  const onFiles = (files: File[]) => {
    if (files.length === 0) return;
    if (useStore.getState().mode === 'sample') setPending(files);
    else void runImport(files);
  };
  const openPicker = () => picker.current?.click();
  const exitSample = async () => {
    await useStore.getState().exitSample();
    navigate(useStore.getState().mode === 'empty' ? '#/' : '#/tests');
  };
  // Dropping files anywhere on Tests also imports them.
  const dropAnywhere = {
    onDragOver: (e: DragEvent) => s.mode !== 'empty' && [...e.dataTransfer.types].includes('Files') && e.preventDefault(),
    onDrop: (e: DragEvent) => {
      if (s.mode === 'empty') return;
      e.preventDefault();
      onFiles(filesFrom(e));
    },
  };

  if (!ready) return null;
  return (
    <div className="flex min-h-screen flex-col" {...dropAnywhere}>
      <Header mode={HEADER_MODE[s.mode]} onAddFiles={openPicker} onHelp={() => shortcutsSheet.open()} />
      <input
        ref={picker}
        type="file"
        accept=".json,application/json"
        multiple
        hidden
        onChange={(e) => {
          const files = [...(e.target.files ?? [])];
          e.target.value = ''; // the same file can be picked again
          onFiles(files);
        }}
      />
      <main className="flex-1">
        {s.mode === 'empty' ? (
          <Start onFiles={onFiles} onBrowse={openPicker} />
        ) : route.name === 'data' ? (
          // Loaded data arrives in DEV-17.
          <h1 className="sr-only">{t('data.title')}</h1>
        ) : (
          <Tests onFiles={onFiles} onBrowse={openPicker} onExitSample={exitSample} />
        )}
      </main>
      <Toasts />
      <LeaveSampleDialog
        count={pending?.length ?? null}
        onStay={() => setPending(null)}
        onConfirm={() => {
          const files = pending!;
          setPending(null);
          void runImport(files);
        }}
      />
    </div>
  );
}
