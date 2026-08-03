# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Security

- Fixed a high-severity (CVSS 8.1) unauthenticated remote code execution vulnerability in `react-router-dom`'s vendored `turbo-stream` deserialization, along with 7 other advisories, by upgrading 7.14.0 → 7.18.2 (GHSA-49rj-9fvp-4h2h and related).
- Fixed a high-severity arbitrary file read / SSRF vulnerability in the email-sending dependency (nodemailer), only patched in version 9.x (GHSA-p6gq-j5cr-w38f).
- Fixed a high-severity denial-of-service vulnerability in a transitive dependency of the API docs generator (js-yaml via @nestjs/swagger, GHSA-pm4m-ph32-ghv5).
- Recipe photo uploads now enforce the same image-type restriction (JPEG/PNG/WebP/GIF) already used elsewhere in the app; previously any file type could be uploaded and served back from the app's own origin.

### Fixed

- Recipe list/search pagination no longer accepts an unbounded page size (e.g. `?limit=0` previously returned the entire recipe collection in one response).
- Fixed a bug where viewing a recipe's steps could silently reorder them in a way that persisted incorrectly in some cases (cache mutation during render).
- Fixed duplicate ingredients with the same name not rendering correctly in the recipe detail view.
