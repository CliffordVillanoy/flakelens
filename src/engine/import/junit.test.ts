import { it, expect, vi } from 'vitest';
import fc from 'fast-check';
import { readFileSync } from 'node:fs';
import { DEFAULT_CONFIG } from '../config';
import { addImport, emptyDataset } from '../dataset';
import { parseJUnitReport } from './junit';

const fx = (f: string) => readFileSync(`fixtures/junit/${f}`, 'utf8');
const opts = { fileName: 'report.xml', importedAt: '2026-11-25T10:00:00.000Z', order: 0 };
const parse = (text: string, over: Partial<Parameters<typeof parseJUnitReport>[1]> = {}) => parseJUnitReport(text, { ...opts, ...over });
const codes = (r: ReturnType<typeof parse>) => r.record.notices.map((n) => n.code);
const attemptsOf = (r: ReturnType<typeof parse>, name: string) => {
  const t = r.tests.find((x) => x.title === name)!;
  return r.attempts.filter((a) => a.testId === t.testId).sort((a, b) => a.retryIndex - b.retryIndex);
};

// ---- spec 9.1: one fixture per row ----
it('valid file: success, every testcase imported, the run read from the file', () => {
  const r = parse(fx('valid.xml'));
  expect(r.record.result).toBe('success');
  expect(r.record.counts).toEqual({ found: 4, imported: 4, notImported: 0 });
  expect(r.record.notices).toEqual([]);
  expect(r.runs).toHaveLength(1);
  expect(r.tests.map((t) => t.title)).toEqual(['appliesCouponCode', 'rejectsExpiredCoupon', 'pendingFeature', 'addsItem']);
  expect(r.attempts.map((a) => a.status)).toEqual(['pass', 'fail', 'skip', 'pass']);
});

it('mapping: classname is the file, name the title, time in seconds is durationMs, project is empty', () => {
  const r = parse(fx('valid.xml'));
  expect(r.tests[0]).toMatchObject({ file: 'com.acme.CheckoutTest', suitePath: [], title: 'appliesCouponCode', project: '' });
  expect(r.attempts.map((a) => a.durationMs)).toEqual([750, 1250, 0, 750]);
  expect(r.tests[3]).toMatchObject({ file: 'com.acme.CartTest', title: 'addsItem' });
});

it('failure: a failed attempt with the message attribute and the element text as the stack; skipped is a skip', () => {
  const r = parse(fx('valid.xml'));
  expect(r.failures).toHaveLength(1);
  expect(r.failures[0]!.message).toBe('expected:<1> but was:<0>');
  expect(r.failures[0]!.stack).toContain('at com.acme.CheckoutTest.rejectsExpiredCoupon(CheckoutTest.java:42)');
  expect(r.failures[0]!.attemptId).toBe(r.attempts[1]!.attemptId);
});

it('metadata is read from <properties>: git.commit, git.branch, os.name and browser; everything else is ignored', () => {
  const run = parse(fx('valid.xml')).runs[0]!;
  expect(run).toMatchObject({ commit: 'a1b2c3d4e5f6a7b8', branch: 'feat/coupons', os: 'Linux', browser: 'chromium', shard: null });
  expect(run.startedAt).toBe('2026-11-20T10:00:00.000Z'); // the earliest timestamp; a time with no zone is read as UTC
  expect(JSON.stringify(run)).not.toContain('java.version');
});

it('no metadata: fields are null and the no-commit notice is the only one', () => {
  const r = parse('<testsuite name="s"><testcase classname="a.B" name="t" time="1"/></testsuite>');
  expect(r.runs[0]).toMatchObject({ commit: null, branch: null, browser: null, os: null, startedAt: null });
  expect(codes(r)).toEqual(['import.noCommit']);
  expect(r.record.result).toBe('success');
});

it('a typed label wins over the commit in the file, and the file commit is kept so removing the label restores it', () => {
  const r = parse(fx('valid.xml'), { commitLabel: 'release-1' });
  expect(r.runs[0]).toMatchObject({ commit: 'release-1', reportCommit: 'a1b2c3d4e5f6a7b8' });
  expect(codes(r)).not.toContain('import.noCommit');
});

it('a commit that is not hex is not taken (a name that looks like markup never becomes a commit)', () => {
  const r = parse(fx('hostile.xml'));
  expect(r.runs[0]!.commit).toBeNull();
  expect(codes(r)).toContain('import.noCommit');
});

