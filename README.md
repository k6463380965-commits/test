# Clef Transcriber

Clef Transcriber is a React + Vite + TypeScript app for uploading sheet music images, recognizing their notation, and rendering the result in a selected clef.

The uploaded score is analyzed by Gemini 3.8 Flash through Google's Gemini API, which returns structured pitches, durations, rests, and measures. VexFlow then engraves those recognized notes into a new score image; it does not reuse or redraw the input image. OMR may still misread handwritten, skewed, low-resolution, or complex notation, so compare the result with the source. The Gemini API key is server-only and must never use a `VITE_` prefix.

## Install

Requirements: Node.js 18 or newer.

```bash
npm install
```

## Run locally

```bash
npm run dev
```

Set `GEMINI_API_KEY` in `.env.local` before starting the dev server. On Vercel, add `GEMINI_API_KEY` as a server-side environment variable in the project settings. The image is sent to Google for music recognition.

Open the local URL shown by Vite. The upload system supports PNG, JPG, JPEG, and WEBP images up to 10 MB.

## Build

```bash
npm run build
```

The production files are generated in `dist/`.

## Deploy on Vercel

Import this repository into Vercel. The included `vercel.json` configures the Vite production build and routes requests to `index.html` for client-side navigation.

Vercel installs dependencies from `package.json`; the build command is `npm run build` and the output directory is `dist`. Add `GEMINI_API_KEY` as a server-side Vercel environment variable to enable recognition.

