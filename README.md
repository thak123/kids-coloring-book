# Coloring Book Fun
[Link](https://thak123.github.io/kids-coloring-book)
A kids' click-to-fill coloring book web app. Draw, upload, or AI-generate a
line-art picture, then color it in freestyle or with a step-by-step **Guide
Mode** that highlights the next spot and color to use.

Everything runs client-side (plain HTML/CSS/JS, no build step, no backend).
Pages you create are saved only in your own browser's `localStorage`.

**Export options** (no server involved — everything downloads straight to
your device):
- **💾 PNG**, on every page card in the gallery and inside the coloring
  canvas — downloads the picture as a plain image (blank line art from the
  gallery, or whatever's currently colored from `color.html`), ready to
  print or share.
- **Export JSON** (per page) / **Export all** (top nav) — downloads the raw
  page data, including its Guide Mode steps, so you can back it up or move
  it to another browser/device with the **Import** button.

## Running locally

Any static file server works, e.g.:

```bash
cd coloring-book-app
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

(Opening `index.html` directly via `file://` mostly works too, but some
browsers restrict `canvas.toDataURL`/localStorage under `file://`, so a local
server is recommended.)

## Deploying to GitHub Pages

1. Push this repo to GitHub.
2. In the repo settings, enable **Pages** → Source: deploy from branch →
   `main` / root.
3. Your site will be live at `https://<username>.github.io/<repo>/`.

No build step is required — it's plain static files.

## How it works

- **Flood fill** ([js/floodfill.js](js/floodfill.js)): clicking inside an
  outline fills the enclosed area, like a bucket tool, using a
  tolerance-based region grow so anti-aliased line art still fills cleanly.
- **Guide Mode**: each coloring page can carry an optional `guide.steps`
  array — an ordered list of `{x, y, color}` points (normalized 0–1
  coordinates + a target hex color). Guide Mode checks whether a click landed
  in the same enclosed region as the current step's point, and whether the
  selected color matches, before allowing the fill and advancing to the next
  step. Build guides yourself in the in-app **Guide Editor**
  ([author.html](author.html)).
- **Samples** ([js/samples.js](js/samples.js)): a few built-in pages drawn
  with plain Canvas calls (no image files) and shipped with ready-made
  guides.

## AI image generation

`generate.html` calls an image-generation model **directly from your
browser** — there's no server to hide an API key behind on GitHub Pages, so
whichever provider you pick, the request goes straight from the visitor's
browser to that provider. Configure it in the settings panel on that page;
your choice is saved only in your browser's `localStorage`.

### Option A — Local (recommended, no API key, uses your own GPU)

Uses [AUTOMATIC1111's Stable Diffusion WebUI](https://github.com/AUTOMATIC1111/stable-diffusion-webui)
running on your own machine (a 24GB GPU comfortably runs SDXL).

1. Install and launch it with its API enabled and CORS opened up for wherever
   this site is served from:

   ```bash
   ./webui.sh --api --cors-allow-origins=*
   ```

   (On Windows, add the same flags to `COMMANDLINE_ARGS` in `webui-user.bat`.
   For a tighter setup once things work, replace `*` with your actual Pages
   URL, e.g. `--cors-allow-origins=https://yourname.github.io`.)

2. Load any SD 1.5 or SDXL checkpoint in the WebUI (a general-purpose model
   is fine — the app's prompt already asks for "black and white line art,
   coloring book page, no shading").
3. In `generate.html`, choose **Local — AUTOMATIC1111**, leave the base URL
   as `http://127.0.0.1:7860` (or wherever your WebUI runs), and generate.

Browsers treat `http://127.0.0.1`/`http://localhost` as a trusted origin even
when the page itself is served over HTTPS (like GitHub Pages), so this works
without any extra proxy — the WebUI's CORS header is the only thing that
needs to allow it.

### Option B — Cloud APIs (OpenAI or Google Gemini)

Pick **OpenAI** or **Gemini** in the settings panel and paste your own API
key. The key is stored only in your browser and sent only to that provider.
This is fine for personal/single-user use; for a public multi-visitor site
you would not want to ask random visitors to paste a key you're billed for —
in that case put a small serverless proxy in front of the provider instead
and add it as the **Custom OpenAI-compatible endpoint** option.

Model/endpoint names for cloud providers change over time — if generation
fails, check the browser console for the exact error and adjust the model
name field in settings.

## Project structure

```
index.html      gallery / home page
create.html     draw-from-scratch tool
upload.html     upload + line-art cleanup
generate.html   AI generation + settings
color.html      the coloring canvas (free & guided modes)
author.html     guide editor
css/styles.css  shared styling
js/storage.js   localStorage CRUD for pages & settings
js/floodfill.js flood fill + region-match algorithm
js/imagePrep.js image loading + threshold cleanup
js/samples.js   built-in sample pages + their guides
```
