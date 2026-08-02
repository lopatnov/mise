import { isPrivateIp, isSsrfSafe } from './safe-http';

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

  it.each(['8.8.8.8', '1.1.1.1', '172.32.0.1', '172.15.0.1', '193.168.1.1', '2606:4700::1111'])('allows %s', (ip) => {
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
