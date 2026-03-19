# Contributions Welcome

Thanks for your interest in contributing to **Mise**! Contributing to open source can be a rewarding way to learn, share knowledge, and build experience. We are glad you are here.

## Table of Contents

1. [Types of Contributions](#types-of-contributions)
1. [Ground Rules & Expectations](#ground-rules--expectations)
1. [How to Contribute](#how-to-contribute)

---

## Types of Contributions

You do not have to contribute code to make a difference. Here are some ways you can help:

### Developers can:

- Pick an [open issue][issues] and work on it.
- Fix bugs in the NestJS API or React frontend.
- Implement features from the [Phase 9 backlog](./CLAUDE.md).
- Improve the Docker setup, CI workflow, or nginx configuration.

### Writers can:

- Fix or improve the documentation.
- Add troubleshooting tips to the README.
- Improve inline code comments.

### Testers can:

- Report reproducible bugs with clear steps.
- Verify that open issues are still present or have been resolved.

### Supporters can:

- Answer questions in [Discussions][discussions].
- Help triage issues — identify duplicates, ask for clarification.

---

## Ground Rules & Expectations

Please read the [Code of Conduct][code-of-conduct] before contributing. By participating in this project you agree to uphold its standards.

---

## How to Contribute

If you have an idea, first search [open issues][issues] and [pull requests][pull-requests] to see if it has already been discussed.

If it has not:

- **Minor change** _(typo, doc fix)_: open a pull request directly.
- **Major change** _(new feature, API change, dependency upgrade)_: open an issue first to discuss the approach.

### Step-by-step workflow

1. Fork the repository by clicking **Fork** on GitHub.

1. Clone your fork locally:

   ```bash
   git clone https://github.com/<YOUR-USERNAME>/mise.git
   cd mise
   ```

1. Add the upstream remote so you can sync changes:

   ```bash
   git remote add upstream https://github.com/lopatnov/mise
   ```

1. Sync your local `main` branch with upstream:

   ```bash
   git checkout main
   git pull upstream main && git push origin main
   ```

1. Create a feature branch from `main`:

   ```bash
   git checkout -b feature/your-feature-name
   ```

1. Start the development environment (MongoDB first, then API, then frontend):

   ```bash
   # Terminal 1 — MongoDB
   docker compose up -d

   # Terminal 2 — API (port 3000)
   cd api && npm install && npm run start:dev

   # Terminal 3 — Frontend (port 4200)
   cd web && npm install && npm run dev
   ```

1. Make your changes.

1. Verify everything still works:

   ```bash
   # Unit tests (26 tests)
   cd api && npm test

   # API build
   cd api && npm run build

   # Frontend build
   cd web && npm run build
   ```

1. Commit your changes using the conventional prefix format:

   ```bash
   git commit -m "feat: add recipe duplicate button"
   # Prefixes: feat: | fix: | chore: | docs: | test: | refactor:
   ```

1. Push your branch and open a pull request:

   ```bash
   git push -u origin feature/your-feature-name
   ```

1. Respond to any review comments and push follow-up commits if needed.

1. Once merged, delete your branch and sync your fork.

Happy contributing!

[code-of-conduct]: ./CODE_OF_CONDUCT.md
[issues]: https://github.com/lopatnov/mise/issues
[discussions]: https://github.com/lopatnov/mise/discussions
[pull-requests]: https://github.com/lopatnov/mise/pulls