it('Surefire flakyFailure and flakyError are failed attempts followed by the final pass', () => {
  const r = parse(fx('surefire-rerun.xml'));
  const a = attemptsOf(r, 'passesAfterRetry');
  expect(a.map((x) => [x.retryIndex, x.status])).toEqual([[0, 'fail'], [1, 'fail'], [2, 'pass']]);
  expect(a.map((x) => x.durationMs)).toEqual([400, 300, 1200]);
  const f = r.failures.filter((x) => a.some((y) => y.attemptId === x.attemptId));
  expect(f.map((x) => x.message)).toEqual(['timeout 1', 'boom 2']);
  expect(f[0]!.stack).toContain('at com.acme.FlakyTest.passesAfterRetry(FlakyTest.java:10)'); // from the stackTrace child
  expect(f[0]!.stack).not.toContain('retry output');
  expect(f[1]!.stack).toBe('java.io.IOException: boom 2');
});

it('Surefire rerunFailure and rerunError are failed retries after the first failure; no pass follows', () => {
  const r = parse(fx('surefire-rerun.xml'));
  const a = attemptsOf(r, 'alwaysFails');
  expect(a.map((x) => [x.retryIndex, x.status])).toEqual([[0, 'fail'], [1, 'fail'], [2, 'fail']]);
  expect(a.map((x) => x.durationMs)).toEqual([900, 300, 200]);
  expect(attemptsOf(r, 'stable').map((x) => x.status)).toEqual(['pass']);
  expect(r.attempts).toHaveLength(7);
  expect(r.failures).toHaveLength(5);
  expect(r.runs[0]!.os).toBe('Mac OS X');
});

it('partial: a missing name is not imported, an unreadable time is kept without it, with notices that say where', () => {
  const r = parse(fx('partial.xml'));
  expect(r.record.result).toBe('partial');
  expect(r.record.counts).toEqual({ found: 7, imported: 5, notImported: 2 });
  expect(codes(r).filter((c) => c === 'import.partial.noName')).toHaveLength(2);
  const badDuration = r.record.notices.find((n) => n.code === 'import.partial.badDuration')!;
  expect(badDuration.params.count).toBe(3); // "soon", "-3" and no time at all
  expect(r.attempts.map((a) => a.durationMs)).toEqual([500, null, null, null, 200]);
  const noName = r.record.notices.find((n) => n.code === 'import.partial.noName')!;
  expect(noName.params).toMatchObject({ run: 'report.xml', pos: 5 });
});

it('duplicates: the same class and name in one file stay separate tests with unique ids, and a notice', () => {
  const r = parse(fx('duplicates.xml'));
  expect(r.tests).toHaveLength(4);
  expect(new Set(r.tests.map((t) => t.testId)).size).toBe(4);
  expect(r.record.notices.find((n) => n.code === 'import.dupeIds')!.params.count).toBe(2);
  expect(r.record.result).toBe('partial');
  expect(new Set(r.tests.map((t) => t.testKey)).size).toBe(2);
});

it('the same file imported twice is counted once (the run id comes from the content)', () => {
  const a = parse(fx('valid.xml'));
  const b = parse(fx('valid.xml'), { fileName: 'again.xml', importedAt: '2026-11-26T10:00:00.000Z', order: 1 });
  expect(a.runs[0]!.runId).toBe(b.runs[0]!.runId);
  const ds = addImport(addImport(emptyDataset(), a), b);
  expect(ds.runs).toHaveLength(1);
  expect(ds.imports[1]!.notices.map((n) => n.code)).toContain('import.dupeRun');
});

it('wrong format: well-formed XML that is not a JUnit report fails with the format notice', () => {
  const r = parse(fx('wrong-format.xml'));
  expect(r.record.result).toBe('failed');
  expect(codes(r)).toEqual(['import.fail.format']);
  expect(r.runs).toEqual([]);
});

it('empty or truncated: the file could not be read', () => {
  for (const f of ['empty.xml', 'truncated.xml']) {
    const r = parse(fx(f));
    expect([f, r.record.result, codes(r)]).toEqual([f, 'failed', ['import.fail.unreadable']]);
  }
  expect(codes(parse('   \n'))).toEqual(['import.fail.unreadable']);
});

