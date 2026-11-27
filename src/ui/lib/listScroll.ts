// Opening the full test page leaves the list; Back to tests returns to the same place (DEV-41, criterion 1).
let saved: { y: number; testId: string } | null = null;

export function rememberList(testId: string): void {
  saved = { y: window.scrollY, testId };
}

/** The remembered scroll place and test, once; null when the list was not left through the full page. */
export function takeList(): { y: number; testId: string } | null {
  const s = saved;
  saved = null;
  return s;
}
