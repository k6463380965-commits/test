# Clef Transcriber

Clef Transcriber is a React + Vite + TypeScript app for uploading sheet music images, selecting source and target clefs, and requesting a new score image from OpenAI Images (`gpt-image-1`).

The image is sent to OpenAI through a server-side endpoint. Generative image models may alter notes or notation, so review generated scores before using them; exact musical transcription is not guaranteed. The API key is read only by the server and must never use a `VITE_` prefix.

## Install

Requirements: Node.js 18 or newer.

```bash
npm install
```

## Run locally

```bash
npm run dev
```

Set `OPENAI_API_KEY` in `.env.local` before starting the dev server. On Vercel, add `OPENAI_API_KEY` as a server-side environment variable in the project settings. The image is sent to OpenAI for generation.

Open the local URL shown by Vite. The upload system supports PNG, JPG, JPEG, and WEBP images up to 10 MB.

## Build

```bash
npm run build
```

The production files are generated in `dist/`.

## Deploy on Vercel

Import this repository into Vercel. The included `vercel.json` configures the Vite production build and routes requests to `index.html` for client-side navigation.

Vercel installs dependencies from `package.json`; the build command is `npm run build` and the output directory is `dist`. Add `OPENAI_API_KEY` as a server-side Vercel environment variable to enable generation.

