const REVOKE_DELAY_MS = 1000;

/** Saves text as a file in the browser. Nothing is sent anywhere: the file is made from a local Blob. */
export function downloadFile(name: string, mime: string, body: string): void {
  const url = URL.createObjectURL(new Blob([body], { type: mime }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  a.click();
  // Safari can cancel the download if the URL is revoked right after the click; give it a moment.
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
}
