import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import https, { type Server } from 'node:https';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import tls, { type TLSSocket } from 'node:tls';
import { fetchPinned, type SsrfSafeUrl } from './safe-http';

/**
 * Integration test against a real TLS server. Importing from allrecipes.com failed with HTTP 403 on every
 * request after the first until the API restarted; Node's shared https agent resumes the previous TLS session
 * on each later request, so repeat fetches did not look like the first one. This asserts the server never sees
 * a resumed session from fetchPinned, and a control proves the check would catch the shared agent doing it.
 *
 * The certificate is generated per run with openssl and trusted only for this file, so no key material is
 * committed and certificate validation stays on. Where openssl or tls.setDefaultCACertificates is missing the
 * suite is skipped locally, but never silently on CI.
 */
const canRun = (() => {
  try {
    execFileSync('openssl', ['version'], { stdio: 'ignore' });
    return typeof tls.setDefaultCACertificates === 'function';
  } catch {
    return false;
  }
})();
const describeTls = canRun ? describe : describe.skip;

it('can run the TLS session-resumption suite on CI', () => {
  if (process.env.CI) expect(canRun).toBe(true);
});

describeTls('fetchPinned over TLS', () => {
  let dir: string;
  let server: Server;
  let safe: SsrfSafeUrl;
  let originalCAs: string[];
  const resumed: boolean[] = [];

  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), 'mise-tls-'));
    execFileSync(
      'openssl',
      [
        ...['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1', '-subj', '/CN=localhost'],
        ...['-addext', 'subjectAltName=DNS:localhost'],
        ...['-keyout', join(dir, 'key.pem'), '-out', join(dir, 'cert.pem')],
      ],
      { stdio: 'ignore' },
    );
    const cert = readFileSync(join(dir, 'cert.pem'), 'utf8');

    originalCAs = tls.getCACertificates('default');
    tls.setDefaultCACertificates([...originalCAs, cert]);

    server = https.createServer({ key: readFileSync(join(dir, 'key.pem')), cert }, (req, res) => {
      resumed.push((req.socket as TLSSocket).isSessionReused());
      // Close after every response so the next request needs a new connection, as when imports are minutes
      // apart and no idle socket survives. Without this a keep-alive socket is reused and nothing is resumed.
      res.setHeader('Connection', 'close');
      res.end('ok');
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address() as { port: number };
    safe = { url: new URL(`https://localhost:${port}/`), address: '127.0.0.1', family: 4 };
  });

  // Guarded so a failure in beforeAll (e.g. openssl erroring) is not buried under a second error here.
  afterAll(async () => {
    if (originalCAs) tls.setDefaultCACertificates(originalCAs);
    if (server) await new Promise((resolve) => server.close(resolve));
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  beforeEach(() => {
    resumed.length = 0;
  });

  it('does a full TLS handshake on every fetch instead of resuming the previous session', async () => {
    for (let i = 0; i < 4; i++) {
      const res = await fetchPinned(safe);
      expect(res.ok).toBe(true);
      expect((await res.buffer()).toString()).toBe('ok');
    }

    expect(resumed).toEqual([false, false, false, false]);
  });

  it('control: the shared Node agent does resume the session, so the check above can detect it', async () => {
    const get = () =>
      new Promise<void>((resolve, reject) => {
        https
          .get(
            {
              host: '127.0.0.1',
              port: safe.url.port,
              servername: 'localhost',
              path: '/',
            },
            (res) => {
              res.resume();
              res.on('end', resolve);
            },
          )
          .on('error', reject);
      });

    await get();
    await get();

    expect(resumed).toEqual([false, true]);
  });
});
