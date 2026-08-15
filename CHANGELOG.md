# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Security

- Upgraded `react-router-dom` 7.14.0 → 7.18.2, closing 8 known advisories including a high-severity (CVSS 8.1) unauthenticated remote code execution issue in `react-router`'s vendored `turbo-stream` deserialization (GHSA-49rj-9fvp-4h2h) — that specific advisory only affects apps running React Router's Framework Mode, which Mise's frontend doesn't use (it's a plain client-side SPA on Data Mode/`createBrowserRouter`), but the upgrade is applied regardless as routine hygiene.
- Fixed a high-severity arbitrary file read / SSRF vulnerability in the email-sending dependency (nodemailer), only patched in version 9.x (GHSA-p6gq-j5cr-w38f).
- Fixed a high-severity denial-of-service vulnerability in a transitive dependency of the API docs generator (js-yaml via @nestjs/swagger, GHSA-pm4m-ph32-ghv5).
- Recipe photo uploads now enforce the same image-type restriction (JPEG/PNG/WebP/GIF) already used elsewhere in the app; previously any file type could be uploaded and served back from the app's own origin.
- Bumped `nanoid` (transitive, via `vite`'s `postcss` dependency in `web/`) 3.3.16 → 3.3.18, closing a high-severity denial-of-service issue where custom nanoid generators could loop indefinitely when called with `size: 0` (GHSA-2v37-7h3g-55p8). Build-tooling only — not part of the shipped `web/dist` bundle and not reachable from any Mise code.
- Deferred (accepted risk) a high-severity `extract-zip` symlink path-traversal advisory (GHSA-jmr9-qjv8-65gv), reachable only transitively through `pa11y-ci`'s `puppeteer`/`@puppeteer/browsers` dependency chain — `pa11y-ci` is a `web/` devDependency used solely by the CI `test:a11y` accessibility scan (never shipped in `web/dist`, never imported by `web/src` or `api/`). No fixed version of `extract-zip` exists upstream (the advisory lists patched versions as "None"), and `pa11y-ci@4.1.1` — our current version — is already the latest release on npm. `npm audit fix --force`'s suggested remediation actually *downgrades* `pa11y-ci` to the 2+-year-old 3.1.0: verified in an isolated test that this neither closes the advisory (still reachable via an older `puppeteer`/`pa11y` chain) nor is otherwise safe, since it reintroduces two additional high-severity vulnerabilities absent from 4.1.1 (`lodash` prototype pollution/code injection, GHSA-r5fr-rjxr-66jc/GHSA-f23m-r3pf-42rh, and `semver` ReDoS, GHSA-c2qf-rxjj-qqgw). `extract-zip`'s vulnerable code path only executes once, transiently, during `npm ci`'s postinstall step, when puppeteer unpacks its own Chrome-for-Testing download fetched over HTTPS from Google's official CDN — not any zip content controlled by an untrusted actor reachable through Mise's own app or CI job; exploiting it would require an attacker to already control that download/CI network, a supply-chain compromise that's a bigger problem regardless of this specific CVE. Revisit once `extract-zip` ships an upstream fix.

### Fixed

- Recipe list/search pagination no longer accepts an unbounded page size (e.g. `?limit=0` previously returned the entire recipe collection in one response).
- Fixed a bug where viewing a recipe's steps could silently reorder them in a way that persisted incorrectly in some cases (cache mutation during render).
- Fixed duplicate ingredients with the same name not rendering correctly in the recipe detail view.
