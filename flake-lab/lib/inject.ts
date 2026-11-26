// Helpers for the injected causes (DEV-35). They exist so a failure has a stack with more than one project frame, like a
// test that calls a page object or a helper does in a real suite.
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import * as z from 'zod';

/**
 * Fails like a full disk would: the realistic Node error text. The error is thrown from inside a callback that a library
 * (zod, already a dependency) runs, as a write error thrown inside a library's hook would be, so the stack has project
 * frames and library frames (node_modules).
 */
export function failDiskFull(): never {
  z.string().check(
    z.refine(() => {
      throw Object.assign(new Error('ENOSPC: no space left on device, write'), { code: 'ENOSPC', errno: -28, syscall: 'write' });
    }),
  ).parse('payload');
  throw new Error('unreachable');
}

/** A local server that drops every connection the moment it is made: the client sees ECONNRESET. Nothing leaves the machine. */
export async function resettingServer(): Promise<{ url: string; close: () => void }> {
  const server = http.createServer((req) => req.socket.destroy());
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  return { url: `http://127.0.0.1:${port}`, close: () => server.close() };
}

/** Prints the request the way an HTTP debug log does, with an obviously fake token for the redaction tests. */
export function logRequest(url: string): void {
  console.log(`GET ${url} authorization: Bearer FAKE-TOKEN-NOT-A-SECRET-000000`);
}
