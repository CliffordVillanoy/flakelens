import { it, expect } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Header } from './Header';
import { getPref } from '../lib/prefs';
import { applyTheme, setTheme } from '../lib/theme';

it('shows logo, privacy line, add files, theme and help (data loaded, board 3)', () => {
  render(<Header mode="sample" />);
  expect(screen.getByRole('img', { name: 'FlakeLens' })).toBeInTheDocument();
  expect(screen.getByText('Nothing leaves this browser').closest('[title]')).toHaveAttribute(
    'title',
    'FlakeLens makes 0 network requests unless you turn on a cloud provider.',
  );
  expect(screen.getByRole('button', { name: 'Add your files' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Switch to light theme' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Keyboard shortcuts and help' })).toBeInTheDocument();
});

it('Start header has only the logo, theme and help (board 1)', () => {
  render(<Header mode="none" />);
  expect(screen.queryByText('Nothing leaves this browser')).toBeNull();
  expect(screen.queryByRole('button', { name: /Add/ })).toBeNull();
  expect(screen.getByRole('button', { name: 'Switch to light theme' })).toBeInTheDocument();
});

it('own data says "Add files"', () => {
  render(<Header mode="own" />);
  expect(screen.getByRole('button', { name: 'Add files' })).toBeInTheDocument();
});

it('own data always has a way to Loaded data, where Clear all data lives', () => {
  render(<Header mode="own" />);
  expect(screen.getByRole('link', { name: 'Loaded data' })).toHaveAttribute('href', '#/data');
});

it('Start and sample data have no Loaded data link', () => {
  render(<Header mode="sample" />);
  expect(screen.queryByRole('link', { name: 'Loaded data' })).toBeNull();
});

it('dark is the default; the theme button toggles data-theme and saves it', async () => {
  applyTheme();
  expect(document.documentElement.dataset.theme).toBe('dark');
  render(<Header mode="none" />);
  await userEvent.click(screen.getByRole('button', { name: 'Switch to light theme' }));
  expect(document.documentElement.dataset.theme).toBe('light');
  expect(getPref('theme', 'dark')).toBe('light');
  expect(screen.getByRole('img', { name: 'FlakeLens' })).toHaveAttribute('src', expect.stringContaining('flakelens-light.svg'));
  await userEvent.click(screen.getByRole('button', { name: 'Switch to dark theme' }));
  expect(document.documentElement.dataset.theme).toBe('dark');
  expect(getPref('theme', 'light')).toBe('dark');
});

it('restores a saved light theme on start', () => {
  window.localStorage.setItem('flakelens.theme', JSON.stringify('light'));
  applyTheme();
  expect(document.documentElement.dataset.theme).toBe('light');
});

it('Loaded data is a ghost link with a data icon, placed before "Add files"', () => {
  render(<Header mode="own" />);
  const link = screen.getByRole('link', { name: 'Loaded data' });
  expect(link.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
  expect(link).toHaveClass('bg-transparent');
  const add = screen.getByRole('button', { name: 'Add files' });
  expect(link.compareDocumentPosition(add) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});

it('an amber dot shows on Loaded data only when the last import needs a look, and is described for screen readers', () => {
  const { rerender } = render(<Header mode="own" />);
  expect(document.querySelector('[data-attention]')).toBeNull();
  rerender(<Header mode="own" attention />);
  expect(document.querySelector('[data-attention]')).not.toBeNull();
  expect(screen.getByRole('link', { name: 'Loaded data' })).toHaveAccessibleDescription('View all notices');
});

it('below 1000px the header says "Local only"; the full line stays as the accessible name and the tooltip', () => {
  render(<Header mode="own" />);
  const short = screen.getByText('Local only');
  expect(short).toHaveClass('min-[1000px]:hidden');
  expect(short).toHaveAttribute('aria-hidden', 'true');
  expect(short).toHaveAttribute('title', 'Nothing leaves this browser');
  expect(screen.getByText('Nothing leaves this browser')).toHaveClass('max-[999px]:sr-only');
});

it('on the Loaded data page itself the link to it is not shown', () => {
  render(<Header mode="own" onDataPage />);
  expect(screen.queryByRole('link', { name: 'Loaded data' })).toBeNull();
  expect(screen.getByRole('button', { name: 'Add files' })).toBeInTheDocument();
});

it('own data and sample data have a Settings link; Start does not; the page itself does not repeat it', () => {
  const { unmount } = render(<Header mode="own" />);
  expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '#/settings');
  unmount();
  const s = render(<Header mode="sample" />);
  expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '#/settings');
  s.unmount();
  const p = render(<Header mode="own" onSettingsPage />);
  expect(screen.queryByRole('link', { name: 'Settings' })).toBeNull();
  p.unmount();
  render(<Header mode="none" />);
  expect(screen.queryByRole('link', { name: 'Settings' })).toBeNull();
});

it('the logo follows a theme change made elsewhere (the Settings page)', async () => {
  applyTheme();
  render(<Header mode="none" />);
  act(() => setTheme('light'));
  expect(screen.getByRole('img', { name: 'FlakeLens' })).toHaveAttribute('src', expect.stringContaining('flakelens-light.svg'));
  act(() => setTheme('dark'));
});
