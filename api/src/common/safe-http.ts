import { lookup as dnsLookup } from 'node:dns/promises';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';

/** Return true if the address is private/internal and must never be reachable from user input */
export function isPrivateIp(ip: string): boolean {
  const h = ip.toLowerCase().replace(/^\[|\]$/g, '');
  // Unwrap IPv4-mapped IPv6 (::ffff:127.0.0.1) before the IPv4 checks below
  const v4 = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(h)?.[1] ?? h;
  if (h === 'localhost' || v4 === '0.0.0.0') return true;
  if (v4.startsWith('127.') || v4.startsWith('0.')) return true;
  if (v4.startsWith('10.')) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(v4)) return true;
  if (v4.startsWith('192.168.')) return true;
  if (v4.startsWith('169.254.')) return true;
  if (/^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(v4)) return true;
  if (h === '::1' || h === '0:0:0:0:0:0:0:1') return true;
  if (/^f[cd]/i.test(h)) return true;
  if (/^fe[89ab]/i.test(h)) return true;
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
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

export function fetchPinned(
  safe: SsrfSafeUrl,
  options: { headers?: Record<string, string>; timeoutMs?: number; maxBytes?: number; maxRedirects?: number } = {},
): Promise<PinnedResponse> {
  const { url, address, family } = safe;
  const maxRedirects = options.maxRedirects ?? 5;
  return new Promise((resolve, reject) => {
    const isHttps = url.protocol === 'https:';
    const defaultPort = isHttps ? 443 : 80;
    const port = url.port ? Number(url.port) : defaultPort;
    // Node calls this with options.all: true for some hostnames (Happy Eyeballs), which expects
    // an array-of-results callback instead of the single (err, address, family) form.
    const pinnedLookup = (
      _h: string,
      lookupOptions: { all?: boolean },
      cb: (err: Error | null, addr: string | { address: string; family: number }[], fam?: number) => void,
    ) => {
      if (lookupOptions?.all) cb(null, [{ address, family }]);
      else cb(null, address, family);
    };

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
        const status = res.statusCode ?? 0;
        const location = res.headers.location;
        if (REDIRECT_STATUSES.has(status) && location && maxRedirects > 0) {
          res.resume(); // discard this response's body, we're following the redirect instead
          const target = new URL(location, url).toString();
          isSsrfSafe(target).then((nextSafe) => {
            if (!nextSafe) {
              reject(new Error(`Redirect target is not an allowed URL: ${target}`));
              return;
            }
            fetchPinned(nextSafe, { ...options, maxRedirects: maxRedirects - 1 }).then(resolve, reject);
          }, reject);
          return;
        }
        const chunks: Buffer[] = [];
        let receivedBytes = 0;
        res.on('data', (chunk: Buffer) => {
          receivedBytes += chunk.length;
          if (options.maxBytes && receivedBytes > options.maxBytes) {
            req.destroy();
            reject(new Error('Response exceeded maximum allowed size'));
            return;
          }
          chunks.push(chunk);
        });
        res.on('end', () => {
          const buf = Buffer.concat(chunks);
          resolve({
            ok: status >= 200 && status < 300,
            status,
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
