import { it, expect } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { navigate, parseRoute, useRoute } from './router';

it('parses the settings route', () => {
  expect(parseRoute('#/settings')).toMatchObject({ name: 'settings' });
  expect(parseRoute('#/settings/x')).toMatchObject({ name: 'start' });
});

it('parses the four routes', () => {
  expect(parseRoute('#/')).toMatchObject({ name: 'start' });
  expect(parseRoute('')).toMatchObject({ name: 'start' });
  const tests = parseRoute('#/tests?status=flaky&q=login');
  expect(tests.name).toBe('tests');
  expect(tests.query.get('status')).toBe('flaky');
  expect(tests.query.get('q')).toBe('login');
  expect(parseRoute('#/tests/abc')).toMatchObject({ name: 'test', testId: 'abc' });
  expect(parseRoute('#/tests/a%20b%2Fc')).toMatchObject({ name: 'test', testId: 'a b/c' });
  expect(parseRoute('#/data')).toMatchObject({ name: 'data' });
});

it('sends unknown hashes to start', () => {
  for (const h of ['#/nope', '#tests', '#/tests/a/b', '#/data/x', '#/tests/%E0%A4%A'])
    expect([h, parseRoute(h).name]).toEqual([h, 'start']);
});

it('useRoute follows navigate()', async () => {
  const { result } = renderHook(() => useRoute());
  expect(result.current.name).toBe('start');
  act(() => navigate('#/tests/xyz'));
  await waitFor(() => expect(result.current).toMatchObject({ name: 'test', testId: 'xyz' }));
  act(() => navigate('#/'));
  await waitFor(() => expect(result.current.name).toBe('start'));
});

it('useRoute returns the same route object until the hash really changes (so effects on route.query run once per change)', () => {
  window.location.hash = '#/tests?status=flaky';
  const { result, rerender } = renderHook(() => useRoute());
  const first = result.current;
  rerender();
  rerender();
  expect(result.current).toBe(first);
  expect(result.current.query).toBe(first.query);
  act(() => {
    window.location.hash = '#/tests?status=flaky&q=a';
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
  expect(result.current.query).not.toBe(first.query);
  expect(result.current.query.get('q')).toBe('a');
});

it('parses the groups route with its search and sort in the URL (DEV-38)', () => {
  expect(parseRoute('#/groups')).toMatchObject({ name: 'groups' });
  const r = parseRoute('#/groups?q=econnreset&sort=tests&g=abc');
  expect(r.name).toBe('groups');
  expect(r.query.get('q')).toBe('econnreset');
  expect(r.query.get('sort')).toBe('tests');
  expect(r.query.get('g')).toBe('abc');
  expect(parseRoute('#/groups/x')).toMatchObject({ name: 'start' });
});
