# Security Policy

## Supported Versions

Mise follows a rolling release model — only the latest commit on `main` is supported.

| Version | Supported |
| ------- | --------- |
| latest  | ✅        |
| older   | ❌        |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Use [GitHub Security Advisories](https://github.com/lopatnov/mise/security/advisories/new) to report a vulnerability privately. Include as much detail as possible:

- Steps to reproduce the vulnerability
- Potential impact (what an attacker could achieve)
- Suggested fix (if any)

Once submitted, you will receive a response within a few business days. If the vulnerability is confirmed, a fix will be released and you will be credited in the release notes (unless you prefer to remain anonymous).

## Security considerations for self-hosters

- Change `JWT_SECRET` to a long random string before deploying — use `openssl rand -hex 32`.
- The admin panel (`/admin`) requires an `admin` role — protect the `/setup` route after first use.
- Run behind a TLS-terminating reverse proxy (nginx, Caddy, Traefik) in production.
- Uploaded files are stored in `data/uploads/` — ensure the directory is not world-writable.

For general (non-security) bugs, please [open a regular issue](https://github.com/lopatnov/mise/issues).
