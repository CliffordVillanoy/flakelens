import type { CauseId } from '../types';

// Cause rules as data (DEV-37). Each rule is one bounded pattern run on one line of a failure text at a time.
//
// Rules for this file (security review, ReDoS): no pattern has a nested or unbounded repeat over text that can also match
// what follows; every gap is {0,N}; lines are cut to MAX_LINE_CHARS before a rule sees them. The rules are plain "this
// text usually means that" knowledge from Playwright and Node errors, written before looking at the lab results, and
// the lab is used to measure them, not to tune them.
//
// weight: how much the text alone says about the cause. high = the text names the cause (strict mode violation, ENOSPC),
// medium = the text points at it but other causes can print it (a 5xx, a timeout of the whole test), low = a weak hint.
// tip: the copy key of the cause tip (copy doc section 14); the engine never holds visible text.

export type Weight = 'high' | 'medium' | 'low';
export type RuleCategory = Exclude<CauseId, 'unknown'>;
export interface CauseRule {
  id: string;
  category: RuleCategory;
  pattern: RegExp; // never global or sticky
  weight: Weight;
  tip: `cause.${RuleCategory}.tip`;
}

export const MAX_LINE_CHARS = 2_000;

const rule = (id: string, pattern: RegExp, weight: Weight): CauseRule => {
  const category = id.slice(0, id.indexOf('.')) as RuleCategory;
  return { id, category, pattern, weight, tip: `cause.${category}.tip` };
};

export const CAUSE_RULES: readonly CauseRule[] = [
  // ---- timing and waits
  rule('timing.testTimeout', /Test timeout of \d{1,9}ms exceeded/, 'medium'),
  rule('timing.timeoutError', /\bTimeoutError\b/, 'medium'),
  rule('timing.expectTimeout', /\bTimeout:? \d{1,9}ms\b/, 'low'),
  rule('timing.waitingFor', /\bwaiting for (?:locator|selector|getBy\w{1,20}|expect|navigation|load state|event|function)\b/i, 'low'),
  rule('timing.fixedWait', /\bwaitForTimeout\b/, 'low'),

  // ---- locator or UI
  rule('locator.strict', /strict mode violation/, 'high'),
  rule('locator.notVisible', /element is not (?:visible|stable|enabled)|element is outside of the viewport|intercepts pointer events/, 'high'),
  rule('locator.detached', /element is not attached to the DOM|detached from (?:the )?DOM|element is detached/i, 'high'),
  rule('locator.notFound', /(?:element|locator)\(s\) not found|resolved to 0 elements|No element matches/, 'medium'),
  rule('locator.visibleAssertion', /expect\(locator\)\.(?:not\.)?to(?:BeVisible|BeHidden|BeAttached|BeEnabled|BeDisabled|HaveCount)\(/, 'medium'),
  rule('locator.textAssertion', /expect\(locator\)\.to\w{2,30}\(/, 'low'),

  // ---- network or external service
  rule('network.err', /net::ERR_(?:CONNECTION_REFUSED|CONNECTION_RESET|CONNECTION_CLOSED|CONNECTION_TIMED_OUT|TIMED_OUT|NAME_NOT_RESOLVED|INTERNET_DISCONNECTED|NETWORK_CHANGED|EMPTY_RESPONSE|ADDRESS_UNREACHABLE|PROXY_CONNECTION_FAILED)/, 'high'),
  rule('network.econnrefused', /\bECONNREFUSED\b/, 'high'),
  rule('network.econnreset', /\bECONNRESET\b|socket hang up/, 'medium'),
  rule('network.dns', /\bgetaddrinfo\b|\b(?:ENOTFOUND|EAI_AGAIN)\b/, 'high'),
  rule('network.http5xx', /\b(?:Received|status|HTTP)[^\n]{0,20}\b5\d\d\b|\b5\d\d (?:Service Unavailable|Bad Gateway|Gateway Time-?out|Internal Server Error)/i, 'medium'),
  rule('network.etimedout', /\b(?:ETIMEDOUT|ESOCKETTIMEDOUT)\b/, 'medium'),

  // ---- environment or resources
  rule('environment.oom', /out of memory|\bENOMEM\b|Cannot allocate memory/i, 'high'),
  rule('environment.disk', /\bENOSPC\b|no space left on device/i, 'high'),
  rule('environment.targetClosed', /Target (?:page, context or browser has been )?closed|browser has been closed|Browser closed unexpectedly|Page crashed/i, 'medium'),
  rule('environment.workerCrash', /Worker process exited unexpectedly|\bSIGKILL\b|\bSIGSEGV\b/, 'medium'),

  // ---- time and randomness
  rule('time.dateMismatch', /(?:Expected|Received)[^\n]{0,80}\b\d{4}-\d{2}-\d{2}\b/, 'medium'),
  rule('time.clockMismatch', /(?:Expected|Received)[^\n]{0,80}\b\d{1,2}:\d{2}(?::\d{2})?\b/, 'low'),
  rule('time.clockWords', /\b(?:timezone|time zone|daylight saving|Date\.now|midnight)\b/i, 'low'),
  rule('time.random', /\b(?:Math\.random|random seed)\b/i, 'low'),

  // ---- shared state or data
  rule('sharedState.exists', /already exists|already in use|already taken|duplicate (?:key|entry)|UNIQUE constraint|unique violation|\bEEXIST\b/i, 'medium'),
  rule('sharedState.stale', /stale (?:data|state|cache|record)|leftover data/i, 'medium'),

  // ---- order dependency
  rule('order.previousTest', /(?:previous|earlier|prior|another) test|test order|order[- ]dependent|run (?:it )?(?:alone|in isolation)/i, 'medium'),
  rule('order.hook', /"(?:beforeAll|beforeEach|afterAll|afterEach)" hook/, 'low'),

  // ---- concurrency
  rule('concurrency.race', /race condition|\bdeadlock\b|\bconcurrent(?:ly)?\b|lost update|\bEBUSY\b|\bEAGAIN\b|database is locked|lock timeout/i, 'medium'),

  // ---- infrastructure
  rule('infrastructure.runner', /rate limit(?:ed)?|Too Many Requests|\b429\b|lost communication with the server|The operation was canceled|OOMKilled/i, 'medium'),
  rule('infrastructure.setup', /Executable doesn't exist|browserType\.launch:|Failed to download|npm ERR!|yarn error|Could not resolve host|was just installed or updated/i, 'high'),
];
