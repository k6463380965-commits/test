import { unlink, readFile } from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import formidable from 'formidable';
import OpenAI, { toFile } from 'openai';

const CLEFS = ['treble', 'bass', 'alto', 'tenor'] as const;
const ACCEPTED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const MAX_FILE_SIZE = 10 * 1024 * 1024;

type Clef = typeof CLEFS[number];

function firstField(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function respondWithError(response: ServerResponse, status: number, message: string) {
  response.statusCode = status;
  response.setHeader('Content-Type', 'application/json');
  response.end(JSON.stringify({ error: message }));
}

export function createTranscriptionHandler(apiKey?: string) {
  return async (request: IncomingMessage, response: ServerResponse) => {
    if (request.method !== 'POST') {
      response.setHeader('Allow', 'POST');
      respondWithError(response, 405, 'Use POST to generate a sheet image.');
      return;
    }

    if (!apiKey) {
      respondWithError(response, 503, 'Set OPENAI_API_KEY on the server to enable image generation.');
      return;
    }

    let temporaryPath: string | undefined;
    try {
      const form = formidable({ maxFiles: 1, maxFileSize: MAX_FILE_SIZE, maxTotalFileSize: MAX_FILE_SIZE });
      const [fields, files] = await form.parse(request);
      const uploadedImage = Array.isArray(files.image) ? files.image[0] : files.image;
      temporaryPath = uploadedImage?.filepath;
      const sourceClef = firstField(fields.sourceClef);
      const targetClef = firstField(fields.targetClef);

      if (!uploadedImage || !sourceClef || !CLEFS.includes(sourceClef as Clef) || !targetClef || !CLEFS.includes(targetClef as Clef)) {
        respondWithError(response, 400, 'Upload an image and select valid source and target clefs.');
        return;
      }
      if (!uploadedImage.mimetype || !ACCEPTED_TYPES.has(uploadedImage.mimetype)) {
        respondWithError(response, 400, 'Use a PNG, JPG, JPEG, or WEBP image.');
        return;
      }

      const prompt = [
        'Redraw the uploaded image as a clean, conventional printed music score.',
        `The source clef is ${sourceClef}; replace it with a standard ${targetClef} clef symbol.`,
        'Preserve the original notes, their order, rhythm, accidentals, rests, and barlines as closely as possible.',
        'Keep the score black on white with five-line staves and standard music engraving. Do not write clef names as text or add decorative graphics.',
        'Return only the finished sheet music image.',
      ].join(' ');

      const openai = new OpenAI({ apiKey });
      const result = await openai.images.edit({
        model: 'gpt-image-1',
        image: await toFile(await readFile(uploadedImage.filepath), uploadedImage.originalFilename || 'sheet-music.png', {
          type: uploadedImage.mimetype,
        }),
        prompt,
        input_fidelity: 'high',
        output_format: 'png',
        quality: 'high',
      });

      const generatedImage = result.data?.[0]?.b64_json;
      if (!generatedImage) {
        respondWithError(response, 502, 'OpenAI did not return a generated image.');
        return;
      }

      response.statusCode = 200;
      response.setHeader('Content-Type', 'image/png');
      response.setHeader('Cache-Control', 'no-store');
      response.setHeader('Content-Disposition', 'inline; filename="transcribed-sheet.png"');
      response.end(Buffer.from(generatedImage, 'base64'));
    } catch (error) {
      const isRateLimited = error instanceof OpenAI.APIError && error.status === 429;
      console.error('OpenAI sheet image generation failed:', error instanceof Error ? error.message : 'Unknown error');
      respondWithError(
        response,
        isRateLimited ? 503 : 500,
        isRateLimited ? 'OpenAI image generation is temporarily rate-limited. Try again shortly.' : 'Image generation failed. Check the server key and try again.',
      );
    } finally {
      if (temporaryPath) await unlink(temporaryPath).catch(() => undefined);
    }
  };
}

export const config = { api: { bodyParser: false } };

export default function handler(request: IncomingMessage, response: ServerResponse) {
  return createTranscriptionHandler(process.env.OPENAI_API_KEY)(request, response);
}