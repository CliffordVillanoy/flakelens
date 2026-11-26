import { hashString } from '../hash';
import { normalizeMessage } from './normalize';

/** The template the UI shows in a group card is cut here; the full normalised text stays in `normalized` (board 12). */
export const TEMPLATE_CHARS = 300;

export interface Fingerprint {
  fingerprint: string; // hashString of the normalised text
  template: string; // the first TEMPLATE_CHARS of the normalised text
  normalized: string; // the full normalised text (capped by normalizeMessage)
}

export function fingerprint(text: string): Fingerprint {
  const normalized = normalizeMessage(text);
  return { fingerprint: hashString(normalized), template: normalized.slice(0, TEMPLATE_CHARS), normalized };
}
