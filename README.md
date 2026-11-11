# Simple Impress Editor

[한국어 설명서](README.ko.md) · [Open the editor](https://jakalee.github.io/simpress/) · [Interactive feature showcase](https://jakalee.github.io/simpress/example/feature-showcase.html)

> A private, offline-first, single-file visual editor for impress.js presentations.

**No install. No account. No server.** Arrange content on an infinite canvas, connect frames into a presentation path, and export a standalone HTML file.

[![Simple Impress Editor demo video](https://img.youtube.com/vi/ab3UqkjCUUY/maxresdefault.jpg)](https://youtu.be/ab3UqkjCUUY)

▶ [Watch the demo on YouTube](https://youtu.be/ab3UqkjCUUY)

## Interactive feature showcase

[![SIMPress interactive feature showcase](example/preview.png)](https://jakalee.github.io/simpress/example/feature-showcase.html)

**[Launch the interactive showcase →](https://jakalee.github.io/simpress/example/feature-showcase.html)**

This presentation was built and exported with SIMPress itself. Rotate the live 3D product, change the dashboard product type and load slider, run the p5.js field simulation, switch to the whiteboard, and press `O` to see the full spatial presentation. See the [showcase guide](example/README.md) for controls and sample-asset credits.

## What you can do with it

- **Zooming, flying presentations as a single HTML file** — zoom, rotate and fly through 3D depth. Viewers just open it in a browser; nothing to install.
- **Let AI build the whole deck** — type a topic, get an outline from any AI chat (ChatGPT, Claude, Gemini…), and simpress builds templated slides with speaker notes. No API key, no server.
- **Live web pages inside slides** — p5.js simulations, maps, 3D plots or your own HTML apps run inside the slide and can be clicked and dragged mid-talk. They run live on the editing canvas too.
- **Spin CAD models in front of the audience** — drop in STEP, IGES, STL or GLB and orbit it with the mouse; hide or recolor individual parts.
- **Copy from Excel → paste → animated chart** — paste a range straight into one of 8 SVG chart types.
- **Paste from anywhere** — screenshots, web images, and shapes or drawings copied from Apple Freeform or Keynote come in with ⌘V (pasted as images).
- **Multilingual with one click** — every word in the exported HTML is real text, so Chrome's page translation turns the whole presentation into English, Japanese, Chinese or any other language. Send the same file to an international audience.
- **Presenter console** — notes, current/next slide and a timer in a separate window; presentation clickers (PageUp/PageDown) work.
- **PDF handouts too** — one slide per page, text stays vector.
- **Nothing leaves your machine** — no account, no upload; everything is stored in your browser.

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
- 7 slide layouts (cover, section, bullets, two columns, image + text, closing, blank) and 5 deck templates combining theme, frame style, and canvas arrangement (row, grid, radial zoom, 3D stairs)
- AI deck builder — describe a topic, copy the prompt into any AI chat, paste back the JSON outline, and get slides with speaker notes built from a template (no server or API key)
- 24 shapes (polygons, stars, donuts, arrows, callouts, flowchart) with text inside
- Tables with in-place cell editing, Tab navigation, and row/column controls
- 8 SVG chart types — paste ranges from Excel, automatic thinning of large data, entrance animation
- Connectors that follow their objects (straight, elbow, curved) and a freehand pen
- Interactions — hover effects, click actions (go to slide, open link, show/hide, run JavaScript), entrance effects
- 3D models — import GLB, glTF, STL, OBJ, and CAD (STEP, IGES); live rendering in the presentation (auto-rotate, orbit, animation) with per-part visibility and color. three.js and the CAD converter load on demand from version-pinned CDNs; without internet a snapshot image is shown instead
- Web embeds — a self-contained HTML file (stored in the document) or a URL inside a slide; sandboxed, shown running on the editing canvas and in overview, and directly clickable during the talk. Heavy pages can be set to "run only when visible"; if a library cannot load (offline), the embed falls back to a placeholder. Includes p5.js examples (pendulum, waves, particles, 3-phase rotating field)
- PDF import — open a PDF saved from PowerPoint or Keynote and every page becomes a slide (rendered at 4K so it stays sharp on Retina screens; path connected automatically)
- Embeds, videos and 3D models are inserted filling the current slide; a "fill slide" button; optional hidden video controls
- Paste images from the clipboard (screenshots, shapes copied from Apple Freeform or Keynote) with ⌘V
- Multilingual viewing — exported HTML is real text, so browser page translation (e.g. Chrome) can show it in any language

## AI deck-building skill

[`skill/simpress-deck`](skill/simpress-deck/) is an agent skill: give it a brief and your source files (pptx, pdf, svg, video) and it builds a polished simpress deck (presentation HTML + editable JSON). See the [guide (Korean)](skill/simpress-deck/README.md) for installing it in Claude, Claude Code or other agents.

## Privacy and portability

Presentation data is stored in the browser and is not uploaded by this project. Using 3D models (three.js, CAD converter) or the p5.js examples downloads those libraries from the jsDelivr CDN (no document content is sent). Clearing browser data also clears the autosaved document, so export important work as JSON.

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