it('more than half bad: too much of the file is unclear', () => {
  const r = parse(fx('mostly-bad.xml'));
  expect(r.record.result).toBe('failed');
  expect(codes(r)).toEqual(['import.fail.tooBad']);
});

it('too large and too deeply nested files fail with the limit', () => {
  const big = parse(fx('valid.xml'), { config: { ...DEFAULT_CONFIG, maxFileChars: 100 } });
  expect(codes(big)).toEqual(['import.fail.tooLarge']);
  expect(big.record.notices[0]!.params.limit).toBe('0 MB');
  const deep = '<testsuite name="a">'.repeat(60) + '<testcase classname="x.Y" name="t"/>' + '</testsuite>'.repeat(60);
  const r = parse(deep);
  expect(r.record.result).toBe('failed');
  expect(codes(r)).toEqual(['import.fail.tooLarge']);
  expect(r.record.notices[0]!.params.limit).toBe('50 nested suites');
  const ok = parse('<testsuite name="a">'.repeat(40) + '<testcase classname="x.Y" name="t"/>' + '</testsuite>'.repeat(40));
  expect(ok.record.result).not.toBe('failed');
});

it('hostile text is imported as plain text: nothing is expanded, rendered or run', () => {
  const r = parse(fx('hostile.xml'));
  expect(r.record.result).toBe('success');
  expect(r.tests[0]).toMatchObject({ file: '=cmd|calc', title: '<img src=x onerror=alert(1)> &xxe; &xxe;' });
  expect(r.tests[1]!.title).toContain('comma & "quotes"');
  expect(r.failures[0]!.message).toContain('FAKE-TOKEN-NOT-A-SECRET-000000'); // data; it is masked where it is shown or exported
  expect(r.runs[0]).toMatchObject({ branch: '=HYPERLINK("http://x")', commit: null });
});

// ---- security ----
it('external entity payloads (a local file, an HTTP URL) cause no read and no request, and the file is refused', () => {
  const fetch = vi.spyOn(globalThis, 'fetch');
  for (const f of ['xxe-file.xml', 'xxe-http.xml']) {
    const r = parse(fx(f));
    expect([f, r.record.result, codes(r)]).toEqual([f, 'failed', ['import.fail.unsafe']]);
    expect(JSON.stringify(r)).not.toMatch(/root:|passwd contents/);
  }
  expect(fetch).not.toHaveBeenCalled();
  fetch.mockRestore();
});

it('billion laughs fails in well under a second with a notice', () => {
  const t0 = performance.now();
  const r = parse(fx('billion-laughs.xml'));
  expect(performance.now() - t0).toBeLessThan(1000);
  expect(r.record.result).toBe('failed');
  expect(codes(r)).toEqual(['import.fail.unsafe']);
});

it('an unknown entity name in a name stays literal text', () => {
  const r = parse('<testsuite><testcase classname="a.B" name="&nope; &#xZZ;"/></testsuite>');
  expect(r.tests[0]!.title).toBe('&nope; &#xZZ;');
});

it('a document type with no entities is ignored, not an error', () => {
  const r = parse('<?xml version="1.0"?><!DOCTYPE testsuite SYSTEM "junit.dtd"><testsuite><testcase classname="a.B" name="t" time="1"/></testsuite>');
  expect(r.record.result).toBe('success');
  expect(r.tests).toHaveLength(1);
});

// ---- structure ----
it('nested suites give the suite path; a suite named like the class is not repeated; a file attribute wins and the class joins the path', () => {
  const r = parse(
    '<testsuites><testsuite name="Outer"><testsuite name="Inner"><testcase classname="pkg.Cls" name="t1"/></testsuite></testsuite>' +
      '<testsuite name="pkg.Cls"><testcase classname="pkg.Cls" name="t2"/></testsuite>' +
      '<testsuite name="py"><testcase classname="tests.test_a.TestCart" name="t3" file="tests/test_a.py"/></testsuite></testsuites>',
  );
  expect(r.tests.map((t) => [t.file, t.suitePath, t.title])).toEqual([
    ['pkg.Cls', ['Outer', 'Inner'], 't1'],
    ['pkg.Cls', [], 't2'],
    ['tests/test_a.py', ['py', 'tests.test_a.TestCart'], 't3'],
  ]);
});

