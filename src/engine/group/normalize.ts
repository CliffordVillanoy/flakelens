// Failure messages are untrusted text and can be huge. This turns one into a stable template: numbers, ids, times, paths
// and secrets are replaced by four typed tags, so the same failure looks the same on every run.
//
// Rules for this file (security review, ReDoS):
//  - the input is cut to MAX_INPUT_CHARS first, so no step can see more than that;
//  - every regex has bounded repeats or a plain class, and no group repeats something that can also match the next part;
//  - the secret and hex scan is a plain loop, not a regex.
// The angle marks are written as code points (U+2039, U+203A), never as raw characters in the source.

const L = String.fromCharCode(0x2039);
const R = String.fromCharCode(0x203a);

/** The four tags the UI draws as small grey chips. One constant, so the UI and the engine cannot drift. */
export const PLACEHOLDER = {
  n: `${L}n${R}`, // numbers and ports
  id: `${L}id${R}`, // hex, UUIDs, tokens, memory addresses, emails
  path: `${L}path${R}`, // file paths, URLs, query strings
  time: `${L}time${R}`, // timestamps
} as const;

export const MAX_INPUT_CHARS = 50_000;
export const MAX_NORMALISED_CHARS = 2_000;

const ESC = String.fromCharCode(27);
const ANSI = new RegExp(`${ESC}\\[[0-9;?]{0,20}[A-Za-z]`, 'g');
const BEARER = /\bBearer\s{1,10}[A-Za-z0-9._~+/=-]{1,2000}/gi;
const URL_LIKE = /\b[a-z][a-z0-9+.-]{1,15}:\/\/[^\s'"<>)\]]{1,2000}/gi;
const EMAIL = /[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9-]{1,63}(?:\.[A-Za-z0-9-]{1,63}){1,8}/g;
const UUID = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;
const DATE_TIME = /\b\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2}(?:[.,]\d{1,9})?)?(?:\s?(?:Z|[+-]\d{2}:?\d{2}))?/g;
const DATE = /\b\d{4}-\d{2}-\d{2}\b/g;
const CLOCK = /\b\d{1,2}:\d{2}:\d{2}(?:[.,]\d{1,9})?\b/g;
const WIN_PATH = /\b[A-Za-z]:\\(?:[^\s\\/:*?"<>|'()[\]]{1,255}\\){0,64}[^\s\\/:*?"<>|'()[\]]{1,255}(?::\d{1,6}){0,2}/g;
const POSIX_PATH = /(^|[\s(['"=,])\/(?:[\w.@%+~-]{1,255}\/){1,64}[\w.@%+~-]{1,255}(?::\d{1,6}){0,2}/g;
const QUERY = /\?[\w%.~+-]{1,100}=[^\s&"'<>)]{0,200}(?:&[\w%.~+-]{1,100}=[^\s&"'<>)]{0,200}){0,50}/g;
const MEMORY = /\b0x[0-9a-fA-F]{1,16}\b/g;
const NUMBER = /\d+(?:\.\d+)*/g;
const SPACE = /\s+/g;

const LONG_TOKEN = 24; // a run this long with letters and digits is a key or token
const HEX_RUN = 8; // a run this long made only of hex digits is a hash or an id

const isAlnum = (c: number) => (c >= 48 && c <= 57) || (c >= 65 && c <= 90) || (c >= 97 && c <= 122);
const isDigit = (c: number) => c >= 48 && c <= 57;
const isHex = (c: number) => isDigit(c) || (c >= 65 && c <= 70) || (c >= 97 && c <= 102);
// the characters of base64, base64url and "KEY-LIKE-THIS" tokens
const isTokenChar = (c: number) => isAlnum(c) || c === 43 || c === 47 || c === 95 || c === 61 || c === 45; // + / _ = -

/**
 * Is the run clearly a file path, not a token? Slash-separated, every segment lowercase words with at most two digits
 * (node_modules, v4, schemas). Base64 is mixed case and digit-heavy, so it never passes. When in doubt: not a path.
 */
function looksLikePath(text: string, from: number, to: number): boolean {
  let segments = 0;
  let segLen = 0;
  let segDigits = 0;
  for (let k = from; k <= to; k++) {
    const c = k === to ? 47 : text.charCodeAt(k);
    if (c === 47) {
      if (segLen > 0) segments++;
      segLen = 0;
      segDigits = 0;
      continue;
    }
    segLen++;
    if (isDigit(c)) segDigits++;
    const lower = (c >= 97 && c <= 122) || isDigit(c) || c === 95 || c === 45;
    if (!lower || segLen > 40 || segDigits > 2) return false;
  }
  return text.indexOf('/', from) !== -1 && text.indexOf('/', from) < to && segments >= 3;
}

/** Masks long key-like runs (and, when asked, hex runs) with `tag`. One pass over the text, no regex. */
function maskRuns(text: string, tag: string = PLACEHOLDER.id, hexRuns = true, keepPaths = false): string {
  const out: string[] = [];
  let copied = 0; // text before this index is already in `out`
  let i = 0;
  const n = text.length;
  while (i < n) {
    if (!isTokenChar(text.charCodeAt(i))) {
      i++;
      continue;
    }
    let j = i + 1;
    let digits = false;
    let letters = false;
    if (isDigit(text.charCodeAt(i))) digits = true;
    else if (isAlnum(text.charCodeAt(i))) letters = true;
    while (j < n && isTokenChar(text.charCodeAt(j))) {
      const c = text.charCodeAt(j);
      if (isDigit(c)) digits = true;
      else if (isAlnum(c)) letters = true;
      j++;
    }
    if (j - i >= LONG_TOKEN && digits && letters && !(keepPaths && looksLikePath(text, i, j))) {
      out.push(text.slice(copied, i), tag);
      copied = j;
    } else if (hexRuns) {
      // hex runs inside the run, split at - _ + / =
      let k = i;
      while (k < j) {
        if (!isAlnum(text.charCodeAt(k))) {
          k++;
          continue;
        }
        let m = k;
        let allHex = true;
        let hexLetter = false;
        while (m < j && isAlnum(text.charCodeAt(m))) {
          const c = text.charCodeAt(m);
          if (!isHex(c)) allHex = false;
          else if (!isDigit(c)) hexLetter = true;
          m++;
        }
        // a run of only digits is a number, not a hash
        if (allHex && hexLetter && m - k >= HEX_RUN) {
          out.push(text.slice(copied, k), tag);
          copied = m;
        }
        k = m;
      }
    }
    i = j;
  }
  if (copied === 0) return text;
  out.push(text.slice(copied));
  return out.join('');
}

export function normalizeMessage(input: string): string {
  let t = input.length > MAX_INPUT_CHARS ? input.slice(0, MAX_INPUT_CHARS) : input;
  if (t.includes(ESC)) t = t.replace(ANSI, '');
  t = t.replace(BEARER, `Bearer ${PLACEHOLDER.id}`);
  if (t.includes('://')) t = t.replace(URL_LIKE, PLACEHOLDER.path);
  if (t.includes('@')) t = t.replace(EMAIL, PLACEHOLDER.id);
  t = t.replace(UUID, PLACEHOLDER.id);
  t = t.replace(DATE_TIME, PLACEHOLDER.time).replace(DATE, PLACEHOLDER.time).replace(CLOCK, PLACEHOLDER.time);
  if (t.includes(':\\')) t = t.replace(WIN_PATH, PLACEHOLDER.path);
  if (t.includes('/')) t = t.replace(POSIX_PATH, (_m, before: string) => before + PLACEHOLDER.path);
  if (t.includes('?')) t = t.replace(QUERY, PLACEHOLDER.path);
  t = t.replace(MEMORY, PLACEHOLDER.id);
  t = maskRuns(t);
  t = t.replace(NUMBER, PLACEHOLDER.n);
  t = t.replace(SPACE, ' ').trim();
  return t.length > MAX_NORMALISED_CHARS ? t.slice(0, MAX_NORMALISED_CHARS) : t;
}

// ---- Secrets (DEV-37 follow-up) -------------------------------------------------------------------------------------
// Evidence lines and log text are quoted raw, so anything that shows or exports them passes through redactSecrets first.
// It keeps the rest of the line readable. Same rules as above: input cut to MAX_INPUT_CHARS, bounded regexes, a plain loop
// for key-like runs. verifyEvidence works on the raw text, never on this output.

export const REDACTED = '[redacted]';

// Same as BEARER, but never across a line break: evidence lines are numbered on the raw text, so redaction must keep the lines.
const BEARER_SAME_LINE = /\bBearer[ \t]{1,10}[A-Za-z0-9._~+/=-]{1,2000}/gi;

const SECRET_URL = /\b([a-z][a-z0-9+.-]{1,15}:\/\/)[^\s/@:'"]{1,100}:[^\s/@'"]{1,200}@/gi;
const SECRET_KEY =
  /\b((?:access[_-]?key|api[_-]?key|apikey|auth(?:orization)?|client[_-]?secret|passwd|password|private[_-]?key|pwd|secret|token)\b["']?[ \t]{0,3}[:=][ \t]{0,3})(?!Bearer\b|\[redacted\])(?:"[^"\n]{1,500}"|'[^'\n]{1,500}'|[^\s,;&"']{1,500})/gi;

/**
 * Masks secrets and keeps the rest of the line readable. `runs: false` skips the last step (long key-like runs of letters
 * and digits), for values such as branch names and commit subjects that are plain names, not log text (DEV-50).
 */
export function redactSecrets(input: string, opts: { runs?: boolean } = {}): string {
  let t = input.length > MAX_INPUT_CHARS ? input.slice(0, MAX_INPUT_CHARS) : input;
  t = t.replace(BEARER_SAME_LINE, `Bearer ${REDACTED}`);
  if (t.includes('://')) t = t.replace(SECRET_URL, `$1${REDACTED}@`);
  t = t.replace(SECRET_KEY, `$1${REDACTED}`);
  return opts.runs === false ? t : maskRuns(t, REDACTED, false, true); // file paths in stack frames stay readable
}
