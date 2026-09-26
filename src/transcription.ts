import { Formatter, Renderer, Stave, StaveNote } from 'vexflow/bravura';
import type { Clef } from './App';

export type NoteEvent = {
  pitches: string[];
  duration: string;
  rest: boolean;
};

export type ScoreTranscription = {
  timeSignature: string;
  measures: { notes: NoteEvent[] }[];
};

const DURATIONS: Record<string, string> = {
  whole: 'w',
  half: 'h',
  quarter: 'q',
  eighth: '8',
  sixteenth: '16',
  thirty_second: '32',
};

function vexKey(pitch: string) {
  const match = pitch.match(/^([A-G])([#B]?)(-?\d+)$/);
  if (!match) throw new Error(`Unrecognized pitch: ${pitch}`);
  const accidental = match[2] === 'B' ? 'b' : match[2];
  return `${match[1].toLowerCase()}${accidental}/${match[3]}`;
}

export async function renderTranscription(score: ScoreTranscription, clef: Clef): Promise<Blob> {
  await document.fonts.ready;
  const width = 1400;
  const measuresPerSystem = 4;
  const measures = score.measures.length ? score.measures : [{ notes: [] }];
  const systemCount = Math.ceil(measures.length / measuresPerSystem);
  const systemHeight = 220;
  const height = 110 + systemCount * systemHeight;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const background = canvas.getContext('2d');
  if (!background) throw new Error('Your browser could not create the score image.');
  background.fillStyle = '#fff';
  background.fillRect(0, 0, width, height);
  background.fillStyle = '#26312f';
  background.font = '600 22px Georgia, serif';
  background.fillText('Transcribed score', 44, 40);
  background.fillStyle = '#6f7b77';
  background.font = '14px Arial, sans-serif';
  background.fillText(`${clef.toUpperCase()} clef · ${score.timeSignature} · ${measures.length} measures`, 44, 66);

  const renderer = new Renderer(canvas, Renderer.Backends.CANVAS);
  renderer.resize(width, height);
  const context = renderer.getContext();
  const measureWidth = (width - 80) / measuresPerSystem;

  measures.forEach((measure, measureIndex) => {
    const systemIndex = Math.floor(measureIndex / measuresPerSystem);
    const measureInSystem = measureIndex % measuresPerSystem;
    const x = 40 + measureInSystem * measureWidth;
    const y = 90 + systemIndex * systemHeight;
    const stave = new Stave(x, y, measureWidth);
    if (measureInSystem === 0) stave.addClef(clef).addTimeSignature(score.timeSignature);
    stave.setContext(context).draw();

    const staveNotes = measure.notes.map((note) => {
      const duration = DURATIONS[note.duration];
      if (!duration) throw new Error(`Unsupported note duration: ${note.duration}`);
      const keys = note.rest ? ['b/4'] : note.pitches.map(vexKey);
      return new StaveNote({ keys, duration: note.rest ? `${duration}r` : duration, clef });
    });
    if (staveNotes.length) Formatter.FormatAndDraw(context, stave, staveNotes);
  });

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Could not export the transcribed score.')), 'image/png');
  });
}