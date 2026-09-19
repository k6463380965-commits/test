import { WandSparkles } from 'lucide-react';

type TranscribeButtonProps = { onClick: () => void };

function TranscribeButton({ onClick }: TranscribeButtonProps) {
  return <button className="primary-button" type="button" onClick={onClick}><WandSparkles size={19} aria-hidden="true" /> Transcribe</button>;
}

export default TranscribeButton;