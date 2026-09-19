# Clef Transcriber

Clef Transcriber is a simple React + Vite + TypeScript MVP for uploading sheet music images, previewing them locally, selecting source and target clefs, and preparing for future transcription work.

This version intentionally does **not** perform music recognition, OCR, OMR, note detection, or clef conversion. The Transcribe button only displays `Transcription coming soon.` when an image is selected.

## Install

Requirements: Node.js 18 or newer.

```bash
npm install
```

## Run locally

```bash
npm run dev
```

Open the local URL shown by Vite. The upload system supports PNG, JPG, JPEG, and WEBP files up to 10 MB. Images are previewed with browser object URLs and are never uploaded.

## Build

```bash
npm run build
```

The production files are generated in `dist/`.

## Deploy on Render free

The included `render.yaml` configures a Render Static Site:

- Build command: `npm install && npm run build`
- Publish directory: `dist`

Create a new Blueprint from this repository in Render, or create a Static Site manually with those same settings. No backend, database, or environment variables are needed for this MVP.

