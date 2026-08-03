import { createServer, type Server } from 'node:http';
import { fetchPinned, isPrivateIp, isSsrfSafe, type SsrfSafeUrl } from './safe-http';

describe('isPrivateIp', () => {
  it.each([
    'localhost',
    '0.0.0.0',
    '127.0.0.1',
    '127.10.0.5',
    '10.0.0.1',
    '172.16.0.1',
    '172.31.255.255',
    '192.168.1.1',
    '::1',
    '0:0:0:0:0:0:0:1',
    '[::1]',
    'fc00::1',
    'fd12:3456::1',
    '169.254.169.254',
  ])('rejects %s', (ip) => {
    expect(isPrivateIp(ip)).toBe(true);
  });

  it.each([
    'fe80::1',
    '169.254.1.1',
    '::ffff:127.0.0.1',
    '::ffff:10.0.0.1',
    '100.64.0.1',
    '100.127.255.255',
    '0.1.2.3',
  ])('rejects %s', (ip) => {
    expect(isPrivateIp(ip)).toBe(true);
  });

  it.each([
    '8.8.8.8',
    '1.1.1.1',
    '172.32.0.1',
    '172.15.0.1',
    '193.168.1.1',
    '2606:4700::1111',
    '100.63.255.255',
    '100.128.0.1',
  ])('allows %s', (ip) => {
    expect(isPrivateIp(ip)).toBe(false);
  });
});

describe('isSsrfSafe', () => {
  it('rejects a malformed URL', async () => {
    await expect(isSsrfSafe('not a url')).resolves.toBe(false);
  });

  it.each(['file:///etc/passwd', 'ftp://example.com/x', 'gopher://example.com'])(
    'rejects the %s scheme',
    async (url) => {
      await expect(isSsrfSafe(url)).resolves.toBe(false);
    },
  );

  // Resolves through the hosts file, so no network is needed
  it('rejects a hostname resolving to a loopback address', async () => {
    await expect(isSsrfSafe('http://localhost/admin')).resolves.toBe(false);
  });
});

describe('fetchPinned', () => {
  let servers: Server[] = [];

  afterEach(async () => {
    await Promise.all(servers.map((s) => new Promise<void>((resolve) => s.close(() => resolve()))));
    servers = [];
  });

  function listen(
    handler: (req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse) => void,
  ): Promise<SsrfSafeUrl> {
    const created = createServer(handler);
    servers.push(created);
    return new Promise((resolve) => {
      created.listen(0, '127.0.0.1', () => {
        const { port } = created.address() as { port: number };
        resolve({ url: new URL(`http://127.0.0.1:${port}/`), address: '127.0.0.1', family: 4 });
      });
    });
  }

  it('resolves the full body when under the size cap', async () => {
    const safe = await listen((_req, res) => res.end('hello'));

    const res = await fetchPinned(safe, { maxBytes: 1024 });

    await expect(res.buffer()).resolves.toEqual(Buffer.from('hello'));
  });

  it('rejects a response that exceeds maxBytes instead of buffering it in full', async () => {
    const safe = await listen((_req, res) => res.end('x'.repeat(1024)));

    await expect(fetchPinned(safe, { maxBytes: 10 })).rejects.toThrow();
  });

  it('connects to the pinned address, ignoring wherever the URL hostname would actually resolve', async () => {
    let receivedHost: string | undefined;
    const safe = await listen((req, res) => {
      receivedHost = req.headers.host;
      res.end('ok');
    });
    const pinnedToLocalServer: SsrfSafeUrl = {
      url: new URL(`http://example.com:${safe.url.port}/`),
      address: '127.0.0.1',
      family: 4,
    };

    await fetchPinned(pinnedToLocalServer);

    expect(receivedHost).toBe(`example.com:${safe.url.port}`);
  });

  // A redirect to any address this test suite can stand up is necessarily loopback, which the SSRF
  // guard must (and does, see below) reject as a redirect target just like a top-level request —
  // so the successful-follow path isn't unit-testable without a live public endpoint. Covered instead
  // by the two behaviors below: rejection is real end-to-end, and non-following is independent of it.
  it('rejects a redirect whose target fails the SSRF guard', async () => {
    const entry = await listen((_req, res) => {
      res.writeHead(302, { location: 'http://169.254.169.254/latest/meta-data' });
      res.end();
    });

    await expect(fetchPinned(entry)).rejects.toThrow(/not an allowed URL/);
  });

  it('does not attempt to follow a redirect once maxRedirects is exhausted', async () => {
    const entry = await listen((_req, res) => {
      res.writeHead(301, { location: 'http://127.0.0.1:9/' });
      res.end();
    });

    const res = await fetchPinned(entry, { maxRedirects: 0 });

    expect(res.status).toBe(301);
  });
});
