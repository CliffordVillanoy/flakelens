// A small XML reader for JUnit reports (DEV-43). Hand-written on purpose: the browser's DOMParser does not exist in a Web
// Worker, and any library would bring a document-type and entity code path that would have to be switched off and trusted.
// This reader has no such path to switch off:
//   - A <!DOCTYPE ...> is skipped as one inert token and never interpreted. If its internal subset declares an <!ENTITY>,
//     the document is refused ('unsafe'): no entity is ever defined, expanded, fetched or read from a file.
//   - Only the five predefined entities and numeric character references are decoded. Any other &name; stays literal text.
//   - One pass over the text with indexOf and char codes: no recursion, no backtracking regex. Every scan that could be
//     repeated (the entity lookahead, the name and attribute loops) is bounded, so cost grows with the size of the text.
//   - Depth, element count and attributes per element are capped; a wrong or truncated document fails, it never throws.
// Output is data only: a tree of { name, attrs, children, text }. Nothing here renders or runs anything.

export interface XmlElement {
  name: string; // local name: a namespace prefix is dropped
  attrs: Record<string, string>;
  children: XmlElement[]; // child elements in document order
  text: string; // the element's own text and CDATA, in order, as one string
}
export type XmlFailure = 'unreadable' | 'tooDeep' | 'tooLarge' | 'unsafe';
export type XmlResult = { ok: true; root: XmlElement; doctype: boolean } | { ok: false; reason: XmlFailure };
export interface XmlLimits {
  maxDepth?: number;
  maxNodes?: number;
}

export const XML_MAX_DEPTH = 100;
export const XML_MAX_NODES = 1_000_000;
const MAX_NAME = 256;
const MAX_ATTRS = 200;
const LOOKAHEAD = 12; // the longest entity we read is "&#x10FFFF;"

const isSpace = (c: number) => c === 32 || c === 9 || c === 10 || c === 13;
const isNameStart = (c: number) => (c >= 65 && c <= 90) || (c >= 97 && c <= 122) || c === 95 || c === 58 || c > 127;
const isNameChar = (c: number) => isNameStart(c) || (c >= 48 && c <= 57) || c === 45 || c === 46;

