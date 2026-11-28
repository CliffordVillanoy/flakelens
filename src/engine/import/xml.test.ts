import { it, expect } from 'vitest';
import fc from 'fast-check';
import { readXml, type XmlElement } from './xml';

const ok = (text: string, limits?: Parameters<typeof readXml>[1]): XmlElement => {
  const r = readXml(text, limits);
  if (!r.ok) throw new Error(`expected a document, got ${r.reason}`);
  return r.root;
};
const reason = (text: string, limits?: Parameters<typeof readXml>[1]) => {
  const r = readXml(text, limits);
  return r.ok ? 'ok' : r.reason;
};

it('reads elements, attributes in both quote styles, text, CDATA and self-closing tags, in document order', () => {
  const root = ok(`<?xml version="1.0" encoding="UTF-8"?>
<!-- a comment -->
<testsuite name='a' tests="2">
  <testcase name="x" time="0.5"/>
  <testcase name="y"><failure message="boom">stack <![CDATA[<b>raw & text</b>]]> end</failure><system-out>out</system-out></testcase>
</testsuite>`);
  expect(root.name).toBe('testsuite');
  expect(root.attrs).toEqual({ name: 'a', tests: '2' });
  expect(root.children.map((c) => c.name)).toEqual(['testcase', 'testcase']);
  const y = root.children[1]!;
  expect(y.children.map((c) => c.name)).toEqual(['failure', 'system-out']);
  expect(y.children[0]!.attrs.message).toBe('boom');
  expect(y.children[0]!.text).toBe('stack <b>raw & text</b> end');
  expect(root.children[0]!.children).toEqual([]);
});

it('decodes the five predefined entities and numeric references; anything else stays literal text', () => {
  const root = ok('<a v="&lt;&gt;&amp;&quot;&apos;&#65;&#x42;">&lt;t&gt; &amp; &#x1F600; &xxe; &foo &#99999999999; &#0;</a>');
  expect(root.attrs.v).toBe('<>&"\'AB');
  expect(root.text).toBe('<t> & \u{1F600} &xxe; &foo &#99999999999; &#0;');
});

it('namespace prefixes on element names are dropped; a BOM and an XML declaration are fine', () => {
  const root = ok('﻿<?xml version="1.0"?><ns:testsuites xmlns:ns="urn:x"><ns:testsuite name="s"/></ns:testsuites>');
  expect(root.name).toBe('testsuites');
  expect(root.children[0]!.name).toBe('testsuite');
});

it('a document type is skipped, never read: entity declarations are refused, a plain one is ignored', () => {
  expect(readXml('<!DOCTYPE testsuite><testsuite/>')).toMatchObject({ ok: true, doctype: true });
  expect(readXml('<!DOCTYPE testsuite SYSTEM "junit.dtd"><testsuite/>')).toMatchObject({ ok: true, doctype: true });
  expect(reason('<!DOCTYPE t [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><testsuite name="&xxe;"/>')).toBe('unsafe');
  expect(reason('<!DOCTYPE t [<!ENTITY xxe SYSTEM "http://127.0.0.1:9/x">]><testsuite/>')).toBe('unsafe');
  expect(reason('<!DOCTYPE t [<!entity % p "x">]><testsuite/>')).toBe('unsafe'); // any case
  expect(reason('<!DOCTYPE t [<!-- <!ENTITY a "b"> -->]><testsuite/>')).toBe('ok'); // inside a comment it is not a declaration
  expect(reason('<testsuite><!DOCTYPE t></testsuite>')).toBe('unreadable'); // only before the root
  expect(reason('<!DOCTYPE t [ "a>b" ]><testsuite/>')).toBe('ok'); // a > inside quotes does not end it
});

it('billion laughs and external entity payloads cost nothing and are refused', () => {
  const lol = '<?xml version="1.0"?><!DOCTYPE lolz [<!ENTITY lol "lol">' + Array.from({ length: 9 }, (_, i) => `<!ENTITY lol${i + 1} "${'&lol' + (i === 0 ? '' : i) + ';'.repeat(1)}${'&lol' + (i === 0 ? '' : i) + ';'.repeat(1)}">`).join('') + ']><lolz>&lol9;</lolz>';
  const t0 = performance.now();
  expect(reason(lol)).toBe('unsafe');
  const xxe = '<?xml version="1.0"?><!DOCTYPE foo [<!ELEMENT foo ANY><!ENTITY xxe SYSTEM "file:///etc/passwd">]><testsuite name="&xxe;"><testcase name="&xxe;"/></testsuite>';
  expect(reason(xxe)).toBe('unsafe');
  expect(performance.now() - t0).toBeLessThan(100);
});

