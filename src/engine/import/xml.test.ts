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

// ---- extra cases the security review asked for (DEV-43) ----
it('unclosed and mismatched tags fail, never loop', () => {
  for (const bad of ['<a><b></a></b>', '<a><b>', '<a></a><a>', '<a><b/></c>', '<a><b></b>', '<a></a', '<a><b></a>']) expect([bad, reason(bad)]).toEqual([bad, 'unreadable']);
});

it('100,000-deep nesting hits the depth cap, not the call stack', () => {
  const deep = '<a>'.repeat(100_000) + '</a>'.repeat(100_000);
  expect(reason(deep)).toBe('tooDeep');
  expect(reason(deep, { maxDepth: 1_000_000 })).toBe('ok'); // even with the cap lifted there is no recursion to overflow
});

it('1 million attributes on one element stop at the attribute cap', () => {
  const t0 = performance.now();
  const text = '<a' + Array.from({ length: 1_000_000 }, (_, i) => ` a${i}="1"`).join('') + '/>';
  expect(reason(text)).toBe('unreadable');
  expect(performance.now() - t0).toBeLessThan(1000);
});

it('entity references inside attributes decode; inside CDATA they stay as typed', () => {
  const root = ok('<a v="&amp;&lt;&#65;&nope;"><![CDATA[&amp; &lt; &#65; &nope;]]></a>');
  expect(root.attrs.v).toBe('&<A&nope;');
  expect(root.text).toBe('&amp; &lt; &#65; &nope;');
});

it('CDATA edge cases: empty, adjacent, containing brackets and "]]" and ">", and unterminated', () => {
  expect(ok('<a><![CDATA[]]></a>').text).toBe('');
  expect(ok('<a><![CDATA[x]]><![CDATA[y]]>z</a>').text).toBe('xyz');
  expect(ok('<a><![CDATA[a]b]]c> <b/> ]]></a>').text).toBe('a]b]]c> <b/> ');
  expect(reason('<a><![CDATA[never ends</a>')).toBe('unreadable');
  expect(reason('<![CDATA[x]]><a/>')).toBe('unreadable'); // CDATA outside the root
});

it('comment and processing instruction edge cases', () => {
  expect(reason('<a><!----></a>')).toBe('ok');
  expect(reason('<a><!-- a - b -- c --></a>')).toBe('ok'); // a double hyphen inside is tolerated, never parsed
  expect(reason('<a><!--></a>')).toBe('unreadable'); // no terminator
  expect(reason('<a><?pi with <angle> and "quotes"?></a>')).toBe('ok');
  expect(reason('<?xml-stylesheet href="x"?><a/>')).toBe('ok');
  expect(reason('<a/><!-- trailing --><?trailing pi?>')).toBe('ok');
  expect(reason('<a/><?never')).toBe('unreadable');
  expect(ok('<a>x<!-- c -->y<?p?>z</a>').text).toBe('xyz');
});

it('a document type of any size, with or without an internal subset, is skipped in linear time and defines nothing', () => {
  const big = 'x'.repeat(5_000_000);
  const cases: [string, string, string][] = [
    ['huge system id', `<!DOCTYPE t SYSTEM "${big}"><t/>`, 'ok'],
    ['huge subset of notations', `<!DOCTYPE t [${'<!NOTATION n SYSTEM "x">'.repeat(100_000)}]><t/>`, 'ok'],
    ['huge subset of element declarations', `<!DOCTYPE t [${'<!ELEMENT e ANY>'.repeat(300_000)}]><t/>`, 'ok'],
    ['an entity last in a huge subset', `<!DOCTYPE t [${'<!-- c -->'.repeat(300_000)}<!ENTITY a "b">]><t/>`, 'unsafe'],
    ['parameter entity', '<!DOCTYPE t [<!ENTITY % p "x"> %p;]><t/>', 'unsafe'],
    ['an unterminated subset', `<!DOCTYPE t [${'<!ELEMENT e ANY>'.repeat(1000)}<t/>`, 'unreadable'],
  ];
  for (const [name, text, expected] of cases) {
    const t0 = performance.now();
    expect([name, reason(text)]).toEqual([name, expected]);
    expect(performance.now() - t0, name).toBeLessThan(1000);
  }
});

it('invalid characters: lone surrogates and a NUL byte pass through as data, and numeric references to them stay literal', () => {
  const lone = '\uD800';
  const root = ok(`<a v="x${lone}y">a${lone}b\u0000c &#xD800; &#0; &#xFFFE; &#x110000;</a>`);
  expect(root.attrs.v).toBe(`x${lone}y`);
  expect(root.text).toBe(`a${lone}b\u0000c &#xD800; &#0; &#xFFFE; &#x110000;`);
  expect(reason(`<a\u0000b/>`)).toBe('unreadable'); // a NUL inside a tag name is not a name character: refused
});

it('a byte-order mark and CRLF line ends are fine, and CRLF inside text is kept as written', () => {
  const root = ok('﻿<?xml version="1.0"?>\r\n<a\r\n  v="1"\r\n>\r\n  <b/>\r\n  line1\r\nline2\r\n</a>\r\n');
  expect(root.attrs.v).toBe('1');
  expect(root.children.map((c) => c.name)).toEqual(['b']);
  expect(root.text).toContain('line1\r\nline2');
});

it('unknown entities, half entities and over-long references stay literal', () => {
  expect(ok('<a>&amp &lt &#x &#; &#xG; &; &toolongentityname; &#1234567890;</a>').text).toBe('&amp &lt &#x &#; &#xG; &; &toolongentityname; &#1234567890;');
});
