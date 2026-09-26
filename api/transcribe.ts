import { unlink, readFile } from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import formidable from 'formidable';

const CLEFS = ['treble', 'bass', 'alto', 'tenor'] as const;
const ACCEPTED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const GEMINI_MODEL = 'gemini-3.8-flash';
const DURATION_VALUES = new Set(['whole', 'half', 'quarter', 'eighth', 'sixteenth', 'thirty_second']);

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

function parseTranscription(text: string): ScoreTranscription | null {
  const jsonText = text.match(/\{[\s\S]*\}/)?.[0];
  if (!jsonText) return null;

  try {
    const parsed = JSON.parse(jsonText) as Partial<ScoreTranscription>;
    if (!Array.isArray(parsed.measures) || parsed.measures.length === 0 || parsed.measures.length > 128) return null;

    const measures: ScoreTranscription['measures'] = [];
    for (const measure of parsed.measures) {
      if (!measure || !Array.isArray(measure.notes) || measure.notes.length > 32) return null;
      const notes: NoteEvent[] = [];
      for (const note of measure.notes) {
        if (!note || !Array.isArray(note.pitches) || typeof note.duration !== 'string' || typeof note.rest !== 'boolean') return null;
        if (!DURATION_VALUES.has(note.duration) || note.pitches.length > 8) return null;
        const pitches = note.pitches.map((pitch) => typeof pitch === 'string' ? pitch.toUpperCase().replace(/\s+/g, '') : '');
        if (pitches.some((pitch) => !/^[A-G][#B]?-?\d+$/.test(pitch))) return null;
        if (!note.rest && pitches.length === 0) return null;
        notes.push({ pitches, duration: note.duration, rest: note.rest });
      }
      measures.push({ notes });
    }

    const timeSignature = typeof parsed.timeSignature === 'string' && /^\d{1,2}\/\d{1,2}$/.test(parsed.timeSignature)
      ? parsed.timeSignature
      : '4/4';
    return { timeSignature, measures };
  } catch {
    return null;
  }
}

export function createTranscriptionHandler(apiKey?: string) {
  return async (request: IncomingMessage, response: ServerResponse) => {
    if (request.method !== 'POST') {
      response.setHeader('Allow', 'POST');
      respondWithError(response, 405, 'Use POST to generate a sheet image.');
      return;
    }

    if (!apiKey) {
      respondWithError(response, 503, 'Set GEMINI_API_KEY on the server to enable music recognition.');
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
        'Perform optical music recognition (OMR) on this sheet music image. Do not redraw, edit, or describe the image.',
        `Read every staff using the explicitly selected ${sourceClef} clef. Report concert pitches as scientific pitch notation (for example C4, F#5, Bb3), independent of the output clef ${targetClef}.`,
        'Transcribe the printed notes in reading order, grouped into measures. Preserve chords by listing all simultaneous pitches in one event. Include rests and the note values whole, half, quarter, eighth, sixteenth, or thirty_second.',
        'Return only valid JSON, with no markdown or commentary, using exactly this shape: {"timeSignature":"4/4","measures":[{"notes":[{"pitches":["C4"],"duration":"quarter","rest":false}]}]}. For a rest use an empty pitches array and rest true. Apply the key signature and local accidentals when calculating each pitch; include sharp or flat in the pitch string. Do not invent notes; if a symbol is unreadable, omit it.',
      ].join(' ');

      const imageData = await readFile(uploadedImage.filepath);
      const modelResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
        method: 'POST',
        headers: {
          'x-goog-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: 'You are an optical music recognition system. Return only schema-conforming data. Never create or alter images.' }],
          },
          contents: [{
            role: 'user',
            parts: [
              { text: prompt },
              { inlineData: { mimeType: uploadedImage.mimetype, data: imageData.toString('base64') } },
            ],
          }],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'OBJECT',
              properties: {
                timeSignature: { type: 'STRING' },
                measures: {
                  type: 'ARRAY',
                  items: {
                    type: 'OBJECT',
                    properties: {
                      notes: {
                        type: 'ARRAY',
                        items: {
                          type: 'OBJECT',
                          properties: {
                            pitches: { type: 'ARRAY', items: { type: 'STRING' } },
                            duration: { type: 'STRING', enum: [...DURATION_VALUES] },
                            rest: { type: 'BOOLEAN' },
                          },
                          required: ['pitches', 'duration', 'rest'],
                        },
                      },
                    },
                    required: ['notes'],
                  },
                },
              },
              required: ['timeSignature', 'measures'],
            },
            temperature: 0.1,
            maxOutputTokens: 8192,
            thinkingConfig: { thinkingBudget: 2048 },
          },
        }),
      });

      if (!modelResponse.ok) {
        const providerError = await modelResponse.json().catch(() => null) as { error?: { message?: string; status?: string } } | null;
        const providerMessage = providerError?.error?.message || '';
        const isRateLimited = modelResponse.status === 429 || providerError?.error?.status === 'RESOURCE_EXHAUSTED';
        const isAuthIssue = modelResponse.status === 401 || modelResponse.status === 403;
        const isModelUnavailable = /model .* (not found|no longer available|unavailable)|not supported for generatecontent/i.test(providerMessage);
        console.error('Gemini music recognition request failed:', providerMessage || modelResponse.statusText);
        respondWithError(
          response,
          isRateLimited ? 429 : isAuthIssue ? 401 : 502,
          isRateLimited
            ? 'Gemini quota or rate limit reached. Check your Google AI Studio usage and billing, then try again.'
            : isAuthIssue
              ? 'Gemini rejected the API key. Check GEMINI_API_KEY.'
              : isModelUnavailable
                ? 'The configured Gemini model is unavailable. Update GEMINI_MODEL in the server configuration.'
                : providerMessage
                  ? `Gemini rejected the request: ${providerMessage}`
                  : 'Gemini could not process this score image.',
        );
        return;
      }

      const modelResult = await modelResponse.json() as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };
      const outputText = modelResult.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('') || '';
      const transcription = parseTranscription(outputText);
      if (!transcription) {
        respondWithError(response, 502, 'Gemini returned data that did not match the score format. Try again; if it repeats, check the server log.');
        return;
      }
      response.statusCode = 200;
      response.setHeader('Content-Type', 'application/json');
      response.setHeader('Cache-Control', 'no-store');
      response.end(JSON.stringify(transcription));
    } catch (error) {
      console.error('Gemini music recognition failed:', error instanceof Error ? error.message : 'Unknown error');
      respondWithError(response, 500, 'Music recognition failed. Check the server key and try again.');
    } finally {
      if (temporaryPath) await unlink(temporaryPath).catch(() => undefined);
    }
  };
}

export const config = { api: { bodyParser: false }, maxDuration: 300 };

export default function handler(request: IncomingMessage, response: ServerResponse) {
  return createTranscriptionHandler(process.env.GEMINI_API_KEY)(request, response);
}