# Simple Impress Editor

[한국어](README.ko.md) · [Live demo](https://jakalee.github.io/simpress/) · [Download the latest release](https://github.com/jakalee/simpress/releases/latest)

> A private, offline-first, single-file visual editor for impress.js presentations.

**No install. No account. No server.** Arrange content on an infinite canvas, connect frames into a presentation path, and export a standalone HTML file.

[![Simple Impress Editor demo](assets/demo.gif)](https://jakalee.github.io/simpress/)

## Why

- **Private by default** — your presentation stays in your browser.
- **Zero setup** — open `index.html`; there is no package install or build step.
- **Visual 3D editing** — move, scale, rotate, and place objects in depth.
- **Portable output** — export a presentation as one self-contained HTML file.

## Try it

1. Open the [live demo](https://jakalee.github.io/simpress/) or download [`index.html`](index.html).
2. Add text, images, shapes, frames, and videos to the canvas.
3. Connect objects into a path, preview the presentation, and select **Export HTML**.

## Features

- Infinite canvas with pan and zoom
- Frames and presentation-path editing
- Visual move, resize, rotate, X/Y tilt, and Z-depth controls
- Text, images, shapes, local video, and YouTube links
- Presenter notes, slide navigator, and progress indicator
- Autosave, undo/redo, and JSON import/export
- Standalone HTML export with embedded local assets
- PDF export, one page per slide (vector text; 3D models as snapshots)
- Menu bar (File, Edit, Insert, Slide, Layer, View, Help) and a shortcut sheet (`?`)
- 16:9 slides (add, duplicate, delete, reorder) and a layer panel (stacking order, lock, hide)
- 24 shapes (polygons, stars, donuts, arrows, callouts, flowchart) with text inside
- Tables with in-place cell editing, Tab navigation, and row/column controls
- 8 SVG chart types — paste ranges from Excel, automatic thinning of large data, entrance animation
- Connectors that follow their objects (straight, elbow, curved) and a freehand pen
- Interactions — hover effects, click actions (go to slide, open link, show/hide, run JavaScript), entrance effects
- 3D models — import GLB, glTF, STL, OBJ, and CAD (STEP, IGES); live rendering in the presentation (auto-rotate, orbit, animation) with per-part visibility and color. three.js and the CAD converter load on demand from version-pinned CDNs; without internet a snapshot image is shown instead

## Privacy and portability

Presentation data is stored in the browser and is not uploaded by this project. Clearing browser data also clears the autosaved document, so export important work as JSON.

Exported presentations include the required impress.js MIT notice. Local assets are embedded in the exported file. YouTube playback and thumbnails still require an internet connection.

Users are responsible for the rights to images, videos, fonts, and other content they add or redistribute.

## Browser support

Simple Impress Editor targets modern desktop browsers. Chrome, Edge, Safari, and Firefox are recommended. Mobile editing is not currently optimized.

## Project structure

The editor and impress.js runtime are bundled in [`index.html`](index.html) so the project can run without a server or build tool.

`index.html` is generated from `src/` (editor code) and `vendor/impress.js`. To change the code, edit `src/` and run `python3 build.py`; direct edits to `index.html` are overwritten by the next build.

Click-to-run JavaScript is never executed in the editor, and opening someone else's file asks whether to keep its code. Exported HTML runs that code in whatever browser opens it, so treat presentation files from unknown sources with care.

Contributions, bug reports, and feature requests are welcome through [Issues](https://github.com/jakalee/simpress/issues) and pull requests.

## Development

Developed with assistance from [Claude Code](https://www.anthropic.com/claude-code). Final review, integration, and maintenance are performed by the project owner.

## License and credits

Simple Impress Editor is released under the [MIT License](LICENSE). User-created content is not covered by the project license.

It bundles [impress.js 2.0.0](https://github.com/impress/impress.js). See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for copyright and license details.