it('empty, truncated or broken documents are unreadable', () => {
  for (const bad of ['', '   ', 'not xml', '<a>', '<a><b></a>', '<a></b>', '<a/><b/>', '<a/>text', 'text<a/>', '<a b=c/>', '<a b="1" b2></a>', '<a b="x', '<a><!-- open', '<a><![CDATA[ open', '<?pi open', '<a>1 < 2</a>', '<a', '<>', '</a>', '<a><</a>', '<1a/>'])
    expect([bad, reason(bad)]).toEqual([bad, 'unreadable']);
});

it('depth and size limits: too deep and too many elements are refused', () => {
  expect(reason('<a>'.repeat(60) + '</a>'.repeat(60), { maxDepth: 50, maxNodes: 1000 })).toBe('tooDeep');
  expect(reason('<a>'.repeat(50) + '</a>'.repeat(50), { maxDepth: 50, maxNodes: 1000 })).toBe('ok');
  expect(reason('<a>' + '<b/>'.repeat(1001) + '</a>', { maxDepth: 50, maxNodes: 1000 })).toBe('tooLarge');
  expect(reason('<a x1="1"' + Array.from({ length: 300 }, (_, i) => ` y${i}="1"`).join('') + '/>')).toBe('unreadable'); // an element with absurdly many attributes
});

it('big and hostile inputs are linear: each is read or refused well inside a second', () => {
  const cases: [string, string][] = [
    ['100k test cases', '<testsuite>' + '<testcase classname="c" name="n" time="0.1"><failure message="m">stack</failure></testcase>'.repeat(100_000) + '</testsuite>'],
    ['a million open tags', '<a>'.repeat(1_000_000)],
    ['5 MB of ampersands without a semicolon', '<a>' + '&'.repeat(5_000_000) + '</a>'],
    ['2 million entities', '<a>' + '&amp;'.repeat(2_000_000) + '</a>'],
    ['20 MB of text', '<a>' + 'x'.repeat(20_000_000) + '</a>'],
    ['many comment starts', '<a>' + '<!--'.repeat(1_000_000)],
    ['many unterminated CDATA starts', '<a>' + '<![CDATA['.repeat(500_000)],
    ['a huge doctype', '<!DOCTYPE t [' + '<!-- x -->'.repeat(500_000) + ']><a/>'],
    ['many quotes in a doctype', '<!DOCTYPE t [' + '"a>'.repeat(1_000_000) + ']><a/>'],
    ['a huge attribute value', '<a v="' + 'y'.repeat(10_000_000) + '"/>'],
  ];
  for (const [name, text] of cases) {
    const t0 = performance.now();
    readXml(text);
    expect(performance.now() - t0, name).toBeLessThan(1000);
  }
});

it('fuzz: random and corrupted text never throws', () => {
  const valid = '<?xml version="1.0"?><testsuites><testsuite name="s" timestamp="2026-11-20T10:00:00"><properties><property name="a" value="b"/></properties><testcase classname="c" name="n" time="1.5"><failure message="m &amp; n">st<![CDATA[x]]></failure></testcase></testsuite></testsuites>';
  fc.assert(
    fc.property(fc.string({ maxLength: 400 }), (s) => {
      readXml(s);
      return true;
    }),
    { numRuns: 500 },
  );
  fc.assert(
    fc.property(fc.nat(valid.length), fc.string({ maxLength: 8 }), fc.nat(valid.length), (at, junk, cut) => {
      readXml(valid.slice(0, at) + junk + valid.slice(at));
      readXml(valid.slice(0, cut));
      return true;
    }),
    { numRuns: 1000 },
  );
  fc.assert(
    fc.property(fc.array(fc.constantFrom('<', '>', '/', '"', "'", '=', '&', ';', '!', '-', '[', ']', '?', 'a', ' ', '#', 'x'), { maxLength: 300 }), (parts) => {
      readXml(parts.join(''));
      return true;
    }),
    { numRuns: 1000 },
  );
});
