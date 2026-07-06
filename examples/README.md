# Examples

This directory contains small, versioned examples for local validation and documentation. The files are intentionally synthetic so they can be redistributed with the repository.

Unless noted otherwise, the synthetic PNG fixtures in this directory are released by the Manga Translator Local authors under the Creative Commons Attribution 4.0 International license (CC BY 4.0).

## Files

- `synthetic-page-comic.png`: a generated, original comic/HQ-style page with two speech balloons.
- `synthetic-page-comic-2.png`: a generated, original comic/HQ-style page with two panels and the speech texts `OCR READY` and `CHECK BOXES`.
- `synthetic-page-comic-3.png`: a generated, original comic/HQ-style page with two panels and the speech texts `TRANSLATE THIS` and `EDIT LOCAL`.
- `SHA256SUMS`: checksums for the synthetic PNG fixtures.
- `expected-overlay-state.json`: a representative overlay-state payload after sanitization and persistence.

## Suggested use

Run the application, create an admin user, and upload one or more `synthetic-page-comic*.png` files as pages in a new section. The examples are also useful for UI screenshots and manual overlay-editing tests.

For direct endpoint experimentation:

```bash
curl -X POST \
  -F "file=@examples/synthetic-page-comic.png;type=image/png" \
  http://localhost:3080/api/translate/extract
```

The exact OCR output can change with model versions and runtime settings. Treat the example as a reproducible workflow fixture, not a benchmark for recognition accuracy.

To verify file integrity:

```bash
cd examples
sha256sum -c SHA256SUMS
```
