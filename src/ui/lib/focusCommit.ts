import { navigate } from './router';

// The no-commit note's link: go to Loaded data and put focus in the first file's field that has no commit info.
export function focusFirstNoCommit(): void {
  navigate('#/data');
  let tries = 0;
  const go = () => {
    const el = document.querySelector<HTMLInputElement>('input[data-source="none"]');
    if (el) {
      el.focus();
      el.scrollIntoView?.({ block: 'center' });
    } else if (tries++ < 30) requestAnimationFrame(go);
  };
  requestAnimationFrame(go);
}
