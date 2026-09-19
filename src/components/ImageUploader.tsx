import { ChangeEvent, DragEvent, KeyboardEvent, useRef, useState } from 'react';
import { ImagePlus, UploadCloud } from 'lucide-react';

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

type ImageUploaderProps = {
  onFileAccepted: (file: File) => void;
  onError: (message: string) => void;
};

function ImageUploader({ onFileAccepted, onError }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const validateAndAccept = (file?: File) => {
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      onError('Please upload a PNG, JPG, JPEG, or WEBP image.');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      onError('Image must be smaller than 10 MB.');
      return;
    }
    onFileAccepted(file);
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    validateAndAccept(event.target.files?.[0]);
    event.target.value = '';
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    validateAndAccept(event.dataTransfer.files[0]);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      inputRef.current?.click();
    }
  };

  return (
    <div
      className={`upload-zone${isDragging ? ' is-dragging' : ''}`}
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={handleKeyDown}
      onDragEnter={(event) => { event.preventDefault(); setIsDragging(true); }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      aria-label="Upload sheet music image"
    >
      <input ref={inputRef} className="visually-hidden" type="file" accept="image/png,image/jpeg,image/webp" onChange={handleInputChange} />
      <div className="upload-icon"><UploadCloud size={28} strokeWidth={1.7} aria-hidden="true" /></div>
      <p className="upload-title">{isDragging ? 'Drop image here' : 'Upload Sheet Music'}</p>
      <p className="upload-description">Drag and drop an image here, or choose a file.</p>
      <button className="secondary-button" type="button" onClick={(event) => { event.stopPropagation(); inputRef.current?.click(); }}><ImagePlus size={17} aria-hidden="true" /> Choose Image</button>
      <p className="file-hint">PNG, JPG, JPEG, or WEBP · Max 10 MB</p>
    </div>
  );
}

export default ImageUploader;