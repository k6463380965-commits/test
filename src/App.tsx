import { useEffect, useState } from 'react';
import { FileImage, RotateCcw, Sparkles, Upload } from 'lucide-react';
import Header from './components/Header';
import ImagePreview from './components/ImagePreview';
import ImageUploader from './components/ImageUploader';
import ClefSelector from './components/ClefSelector';
import TranscribeButton from './components/TranscribeButton';

const DEFAULT_SOURCE = 'treble';
const DEFAULT_TARGET = 'bass';

export type Clef = 'treble' | 'bass' | 'alto' | 'tenor';

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [sourceClef, setSourceClef] = useState<Clef>(DEFAULT_SOURCE);
  const [targetClef, setTargetClef] = useState<Clef>(DEFAULT_TARGET);
  const [message, setMessage] = useState('');

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
    setMessage('');
  };

  const removeImage = () => {
    setFile(null);
    setMessage('');
  };

  const resetAll = () => {
    setFile(null);
    setSourceClef(DEFAULT_SOURCE);
    setTargetClef(DEFAULT_TARGET);
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
            <TranscribeButton onClick={() => setMessage(file ? 'Transcription coming soon.' : 'Please upload an image first.')} />
            <p className="status-message" role="status" aria-live="polite">{message}</p>
          </div>
        </section>
        <p className="privacy-note"><Upload size={14} aria-hidden="true" /> Your image stays in your browser. Nothing is uploaded.</p>
      </main>
      <footer>Clef Transcriber <span>Version 1.0 · Local preview only</span></footer>
    </div>
  );
}

export default App;