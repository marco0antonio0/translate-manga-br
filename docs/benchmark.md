# Benchmark evidence and data policy

This document separates public benchmark material from private operational evidence. For JOSS submission, the reproducible benchmark must use synthetic, public-domain, or explicitly licensed pages. Copyright-restricted user-supplied manga pages must not be redistributed, named, included in the repository, or treated as a public reproducibility dataset.

The repository includes an internal observational export in `benchmarks/private-observational-2026-07-06.json`. This artifact is privacy-preserving and aggregate-only: it contains counts, statuses, timestamps, file sizes, and anonymized numeric section identifiers. OCR text, translated text, user names, emails, password hashes, API keys, overlay contents, manga titles, and page images were intentionally excluded.

This internal export can support engineering decisions and demonstrate that the software has processed non-trivial workloads. It is not sufficient as the public JOSS benchmark because the underlying images cannot be shared with reviewers.

## Environment

The private observational deployment ran on a CPU-only Debian virtual machine:

| Item | Value |
| --- | --- |
| Operating system | Debian GNU/Linux 13 (trixie) |
| Kernel | `6.12.94+deb13-amd64` |
| CPU | Common KVM processor |
| Logical CPUs | 6 |
| Memory | 7,105,288 KiB, approximately 6.78 GiB |
| Node.js | `v20.19.2` |
| OCR/detection execution provider | ONNX Runtime CPU provider |

The OCR runtime uses `onnxruntime-node` and `sharp`. The ONNX sessions are configured with `executionProviders: ['cpu']`, so the local detection and OCR path runs on CPU. Translation in this observed run used `openrouter:google/gemma-4-31b-it`, so provider latency is external to the local CPU OCR/detection path.

## Private Observational Dataset

The observed SQLite database contained one local user account and eight completed sections. The sections targeted Brazilian Portuguese (`pt-BR`) from automatic source-language detection. The source page images are non-redistributable user-supplied material and are not included in this repository.

| Metric | Value |
| --- | ---: |
| Sections | 8 |
| Page images | 478 |
| Completed page images | 476 |
| Failed page images | 2 |
| OCR items detected | 2,413 |
| OCR items with recognized text | 2,213 |
| OCR items with translated text | 2,213 |
| Stored data size | 394.45 MiB |
| SQLite database size | 954,368 bytes |

## Private Observational Results

The current schema records `created_at` and `updated_at`, but not dedicated `processing_started_at` and `processing_finished_at` timestamps. For this reason, the timing below is an observational workflow-duration proxy, not a controlled measurement of pure OCR latency.

| Metric | Value |
| --- | ---: |
| Completed sections with elapsed timing | 8 |
| Total pages in completed sections | 478 |
| Total OCR items in completed sections | 2,413 |
| Median seconds per page, section `created_at` to `updated_at` | 6.1167 |
| Mean seconds per page, section `created_at` to `updated_at` | 7.5681 |
| Median pages per minute, section `created_at` to `updated_at` | 9.8436 |
| Mean pages per minute, section `created_at` to `updated_at` | 8.7723 |
| Median OCR items per completed image | 5 |
| Mean OCR items per completed image | 5.0693 |
| Maximum OCR items in one completed image | 19 |

Per-section anonymized observations:

| Section ID | Pages | OCR items | OCR with text | OCR translated | Seconds/page | Pages/minute |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 23 | 52 | 250 | 241 | 241 | 6.4784 | 9.2615 |
| 24 | 62 | 283 | 272 | 272 | 10.9383 | 5.4853 |
| 25 | 63 | 241 | 229 | 229 | 8.4423 | 7.1070 |
| 26 | 61 | 277 | 264 | 264 | 5.5131 | 10.8832 |
| 27 | 61 | 391 | 384 | 384 | 5.2288 | 11.4749 |
| 30 | 57 | 318 | 246 | 246 | 5.7551 | 10.4256 |
| 32 | 63 | 394 | 350 | 350 | 5.5610 | 10.7895 |
| 33 | 59 | 259 | 227 | 227 | 12.6280 | 4.7513 |

## Reproducing the Aggregate Export

For a local database, run:

```bash
npm run benchmark:db -- storage/local.sqlite benchmarks/private-observational.json
```

The script reads the SQLite database in readonly mode and exports only aggregate or anonymized fields. It does not export OCR text, translated text, user identity data, session tokens, password hashes, API keys, overlay contents, manga titles, or images.

Do not commit exports from copyrighted or otherwise non-redistributable page sets unless they have been reviewed to contain only aggregate, anonymized metrics and no identifying corpus metadata.

## Public JOSS Benchmark Plan

The benchmark that should accompany a JOSS submission must be independently reproducible. The recommended public path is:

1. Use `examples/synthetic-page-comic*.png` and additional synthetic or licensed pages that contain visible speech balloons or text boxes.
2. Record the commit hash, Node.js version, model files, CPU details, concurrency settings, source/target language settings, and translation provider.
3. Report page count, OCR item count, elapsed time, pages per minute, failure count, and limitations.
4. Keep all benchmark inputs in the repository or in a cited public archive with a clear license.

Candidate public-domain sources must be visually inspected before inclusion. A source without speech balloons or text boxes is not representative enough for this project, even if it is legally reusable.

## Public Synthetic Benchmark

The current public benchmark uses three redistributable synthetic PNG pages from `examples/`:

- `examples/synthetic-page-comic.png`
- `examples/synthetic-page-comic-2.png`
- `examples/synthetic-page-comic-3.png`

The same input set was processed twice on the CPU-only benchmark deployment: section `37` with Google Translate and section `38` with OpenRouter (`google/gemma-4-31b-it`). The remote processed files match the local `examples/` files by SHA-256 checksum.

| Provider | Section | Pages | Failed pages | OCR items | OCR with text | OCR translated | Elapsed proxy | Seconds/page | Pages/minute |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Google Translate | 37 | 3 | 0 | 6 | 6 | 6 | 5.414 s | 1.8047 | 33.2471 |
| OpenRouter `google/gemma-4-31b-it` | 38 | 3 | 0 | 6 | 6 | 6 | 4.746 s | 1.5820 | 37.9267 |

The aggregate report is stored in `benchmarks/public-synthetic-sections-37-38-2026-07-06.json`. It excludes OCR text and translated text.

## Limitations

- The private observational metrics are from one deployment, not a controlled experiment with fixed public input images and repeated runs.
- Timing is derived from persisted `created_at`/`updated_at` values. The next schema improvement should add per-image OCR start, OCR finish, translation start, and translation finish timestamps.
- Translation used an external OpenRouter provider, so total workflow duration can include remote model and network latency.
- The CPU is reported by the virtualized host as `Common KVM processor`; physical CPU details were not exposed to the guest operating system.
- The private image corpus is not redistributed, named, or described. The current public reproducibility path uses the synthetic examples under `examples/`; the next benchmark corpus should add licensed or synthetic pages with speech balloons.
