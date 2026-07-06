# Reproducibility guide

This guide describes how a reviewer can install, validate, and exercise Manga Translator Local on a local machine.

## Environment

Recommended baseline:

- Node.js 20 or newer
- npm 10 or newer
- Git LFS, so files under `models/` are available
- Linux x86_64 for the native dependencies used by `sharp`, `better-sqlite3`, and `onnxruntime-node`

Docker Compose can also be used for application-level validation.

## Fresh checkout

```bash
git clone https://github.com/marco0antonio0/translate-manga-br.git
cd translate-manga-br
git lfs pull
npm ci
```

## Automated validation

```bash
npm audit --audit-level=moderate
npm run typecheck
npm run lint
npm test
npm run build
```

`npm run lint` may report warnings while still returning success. Warnings currently document remaining cleanup work such as unused imports and candidate `<img>` replacements.

## Local application run

```bash
npm run dev
```

Open <http://localhost:3080/setup> on first run and create an administrator user. Generated data are written under `storage/`, which is intentionally not versioned.

## Synthetic examples

The `examples/` directory contains synthetic material that can be used without copyrighted manga pages. The current fixtures are `examples/synthetic-page-comic.png`, `examples/synthetic-page-comic-2.png`, and `examples/synthetic-page-comic-3.png`, original generated comic/HQ-style pages with large speech balloons or text boxes.

```bash
ls examples
```

After starting the application, the synthetic page can be submitted through the UI or with an HTTP request:

```bash
curl -X POST \
  -F "file=@examples/synthetic-page-comic.png;type=image/png" \
  http://localhost:3080/api/translate/extract
```

The output of the OCR model is model- and version-dependent. Use `examples/expected-overlay-state.json` as a stable example of the persisted overlay state shape rather than as a strict OCR accuracy oracle.

To verify the example image checksums:

```bash
cd examples
sha256sum -c SHA256SUMS
```

The current public aggregate benchmark report for three synthetic pages is `benchmarks/public-synthetic-sections-37-38-2026-07-06.json`.

## Docker validation

```bash
docker compose up -d --build
curl http://localhost:3080/api/setup/status
docker compose down
```

## Reproducibility boundaries

- Google Translate and OpenRouter require network access.
- OpenRouter requires an API key configured by an administrator.
- OCR and detection quality depend on the ONNX model files in `models/`.
- The synthetic example verifies the workflow shape and local file handling, not model quality on real manga pages.
- For research evaluation, create a benchmark set with visible speech balloons or text boxes, explicit image licenses, and recorded hardware, runtime parameters, model versions, and commit hash.
