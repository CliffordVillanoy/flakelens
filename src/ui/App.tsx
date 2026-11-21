import { useEffect, useRef, useState, type DragEvent } from 'react';
import { Header, type DataMode } from './components/Header';
import { DropZone, filesFrom } from './components/DropZone';
import { ImportBanner } from './components/ImportBanner';
import { ImportProgress } from './components/ImportProgress';
import { LeaveSampleDialog } from './components/LeaveSampleDialog';
import { SampleBanner } from './components/SampleBanner';
import { t } from './copy';
import { useStore } from './data/store';
import { navigate, useRoute } from './lib/router';
import { Start } from './screens/Start';

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
  const failed = s.lastImport?.records.filter((r) => r.result === 'failed') ?? [];

  return (
    <div className="flex min-h-screen flex-col" {...dropAnywhere}>
      <Header mode={HEADER_MODE[s.mode]} onAddFiles={openPicker} />
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
        ) : (
          // Tests screen arrives in DEV-14; this ticket shows its banners and import states.
          <div className="mx-auto flex w-full max-w-[1232px] flex-col gap-5 px-6 py-6 max-sm:px-4">
            <h1 className="sr-only">{t(route.name === 'data' ? 'data.title' : 'tests.h1')}</h1>
            {s.mode === 'sample' && <SampleBanner dataset={s.dataset} onExit={exitSample} />}
            {s.importing && <ImportProgress files={s.importing.files} done={s.importing.done} onCancel={s.cancelImport} />}
            {!s.importing && (failed.length > 0 || s.importError) && (
              <DropZone
                onFiles={onFiles}
                onBrowse={openPicker}
                failed={failed}
                others={(s.lastImport?.records.length ?? 0) - failed.length}
                error={s.importError}
              />
            )}
            {s.lastImport && (
              <ImportBanner
                summary={s.lastImport}
                totals={{ tests: s.dataset.tests.length, runs: s.dataset.runs.length }}
                onDismiss={s.dismissImport}
              />
            )}
          </div>
        )}
      </main>
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
