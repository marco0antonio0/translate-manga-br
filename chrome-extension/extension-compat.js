// Firefox exposes the Promise-based WebExtensions API as `browser`.
// The extension code uses `chrome` because Chrome is the primary target.
if (typeof globalThis.browser !== 'undefined') {
  globalThis.chrome = globalThis.browser
}
