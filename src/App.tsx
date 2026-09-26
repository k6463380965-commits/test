import { useEffect, useState } from 'react';
import { FileImage, RotateCcw, Sparkles, Upload } from 'lucide-react';
import Header from './components/Header';
import ImagePreview from './components/ImagePreview';
import ImageUploader from './components/ImageUploader';
import ClefSelector from './components/ClefSelector';
import TranscribeButton from './components/TranscribeButton';
import TranscriptionResult from './components/TranscriptionResult';
import type { ScoreTranscription } from './transcription';
import './transcription.css';

const DEFAULT_SOURCE = 'treble';
const DEFAULT_TARGET = 'bass';

export type Clef = 'treble' | 'bass' | 'alto' | 'tenor';

const MAX_API_IMAGE_SIZE = 4 * 1024 * 1024;

async function prepareImageForGeneration(file: File) {
  if (file.size <= MAX_API_IMAGE_SIZE) return file;

  const bitmap = await createImageBitmap(file);
  try {
    let scale = Math.min(1, 2800 / bitmap.width, 2800 / bitmap.height);
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not prepare this image for upload.');

    for (let attempt = 0; attempt < 6; attempt++) {
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      context.fillStyle = '#fff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const quality = Math.max(0.67, 0.92 - attempt * 0.05);
      const compressed = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Could not compress this image.')), 'image/jpeg', quality);
      });
      if (compressed.size <= MAX_API_IMAGE_SIZE) {
        return new File([compressed], 'sheet-music.jpg', { type: 'image/jpeg' });
      }
      scale *= 0.8;
    }

    throw new Error('This image could not be reduced enough to send. Choose a smaller image.');
  } finally {
    bitmap.close();
  }
}

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [sourceClef, setSourceClef] = useState<Clef>(DEFAULT_SOURCE);
  const [targetClef, setTargetClef] = useState<Clef>(DEFAULT_TARGET);
  const [message, setMessage] = useState('');
  const [transcriptionUrl, setTranscriptionUrl] = useState<string | null>(null);
  const [noteCount, setNoteCount] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);

  useEffect(() => {
    return () => {
      if (transcriptionUrl) URL.revokeObjectURL(transcriptionUrl);
    };
  }, [transcriptionUrl]);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  const handleFileAccepted = (nextFile: File) => {
    setFile(nextFile);
    setTranscriptionUrl(null);
    setMessage('');
  };

  const handleTranscribe = async () => {
    if (!file) {
      setMessage('Please upload an image first.');
      return;
    }

    setIsTranscribing(true);
    setMessage('Reading notes and rhythms with Gemini...');
    setTranscriptionUrl(null);
    try {
      const formData = new FormData();
      formData.append('image', await prepareImageForGeneration(file));
      formData.append('sourceClef', sourceClef);
      formData.append('targetClef', targetClef);
      const response = await fetch('/api/transcribe', { method: 'POST', body: formData });
      if (!response.ok) {
        const result = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(result?.error || 'Music recognition failed. Please try again.');
      }

      const score = await response.json() as ScoreTranscription;
      const { renderTranscription } = await import('./transcription');
      const image = await renderTranscription(score, targetClef);
      const detectedNotes = score.measures.reduce((sum, measure) =>
        sum + measure.notes.reduce((measureSum, note) => measureSum + (note.rest ? 0 : note.pitches.length), 0), 0);
      setTranscriptionUrl(URL.createObjectURL(image));
      setNoteCount(detectedNotes);
      setMessage(`Recognized ${detectedNotes} notes. Check the result against your original.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Transcription failed. Please try another image.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const removeImage = () => {
    setFile(null);
    setTranscriptionUrl(null);
    setMessage('');
  };

  const resetAll = () => {
    setFile(null);
    setSourceClef(DEFAULT_SOURCE);
    setTargetClef(DEFAULT_TARGET);
    setTranscriptionUrl(null);
    setMessage('');
  };

  return (
    <div className="app-shell">
      <Header />
      <main className="container">
        <section className="intro" aria-labelledby="page-title">
          <div className="intro-mark"><Sparkles size={18} aria-hidden="true" /></div>
          <p className="eyebrow">SHEET MUSIC TOOL</p>
          <h1 id="page-title">Clef Transcriber</h1>
          <p className="subtitle">Convert your sheet music to the clef you need.</p>
        </section>

        <section className="workspace" aria-label="Transcription workspace">
          <div className="section-heading">
            <div>
              <p className="eyebrow">01 / INPUT</p>
              <h2>Upload your sheet music</h2>
            </div>
            {file && <button className="reset-button" type="button" onClick={resetAll}><RotateCcw size={15} aria-hidden="true" /> Start Over</button>}
          </div>

          {previewUrl && file ? (
            <ImagePreview file={file} previewUrl={previewUrl} onRemove={removeImage} />
          ) : (
            <ImageUploader onFileAccepted={handleFileAccepted} onError={setMessage} />
          )}

          <div className="settings-heading">
            <div>
              <p className="eyebrow">02 / SETTINGS</p>
              <h2>Choose your clefs</h2>
            </div>
            <FileImage className="heading-icon" size={24} aria-hidden="true" />
          </div>
          <div className="selectors">
            <ClefSelector id="source-clef" label="Source Clef" value={sourceClef} onChange={setSourceClef} />
            <ClefSelector id="target-clef" label="Target Clef" value={targetClef} onChange={setTargetClef} />
          </div>

          <div className="action-area">
            <TranscribeButton onClick={handleTranscribe} isLoading={isTranscribing} disabled={!file} />
            <p className="status-message" role="status" aria-live="polite">{message}</p>
          </div>
          {transcriptionUrl && <TranscriptionResult imageUrl={transcriptionUrl} targetClef={targetClef} noteCount={noteCount} />}
        </section>
        <p className="privacy-note"><Upload size={14} aria-hidden="true" /> Your image is sent to Google Gemini for music recognition.</p>
      </main>
      <footer>Clef Transcriber <span>Google Gemini OMR · VexFlow engraving</span></footer>
    </div>
  );
}

export default App;