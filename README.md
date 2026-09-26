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

## Deploy on Vercel

Import this repository into Vercel. The included `vercel.json` configures the Vite production build and routes requests to `index.html` for client-side navigation.

Vercel installs dependencies from `package.json`; the build command is `npm run build` and the output directory is `dist`. No backend, database, or environment variables are needed for this MVP.

