# Clef Transcriber

Clef Transcriber is a React + Vite + TypeScript app for cropping a single staff from a sheet image, recognizing its notation with the self-hosted Oemer OMR engine, and rendering the result in a selected clef.

Oemer converts the cropped image to MusicXML. The local adapter maps that MusicXML to the existing score JSON contract, and VexFlow engraves the recognized notes into the selected clef. No generative AI provider or per-request inference token is used. Compare the output with the source: Oemer may misread handwritten, low-resolution, or complex notation. This first adapter supports one staff at a time.

## Install

Requirements: Node.js 18 or newer.

```bash
npm install
```

## Run locally

```bash
npm run dev
```

Copy `.env.example` to `.env.local` if needed. Start the Oemer sidecar in one terminal:

```bash
docker compose up --build omr
```

Then start the Vite app in another terminal:

```bash
npm run dev
```

The Docker image installs Oemer with the CPU ONNX Runtime and downloads the two model checkpoints during build. The service listens only on `127.0.0.1:8001` in the compose configuration. Development API responses include a `debug` field with the raw MusicXML and parsed score; production responses do not.

Open the local URL shown by Vite. The upload system supports PNG, JPG, JPEG, and WEBP images up to 10 MB.

## Build

```bash
npm run build
```

The production files are generated in `dist/`.

## Deploy on Vercel

Import this repository into Vercel. The included `vercel.json` configures the Vite production build and routes requests to `index.html` for client-side navigation.

Vercel installs dependencies from `package.json`; the build command is `npm run build` and the output directory is `dist`. Vercel cannot run the Oemer Java/Python sidecar inside the static Vite build. Deploy `omr-service` as a separate Docker service, expose it over HTTPS with authentication, and set `OMR_SERVICE_URL` and the matching `OMR_SERVICE_TOKEN` as server-side Vercel environment variables. Do not expose the development token publicly.

Oemer's MIT license and upstream project are documented at [BreezeWhite/oemer](https://github.com/BreezeWhite/oemer). Its first container build downloads pretrained checkpoints and can take several minutes.

