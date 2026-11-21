/** Saves text as a file in the browser. Nothing is sent anywhere: the file is made from a local Blob. */
export function downloadFile(name: string, mime: string, body: string): void {
  const url = URL.createObjectURL(new Blob([body], { type: mime }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  a.click();
  URL.revokeObjectURL(url);
}
