import Dexie, { type Table } from 'dexie';
import { addImport, emptyDataset } from '@/engine/dataset';
import { hashString } from '@/engine/hash';
import type { Dataset, ImportResult } from '@/engine/types';

// The user's data only (never sample data). Each parse result is stored as is, in import order; loading folds
// them through addImport again, so de-duplication and the test union are the engine's, not re-implemented here.
interface StoredImport {
  importId: string;
  seq: number;
  result: ImportResult;
}

class FlakeDb extends Dexie {
  imports!: Table<StoredImport, string>;
  constructor() {
    super('flakelens');
    this.version(1).stores({ imports: 'importId, seq' });
  }
}

let db: FlakeDb | undefined;
const getDb = () => (db ??= new FlakeDb());

/** Gives the import a fresh ID (hashString(id + '#' + n)) while `taken` says it is in use; runs follow it. */
export function uniqueImportId(res: ImportResult, taken: (id: string) => boolean): ImportResult {
  const base = res.record.importId;
  let id = base;
  for (let n = 1; taken(id); n++) id = hashString(`${base}#${n}`);
  if (id === base) return res;
  return { ...res, record: { ...res.record, importId: id }, runs: res.runs.map((r) => ({ ...r, importId: id })) };
}

export async function saveImport(res: ImportResult): Promise<void> {
  const d = getDb();
  await d.transaction('rw', d.imports, async () => {
    const ids = new Set(await d.imports.toCollection().primaryKeys());
    const unique = uniqueImportId(res, (id) => ids.has(id));
    const last = await d.imports.orderBy('seq').last();
    await d.imports.add({ importId: unique.record.importId, seq: (last?.seq ?? -1) + 1, result: unique });
  });
}

export async function loadDataset(): Promise<Dataset> {
  const rows = await getDb().imports.orderBy('seq').toArray();
  return rows.reduce((ds, row) => addImport(ds, row.result), emptyDataset());
}

export async function clearAll(): Promise<void> {
  await getDb().imports.clear();
}

// False in private modes or browsers that block IndexedDB; the app then keeps data in memory for the session.
export async function storageAvailable(): Promise<boolean> {
  try {
    await getDb().open();
    return true;
  } catch {
    return false;
  }
}
