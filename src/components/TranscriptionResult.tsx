import { Download } from 'lucide-react';

type TranscriptionResultProps = {
  imageUrl: string;
  targetClef: string;
  noteCount: number;
};

function TranscriptionResult({ imageUrl, targetClef, noteCount }: TranscriptionResultProps) {
  return (
    <section className="transcription-result" aria-labelledby="result-title">
      <div className="result-heading">
        <div>
          <p className="eyebrow">03 / OUTPUT</p>
          <h2 id="result-title">Transcribed sheet</h2>
        </div>
        <a className="download-button" href={imageUrl} download="transcribed-sheet.png" aria-label="Download transcribed sheet image" title="Download PNG">
          <Download size={17} aria-hidden="true" />
          <span>Download PNG</span>
        </a>
      </div>
      <div className="result-image-frame">
        <img src={imageUrl} alt={`AI-generated sheet music with the requested ${targetClef} clef`} />
      </div>
      <p className="result-caption">Gemini identified {noteCount} notes · {targetClef} clef · verify the result against the source</p>
    </section>
  );
}

export default TranscriptionResult;