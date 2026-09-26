import { unlink, readFile } from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import formidable from 'formidable';

const CLEFS = ['treble', 'bass', 'alto', 'tenor'] as const;
const ACCEPTED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const DURATION_VALUES = new Set([
  'whole', 'half', 'quarter', 'eighth', 'sixteenth', 'thirty_second', 'sixty_fourth',
  'dotted_whole', 'dotted_half', 'dotted_quarter', 'dotted_eighth', 'dotted_sixteenth', 'dotted_thirty_second', 'dotted_sixty_fourth',
]);

type Clef = typeof CLEFS[number];

function firstField(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function respondWithError(response: ServerResponse, status: number, message: string) {
  response.statusCode = status;
  response.setHeader('Content-Type', 'application/json');
  response.end(JSON.stringify({ error: message }));
}

type NoteEvent = {
  pitches: string[];
  duration: string;
  rest: boolean;
};

type ScoreTranscription = {
  timeSignature: string;
  measures: { notes: NoteEvent[] }[];
};

function isScoreTranscription(value: unknown): value is ScoreTranscription {
  if (!value || typeof value !== 'object') return false;
  const score = value as Partial<ScoreTranscription>;
  if (typeof score.timeSignature !== 'string' || !/^\d{1,2}\/\d{1,2}$/.test(score.timeSignature)) return false;
  if (!Array.isArray(score.measures) || score.measures.length === 0 || score.measures.length > 128) return false;

  return score.measures.every((measure) => Array.isArray(measure.notes) && measure.notes.length <= 32 && measure.notes.every((note) =>
    Array.isArray(note.pitches) && note.pitches.length <= 8 && typeof note.duration === 'string' && DURATION_VALUES.has(note.duration) &&
    typeof note.rest === 'boolean' && note.pitches.every((pitch) => typeof pitch === 'string' && /^[A-G](?:#{1,2}|B{1,2})?-?\d+$/.test(pitch)) &&
    (note.rest || note.pitches.length > 0),
  ));
}

export function createTranscriptionHandler(
  serviceUrl?: string,
  serviceToken?: string,
  includeDebug = process.env.NODE_ENV !== 'production',
) {
  return async (request: IncomingMessage, response: ServerResponse) => {
    if (request.method !== 'POST') {
      response.setHeader('Allow', 'POST');
      respondWithError(response, 405, 'Use POST to generate a sheet image.');
      return;
    }

    if (!serviceUrl || !serviceToken) {
      respondWithError(response, 503, 'Set OMR_SERVICE_URL and OMR_SERVICE_TOKEN on the server to enable local music recognition.');
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

      const imageData = await readFile(uploadedImage.filepath);
      const serviceForm = new FormData();
      serviceForm.append('file', new Blob([imageData], { type: uploadedImage.mimetype }), uploadedImage.originalFilename || 'score.png');
      serviceForm.append('source_clef', sourceClef);
      const endpoint = `${serviceUrl.replace(/\/+$/, '')}/transcribe`;
      const serviceResponse = await fetch(endpoint, {
        method: 'POST',
        headers: { Authorization: `Bearer ${serviceToken}` },
        body: serviceForm,
        signal: AbortSignal.timeout(285_000),
      });

      const serviceResult = await serviceResponse.json().catch(() => null) as {
        detail?: string;
        transcription?: unknown;
        musicXml?: string;
      } | null;
      if (!serviceResponse.ok) {
        const status = serviceResponse.status === 401 ? 503 : serviceResponse.status;
        const message = serviceResult?.detail || 'The local OMR service could not process this crop.';
        respondWithError(response, status, message);
        return;
      }

      const transcription = serviceResult?.transcription;
      if (!isScoreTranscription(transcription)) {
        respondWithError(response, 502, 'The local OMR service returned an invalid score structure.');
        return;
      }
      response.statusCode = 200;
      response.setHeader('Content-Type', 'application/json');
      response.setHeader('Cache-Control', 'no-store');
      response.end(JSON.stringify(includeDebug
        ? { ...transcription, debug: { rawMusicXML: serviceResult?.musicXml || '', parsed: transcription } }
        : transcription));
    } catch (error) {
      const isTimeout = error instanceof Error && error.name === 'TimeoutError';
      console.error('Local OMR service request failed:', error instanceof Error ? error.message : 'Unknown error');
      respondWithError(response, isTimeout ? 504 : 503, isTimeout ? 'OMR took too long. Crop a smaller staff region and try again.' : 'The local OMR service is unavailable. Start it with Docker Compose and try again.');
    } finally {
      if (temporaryPath) await unlink(temporaryPath).catch(() => undefined);
    }
  };
}

export const config = { api: { bodyParser: false }, maxDuration: 300 };

export default function handler(request: IncomingMessage, response: ServerResponse) {
  return createTranscriptionHandler(
    process.env.OMR_SERVICE_URL,
    process.env.OMR_SERVICE_TOKEN,
    process.env.NODE_ENV !== 'production',
  )(request, response);
}