it('error counts as a failure, system-out and system-err are ignored, a testcase with no class has an empty file', () => {
  const r = parse('<testsuite name="s"><testcase name="e"><error message="m" type="T">trace</error><system-out>noise</system-out></testcase><testcase name="ok"><system-err>x</system-err></testcase></testsuite>');
  expect(r.attempts.map((a) => a.status)).toEqual(['fail', 'pass']);
  expect(r.tests[0]).toMatchObject({ file: '', suitePath: ['s'], title: 'e' });
  expect(r.failures[0]).toMatchObject({ message: 'm', stack: 'trace' });
});

it('a failure with no message attribute uses its type, and its text is the stack', () => {
  const r = parse('<testsuite><testcase classname="a.B" name="t"><failure type="java.lang.Boom">only text</failure></testcase></testsuite>');
  expect(r.failures[0]).toMatchObject({ message: 'java.lang.Boom', stack: 'only text' });
});

it('a byte-order mark is stripped before the run id is made, so a BOM copy is the same run', () => {
  const a = parse(fx('valid.xml'));
  const b = parse('﻿' + fx('valid.xml'));
  expect(b.runs[0]!.runId).toBe(a.runs[0]!.runId);
});

it('an unreadable timestamp leaves the start empty and says so', () => {
  const r = parse('<testsuite timestamp="yesterday"><testcase classname="a.B" name="t"/></testsuite>');
  expect(r.runs[0]!.startedAt).toBeNull();
  expect(codes(r)).toContain('import.partial.badDate');
});

it('counts always add up: found = imported + not imported', () => {
  for (const f of ['valid.xml', 'surefire-rerun.xml', 'partial.xml', 'duplicates.xml', 'hostile.xml']) {
    const { counts } = parse(fx(f)).record;
    expect([f, counts.imported + counts.notImported]).toEqual([f, counts.found]);
  }
});

// ---- never throws, and stays fast ----
it('fuzz: random text, corrupted fixtures and cut-off fixtures never throw and always give a well-formed result', () => {
  const valid = fx('surefire-rerun.xml');
  const check = (text: string) => {
    const r = parse(text);
    expect(['success', 'partial', 'failed']).toContain(r.record.result);
    expect(r.record.counts.imported + r.record.counts.notImported).toBe(r.record.counts.found);
    if (r.record.result === 'failed') expect(r.runs).toEqual([]);
  };
  fc.assert(fc.property(fc.string({ maxLength: 300 }), (s) => (check(s), true)), { numRuns: 300 });
  fc.assert(fc.property(fc.nat(valid.length), fc.string({ maxLength: 10 }), (at, junk) => (check(valid.slice(0, at) + junk + valid.slice(at)), true)), { numRuns: 500 });
  fc.assert(fc.property(fc.nat(valid.length), (cut) => (check(valid.slice(0, cut)), true)), { numRuns: 300 });
});

it('timing: 20,000 test cases import in a few seconds, and hostile big inputs stay linear', () => {
  const big = '<testsuite name="big" timestamp="2026-11-20T10:00:00">' + Array.from({ length: 20_000 }, (_, i) => `<testcase classname="c${i % 50}" name="n${i}" time="0.1">${i % 9 === 0 ? '<failure message="m">s</failure>' : ''}</testcase>`).join('') + '</testsuite>';
  const t0 = performance.now();
  const r = parse(big);
  expect(performance.now() - t0).toBeLessThan(5000);
  expect(r.tests).toHaveLength(20_000);
  const hostile: [string, string][] = [
    ['a million attributes-like text', '<testsuite>' + '<testcase name="a" time="1"/>'.repeat(5) + '&'.repeat(3_000_000) + '</testsuite>'],
    ['5 MB test name', '<testsuite><testcase classname="a.B" name="' + 'x'.repeat(5_000_000) + '"/></testsuite>'],
    ['a million open tags', '<testsuite>'.repeat(1_000_000)],
  ];
  for (const [name, text] of hostile) {
    const t1 = performance.now();
    parse(text);
    expect(performance.now() - t1, name).toBeLessThan(2000);
  }
});

it('100,000 nested suites fail at the depth limit with a notice, not with a stack overflow', () => {
  const t0 = performance.now();
  const r = parse('<testsuite>'.repeat(100_000) + '</testsuite>'.repeat(100_000));
  expect(performance.now() - t0).toBeLessThan(1000);
  expect(r.record.result).toBe('failed');
  expect(codes(r)).toEqual(['import.fail.tooLarge']);
});
