import { it, expect } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { navigate, parseRoute, useRoute } from './router';

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
