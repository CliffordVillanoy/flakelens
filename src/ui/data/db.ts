import Dexie, { type Table } from 'dexie';
import { addImport, emptyDataset } from '@/engine/dataset';
import { hashString } from '@/engine/hash';
import type { Dataset, ImportResult } from '@/engine/types';
import { importResultSchema } from './stored';

// The user's data only (never sample data). Each parse result is stored as is, in import order; loading folds
// them through addImport again, so de-duplication and the test union are the engine's, not re-implemented here.
//
// Versioning, decided once: every row carries `schemaVersion` (rows saved before it existed count as 1). A change to
// the stored shape bumps STORED_VERSION and adds a step to migrate(); the Dexie version(n) number changes only when an
// index changes. Rows from a newer app are skipped, not deleted, so going back and forth between versions loses nothing.
const STORED_VERSION = 1;
interface StoredImport {
  importId: string;
  seq: number;
  schemaVersion?: number;
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
    await d.imports.add({ importId: unique.record.importId, seq: (last?.seq ?? -1) + 1, schemaVersion: STORED_VERSION, result: unique });
  });
}

/** The one place a stored row of an older version is brought to the current shape. Null: not readable by this app. */
function migrate(row: unknown): unknown {
  if (typeof row !== 'object' || row === null) return null;
  const { schemaVersion = 1, result } = row as { schemaVersion?: unknown; result?: unknown };
  if (typeof schemaVersion !== 'number' || schemaVersion > STORED_VERSION) return null;
  return result; // version 1 is the current shape; later versions convert here
}

/** Loads every readable row; rows that are corrupt or from a newer app are skipped and counted, never thrown. */
export async function loadStored(): Promise<{ dataset: Dataset; skipped: number }> {
  const rows: unknown[] = await getDb().imports.orderBy('seq').toArray();
  let dataset = emptyDataset();
  let skipped = 0;
  for (const row of rows) {
    const parsed = importResultSchema.safeParse(migrate(row));
    try {
      if (!parsed.success) throw new Error('unreadable row');
      dataset = addImport(dataset, parsed.data);
    } catch {
      skipped++;
    }
  }
  return { dataset, skipped };
}

export const loadDataset = async (): Promise<Dataset> => (await loadStored()).dataset;

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
