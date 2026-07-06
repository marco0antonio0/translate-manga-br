# JOSS readiness checklist

This document tracks what is already present in the repository and what should be completed before submitting Manga Translator Local to the Journal of Open Source Software (JOSS).

## Current status

Do not submit yet. The repository now has the core submission scaffolding, but JOSS currently expects more than a technically working codebase. The main blockers are public development history, research-use evidence, and stronger reproducible evaluation material.

## Completed

- OSI-approved license: `LICENSE` uses the standard MIT license text.
- Public repository metadata: `README.md`, `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, and issue/PR templates.
- CI: `.github/workflows/ci.yml` runs typecheck, lint, tests, and build.
- Dependency maintenance: `.github/dependabot.yml` covers npm and GitHub Actions.
- Package manager consolidation: `npm`, `package-lock.json`, and `npm ci`.
- Initial automated tests: `tests/`.
- Reproducibility guide: `docs/reproducibility.md`.
- Synthetic example material: `examples/`, including original generated comic/HQ-style PNG fixtures.
- Initial public synthetic benchmark report: `benchmarks/public-synthetic-sections-37-38-2026-07-06.json`.
- Initial private observational benchmark policy and aggregate export: `docs/benchmark.md` and `benchmarks/private-observational-2026-07-06.json`.

## Required before submission

- Public development history spanning at least six months, with development distributed over time.
- Evidence of research use or credible scholarly impact, such as benchmark reports, documented research workflows, external users, or integration into a study.
- A tagged release intended for review.
- Archived release DOI from Zenodo, Figshare, or another accepted archival service.
- Final confirmation of author order, laboratory affiliation metadata, and citation metadata before submission.
- A larger controlled public benchmark run using synthetic pages or a licensed/public-domain comic corpus with visible speech balloons or text boxes. Private, copyright-restricted, or otherwise non-redistributable page sets must not be used as the reproducibility dataset for JOSS.
- More tests around the processing pipeline, SQLite repositories, and route handlers.

## Strongly recommended

- A `CHANGELOG.md` with release notes.
- A `docs/benchmark.md` report with hardware, dataset, parameters, throughput, and limitations.
- More public issues that document design decisions and known limitations.
- At least one independent user trying the installation instructions and opening feedback.
- Optional JOSS paper compilation workflow using the Open Journals action.

## Submission notes

JOSS review criteria currently emphasize research impact, sustained open development, tests, documentation, and local testability for web-based software. Manga Translator Local should be framed as a local-first research/prototyping framework for manga translation workflows, not as a claim of state-of-the-art translation quality.