const PREDEFINED: Record<string, string> = { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" };
const validChar = (c: number) => c === 9 || c === 10 || c === 13 || (c >= 0x20 && c <= 0xd7ff) || (c >= 0xe000 && c <= 0xfffd) || (c >= 0x10000 && c <= 0x10ffff);

/** Decodes the predefined entities and numeric references. Anything else (an unknown name, a bad number) stays as typed. */
function decode(s: string): string {
  let at = s.indexOf('&');
  if (at === -1) return s;
  const out: string[] = [];
  let from = 0;
  while (at !== -1) {
    let end = -1;
    for (let j = at + 1; j < s.length && j <= at + LOOKAHEAD; j++) {
      if (s.charCodeAt(j) === 59) {
        end = j;
        break;
      }
    }
    let replacement: string | null = null;
    if (end !== -1) {
      const name = s.slice(at + 1, end);
      if (name.charCodeAt(0) === 35) {
        const hex = name.charCodeAt(1) === 120;
        const digits = name.slice(hex ? 2 : 1);
        if (digits !== '' && (hex ? /^[0-9a-fA-F]{1,8}$/ : /^[0-9]{1,8}$/).test(digits)) {
          const code = parseInt(digits, hex ? 16 : 10);
          if (validChar(code)) replacement = String.fromCodePoint(code);
        }
      } else if (Object.hasOwn(PREDEFINED, name)) {
        replacement = PREDEFINED[name]!;
      }
    }
    if (replacement === null) {
      at = s.indexOf('&', at + 1);
      continue;
    }
    out.push(s.slice(from, at), replacement);
    from = end + 1;
    at = s.indexOf('&', from);
  }
  out.push(s.slice(from));
  return out.join('');
}

/** Where a <!DOCTYPE ...> ends: an index, 'unsafe' when its internal subset declares an entity, or -1 when it never ends. */
function skipDoctype(text: string, start: number): number | 'unsafe' {
  let i = start + 9;
  let subset = false;
  const n = text.length;
  while (i < n) {
    const c = text.charCodeAt(i);
    if (c === 34 || c === 39) {
      const close = text.indexOf(text[i]!, i + 1);
      if (close === -1) return -1;
      i = close + 1;
    } else if (subset && c === 60) {
      if (text.startsWith('<!--', i)) {
        const close = text.indexOf('-->', i + 4);
        if (close === -1) return -1;
        i = close + 3;
      } else if (text.startsWith('<?', i)) {
        const close = text.indexOf('?>', i + 2);
        if (close === -1) return -1;
        i = close + 2;
      } else if (text.charCodeAt(i + 1) === 33 && text.slice(i + 2, i + 8).toLowerCase() === 'entity') {
        return 'unsafe';
      } else i++;
    } else if (!subset && c === 91) {
      subset = true;
      i++;
    } else if (subset && c === 93) {
      subset = false;
      i++;
    } else if (!subset && c === 62) {
      return i + 1;
    } else i++;
  }
  return -1;
}

const localName = (name: string) => {
  const colon = name.lastIndexOf(':');
  return colon === -1 ? name : name.slice(colon + 1);
};

export function readXml(text: string, limits: XmlLimits = {}): XmlResult {
  const maxDepth = limits.maxDepth ?? XML_MAX_DEPTH;
  const maxNodes = limits.maxNodes ?? XML_MAX_NODES;
  const n = text.length;
  let i = text.charCodeAt(0) === 0xfeff ? 1 : 0;
  const stack: XmlElement[] = [];
  let root: XmlElement | null = null;
  let doctype = false;
  let nodes = 0;
  const fail = (reason: XmlFailure): XmlResult => ({ ok: false, reason });

  while (i < n) {
    const top = stack[stack.length - 1];
    if (top) {
      const lt = text.indexOf('<', i);
      if (lt === -1) return fail('unreadable'); // the document ends inside an element
      if (lt > i) top.text += decode(text.slice(i, lt));
      i = lt;
    } else {
      while (i < n && isSpace(text.charCodeAt(i))) i++;
      if (i >= n) break;
      if (text.charCodeAt(i) !== 60) return fail('unreadable'); // text outside the root element
    }

    const next = text.charCodeAt(i + 1);
    if (next === 63) {
      // <? ... ?>: the XML declaration and processing instructions, skipped
      const end = text.indexOf('?>', i + 2);
      if (end === -1) return fail('unreadable');
      i = end + 2;
    } else if (next === 33) {
      if (text.startsWith('<!--', i)) {
        const end = text.indexOf('-->', i + 4);
        if (end === -1) return fail('unreadable');
        i = end + 3;
      } else if (text.startsWith('<![CDATA[', i)) {
        const end = text.indexOf(']]>', i + 9);
        if (end === -1 || !top) return fail('unreadable');
        top.text += text.slice(i + 9, end);
        i = end + 3;
      } else if (text.startsWith('<!DOCTYPE', i)) {
        if (top || root || doctype) return fail('unreadable');
        const end = skipDoctype(text, i);
        if (end === 'unsafe') return fail('unsafe');
        if (end === -1) return fail('unreadable');
        doctype = true;
        i = end;
      } else return fail('unreadable');
    } else if (next === 47) {
      // closing tag
      const end = text.indexOf('>', i + 2);
      if (end === -1 || !top) return fail('unreadable');
      if (localName(text.slice(i + 2, end).trim()) !== top.name) return fail('unreadable');
      stack.pop();
      i = end + 1;
    } else {
      // start tag: <name attr="value" ... > or <name ... />
      let k = i + 1;
      if (!isNameStart(text.charCodeAt(k))) return fail('unreadable');
      while (k < n && isNameChar(text.charCodeAt(k))) k++;
      if (k - i - 1 > MAX_NAME) return fail('unreadable');
      const el: XmlElement = { name: localName(text.slice(i + 1, k)), attrs: {}, children: [], text: '' };
      let attrs = 0;
      let selfClosing = false;
      for (;;) {
        while (k < n && isSpace(text.charCodeAt(k))) k++;
        if (k >= n) return fail('unreadable');
        const c = text.charCodeAt(k);
        if (c === 62) {
          k++;
          break;
        }
        if (c === 47) {
          if (text.charCodeAt(k + 1) !== 62) return fail('unreadable');
          selfClosing = true;
          k += 2;
          break;
        }
        // attribute: name = "value" or name = 'value'
        if (!isNameStart(c) || ++attrs > MAX_ATTRS) return fail('unreadable');
        const nameStart = k;
        while (k < n && isNameChar(text.charCodeAt(k))) k++;
        if (k - nameStart > MAX_NAME) return fail('unreadable');
        const attr = text.slice(nameStart, k);
        while (k < n && isSpace(text.charCodeAt(k))) k++;
        if (text.charCodeAt(k) !== 61) return fail('unreadable');
        k++;
        while (k < n && isSpace(text.charCodeAt(k))) k++;
        const quote = text.charCodeAt(k);
        if (quote !== 34 && quote !== 39) return fail('unreadable');
        const close = text.indexOf(text[k]!, k + 1);
        if (close === -1) return fail('unreadable');
        const raw = text.slice(k + 1, close);
        if (raw.includes('<') || Object.hasOwn(el.attrs, attr)) return fail('unreadable');
        el.attrs[attr] = decode(raw);
        k = close + 1;
      }
      if (++nodes > maxNodes) return fail('tooLarge');
      if (top) top.children.push(el);
      else if (root) return fail('unreadable'); // a second root element
      else root = el;
      if (!selfClosing) {
        if (stack.length + 1 > maxDepth) return fail('tooDeep');
        stack.push(el);
      }
      i = k;
    }
  }
  if (!root || stack.length > 0) return fail('unreadable'); // nothing, or cut off before the root closed
  return { ok: true, root, doctype };
}
