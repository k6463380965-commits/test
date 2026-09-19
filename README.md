# Fried0

A small, dependency-free news analysis page. It runs as a static site, so it needs no build command, server runtime, database, or API key.

## Run locally

Open `index.html` directly, or run:

```bash
python3 -m http.server 4173
```

Then visit `http://localhost:4173`.

## Deploy on Render free

This repository includes `render.yaml`, so Render can detect the static-site configuration automatically when you create a Blueprint. You can also create a **Static Site** manually:

1. Create a new **Static Site** from this repository.
2. Set **Build Command** to empty.
3. Set **Publish Directory** to `.`.
4. Deploy.

The sample stories live in `app.js`. Fried0 answers questions from that local story set and links to each publication's article section. To make the feed live later, replace the local `stories` array with a small server-side RSS/API proxy; browser-only RSS requests are commonly blocked by CORS.
