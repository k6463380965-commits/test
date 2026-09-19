import { ImageOff, X } from 'lucide-react';

type ImagePreviewProps = {
  file: File;
  previewUrl: string;
  onRemove: () => void;
};

function ImagePreview({ file, previewUrl, onRemove }: ImagePreviewProps) {
  return (
    <div className="preview-card">
      <div className="preview-card-header">
        <div><p className="eyebrow">SELECTED IMAGE</p><h3>{file.name}</h3></div>
        <button className="icon-button" type="button" onClick={onRemove} aria-label="Remove image" title="Remove image"><X size={19} /></button>
      </div>
      <div className="preview-frame"><img src={previewUrl} alt={`Preview of ${file.name}`} /><div className="preview-watermark"><ImageOff size={14} aria-hidden="true" /> Local preview</div></div>
      <button className="remove-button" type="button" onClick={onRemove}>Remove Image</button>
    </div>
  );
}

export default ImagePreview;