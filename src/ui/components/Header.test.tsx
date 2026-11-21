import { it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Header } from './Header';
import { getPref } from '../lib/prefs';
import { applyTheme } from '../lib/theme';

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
