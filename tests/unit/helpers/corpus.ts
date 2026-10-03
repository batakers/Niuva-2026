// Seeded adversarial corpora for table-driven "property" tests.
// Not a PBT library (fast-check is not installed, R14.10). Not a test file.
// Every value is synthetic; no real secrets, emails, or paths are used.

export const DEFAULT_SEED = 20261002;
export const MIN_GENERATED = 100;

/** mulberry32: tiny deterministic PRNG returning floats in [0, 1). */
export function createRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), s | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Rng = () => number;

const pick = <T>(rng: Rng, items: readonly T[]): T => items[Math.floor(rng() * items.length)] as T;
const str = (rng: Rng, alphabet: string, min: number, max: number): string =>
  Array.from({ length: min + Math.floor(rng() * (max - min + 1)) }, () => alphabet[Math.floor(rng() * alphabet.length)]).join("");

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/-_=";
const WORD = "abcdefghijklmnopqrstuvwxyz0123456789";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Fixed hand-written cases first, then `count` (>= 100) seeded cases. */
export function seededCorpus(fixed: readonly string[], make: (rng: Rng) => string, seed = DEFAULT_SEED, count = MIN_GENERATED): string[] {
  const rng = createRng(seed);
  return [...fixed, ...Array.from({ length: Math.max(count, MIN_GENERATED) }, () => make(rng))];
}

/** Runs `check` for each case; on failure rethrows with the seed and case so the run can be reproduced. */
export function forEachCase(cases: readonly string[], check: (value: string, index: number) => void, seed = DEFAULT_SEED): void {
  cases.forEach((value, index) => {
    try {
      check(value, index);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(`[corpus seed=${seed}] case #${index} ${JSON.stringify(value)}: ${reason}`, { cause: error });
    }
  });
}

export function tokenCorpus(seed = DEFAULT_SEED): string[] {
  const fixed = [
    "", "v1", "v1..", "v1.a.b", "v1.AAAA.secret", "V1.AAAA.SECRET", "v2.AAAA.secret", "v1.%00.secret", "v1.<script>.secret",
    "v1.a.b.c", " v1.AAAA.secret ", "v1.AAAA.secret\n", "../v1.AAAA.secret", "v1.".padEnd(4096, "A"), "null", "undefined",
  ];
  return seededCorpus(fixed, (r) => `${pick(r, ["v1", "v1", "v2", "V1", ""])}.${str(r, B64, 0, 48)}.${str(r, B64 + ".", 0, 48)}`, seed);
}

export function emailCorpus(seed = DEFAULT_SEED): string[] {
  const fixed = ["", "a@b", "user@example.test", "USER@EXAMPLE.TEST", "a+b@example.test", "a@@example.test", "a b@example.test", "<script>@example.test", "a@exa mple.test"];
  return seededCorpus(fixed, (r) => `${str(r, WORD + "+._-", 1, 12)}@${str(r, WORD + "-", 1, 10)}.${pick(r, ["test", "invalid", "example"])}`, seed);
}

export function filePathCorpus(seed = DEFAULT_SEED): string[] {
  const fixed = ["", "/", "C:\\Users\\x\\secret.env", "/etc/passwd", "../../.env.local", "src/lib/auth/clerk.ts", "\\\\host\\share\\f.stl", "file:///tmp/x", "a/b/../c", "%2e%2e%2fsecret"];
  return seededCorpus(fixed, (r) => `${pick(r, ["", "/", "../", "C:\\", "./"])}${Array.from({ length: 1 + Math.floor(r() * 4) }, () => str(r, WORD + ".-_", 1, 10)).join(pick(r, ["/", "\\"]))}`, seed);
}

export function scriptFragmentCorpus(seed = DEFAULT_SEED): string[] {
  const fixed = [
    "<script>alert(1)</script>", "</script><script>x</script>", "<SCRIPT SRC=//x.test></SCRIPT>", "<img src=x onerror=alert(1)>",
    "\"><script>", "'-alert(1)-'", "javascript:alert(1)", "<svg onload=alert(1)>", "&lt;script&gt;", "<scr<script>ipt>",
  ];
  return seededCorpus(fixed, (r) => `${pick(r, ["<script>", "</script>", "<ScRiPt>", "\"><script>", "<img onerror="])}${str(r, WORD + "();=' ", 0, 16)}${pick(r, ["</script>", ">", "", "<!--"])}`, seed);
}

/** Guaranteed not to match a canonical UUID. */
export function nonUuidCorpus(seed = DEFAULT_SEED): string[] {
  const fixed = [
    "", " ", "0", "abc", "null", "undefined", "../etc/passwd", "<script>alert(1)</script>", "00000000-0000-0000-0000-00000000000",
    "00000000-0000-0000-0000-0000000000000", "g0000000-0000-0000-0000-000000000000", "00000000000000000000000000000000",
    "{00000000-0000-0000-0000-000000000000}", " 00000000-0000-0000-0000-000000000000", "00000000-0000-0000-0000-000000000000 ", "%00", "1; DROP TABLE orders",
  ];
  return seededCorpus(fixed, (r) => {
    let value = str(r, WORD + "-_%./<>", 0, 40);
    while (UUID_RE.test(value)) value += "x";
    return value;
  }, seed);
}

export function acceptHeaderCorpus(seed = DEFAULT_SEED): string[] {
  const fixed = [
    "", "*/*", "text/html", "TEXT/HTML", "text/html;q=0", "text/html; q=0.0", "text/html;q=0.001", "text/html;q=abc", "application/json",
    "application/json, text/html;q=0", "text/*", "text/html,application/xhtml+xml", ",,,", "text/html;;;", "text/htmlx", "xtext/html", "text/html;level=1;q=1",
  ];
  const ranges = ["text/html", "TEXT/HTML", "application/json", "*/*", "text/*", "image/png", "text/plain", "application/xhtml+xml", ""];
  return seededCorpus(fixed, (r) => Array.from({ length: 1 + Math.floor(r() * 3) }, () => `${pick(r, ranges)}${pick(r, ["", "", ";q=0", ";q=1", ";q=0.5", "; q=0.0", ";q=x"])}`).join(pick(r, [",", ", ", ";"])), seed);
}

export function pathnameCorpus(seed = DEFAULT_SEED): string[] {
  const fixed = [
    "", "/", "/admin", "/admin/", "/ADMIN", "/Admin/Sign-In", "/admin/sign-in", "/admin/sign-in/", "/admin/sign-in/factor-one", "/admin/sign-in-other",
    "/admin/sign-inx", "/admin/sign-in%2Fx", "/admin/sign-in/../orders", "/admin//sign-in", "/api", "/API/admin", "/api/", "/apix", "/admin/orders/%00", "//host/admin",
  ];
  const segs = ["admin", "ADMIN", "sign-in", "Sign-In", "sign-in-other", "api", "orders", "%2F", "%2e%2e", "..", ".", "", "factor-one", "sso-callback"];
  return seededCorpus(fixed, (r) => `${pick(r, ["", "/", "//"])}${Array.from({ length: 1 + Math.floor(r() * 4) }, () => pick(r, segs)).join("/")}${pick(r, ["", "", "/", "?x=1", "#h"])}`, seed);
}
