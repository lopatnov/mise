import { lookup as dnsLookup } from 'node:dns/promises';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';

/** Return true if the address is private/internal and must never be reachable from user input */
export function isPrivateIp(ip: string): boolean {
  const h = ip.toLowerCase().replace(/^\[|\]$/g, '');
  if (h === 'localhost' || h === '0.0.0.0') return true;
  if (h === '127.0.0.1' || /^127\./.test(h)) return true;
  if (/^10\./.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true;
  if (/^192\.168\./.test(h)) return true;
  if (h === '::1' || h === '0:0:0:0:0:0:0:1') return true;
  if (/^f[cd]/i.test(h)) return true;
  if (h === '169.254.169.254') return true;
  return false;
}

export interface SsrfSafeUrl {
  url: URL;
  address: string;
  family: 4 | 6;
}

/**
 * Resolve hostname to IP and verify it is not a private/internal address.
 * Returns the parsed URL AND the pre-resolved IP address.
 *
 * The caller must use fetchPinned() with the returned SsrfSafeUrl so that
 * the actual TCP connection is made to the validated IP — not to whatever
 * DNS resolves to at request time. This prevents DNS rebinding attacks where
 * a second DNS lookup (done by fetch/http.request internally) could return a
 * different, private IP after our validation.
 */
export async function isSsrfSafe(urlString: string): Promise<SsrfSafeUrl | false> {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
  const hostname = parsed.hostname.replace(/^\[|\]$/g, '');
  try {
    const { address, family } = await dnsLookup(hostname);
    return isPrivateIp(address) ? false : { url: parsed, address, family: family as 4 | 6 };
  } catch {
    return false; // unresolvable hostname → reject
  }
}

export interface PinnedResponse {
  ok: boolean;
  status: number;
  getHeader(name: string): string | undefined;
  buffer(): Promise<Buffer>;
}

/**
 * HTTP/HTTPS request pinned to the pre-resolved IP from isSsrfSafe().
 * Uses node:http/https with a custom lookup that always returns the validated
 * address, so no second DNS lookup occurs and DNS rebinding is not possible.
 * TLS remains intact: the original hostname is used for SNI/cert verification.
 */
export function fetchPinned(
  safe: SsrfSafeUrl,
  options: { headers?: Record<string, string>; timeoutMs?: number } = {},
): Promise<PinnedResponse> {
  const { url, address, family } = safe;
  return new Promise((resolve, reject) => {
    const isHttps = url.protocol === 'https:';
    const port = url.port ? Number(url.port) : isHttps ? 443 : 80;
    const pinnedLookup = (_h: string, _o: object, cb: (err: Error | null, addr: string, fam: number) => void) =>
      cb(null, address, family);

    const requester = isHttps ? httpsRequest : httpRequest;
    const req = requester(
      {
        hostname: url.hostname,
        port,
        path: url.pathname + url.search,
        method: 'GET',
        headers: options.headers,
        lookup: pinnedLookup,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => {
          const buf = Buffer.concat(chunks);
          resolve({
            ok: (res.statusCode ?? 0) >= 200 && (res.statusCode ?? 0) < 300,
            status: res.statusCode ?? 0,
            getHeader: (name) => {
              const h = res.headers[name.toLowerCase()];
              return Array.isArray(h) ? h[0] : h;
            },
            buffer: () => Promise.resolve(buf),
          });
        });
        res.on('error', reject);
      },
    );
    req.on('error', reject);
    if (options.timeoutMs) req.setTimeout(options.timeoutMs, () => req.destroy(new Error('Request timeout')));
    req.end();
  });
}
