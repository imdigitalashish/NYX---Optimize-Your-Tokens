# vendored renderer
`nyx-render.bundle.js` is the runtime — a single pure-JS ESM bundle (glyph atlases +
PNG encoder + layout) built from `src/*.ts` (MIT). No native deps, no network.
Rebuild: esbuild src/render.ts --bundle --format=esm --outfile=nyx-render.bundle.js
