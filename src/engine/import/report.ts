import { failedImport } from './failed';
import { parseJUnitReport } from './junit';
import { parsePlaywrightReport, type ParseOptions } from './playwright';
import type { ImportResult } from '../types';

/**
 * Picks the importer by content, not by file name: a document that starts with "<" (after a byte-order mark and blank
 * space) is read as JUnit XML, anything else as a Playwright JSON report. Each importer returns the format notice when
 * the file is its kind of syntax but not its kind of report. Never throws.
 */
export function parseReport(text: string, opts: ParseOptions): ImportResult {
  try {
    let i = text.charCodeAt(0) === 0xfeff ? 1 : 0;
    while (i < text.length && i < 10_000 && (text.charCodeAt(i) <= 32 || text.charCodeAt(i) === 0xa0)) i++;
    return text.charCodeAt(i) === 60 ? parseJUnitReport(text, opts) : parsePlaywrightReport(text, opts);
  } catch {
    return failedImport(opts, 'import.fail.unreadable');
  }
}
