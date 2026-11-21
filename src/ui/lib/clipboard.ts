import { t } from '../copy';
import { toast, toastError } from '../components/Toasts';

/** Every copy action: an optional success toast, and an error toast when the browser blocks the clipboard. */
export async function copyText(text: string, done?: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    if (done) toast(done);
  } catch {
    toastError(t('toast.copyFailed'));
  }
}
