import { WandSparkles } from 'lucide-react';

type TranscribeButtonProps = { onClick: () => void; isLoading: boolean; disabled: boolean };

function TranscribeButton({ onClick, isLoading, disabled }: TranscribeButtonProps) {
  return <button className="primary-button" type="button" onClick={onClick} disabled={disabled || isLoading} aria-busy={isLoading}><WandSparkles size={19} aria-hidden="true" /> {isLoading ? 'Generating...' : 'Transcribe'}</button>;
}

export default TranscribeButton;