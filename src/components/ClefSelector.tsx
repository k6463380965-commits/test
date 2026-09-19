import type { Clef } from '../App';

const clefOptions: { value: Clef; label: string }[] = [
  { value: 'treble', label: 'Treble Clef' },
  { value: 'bass', label: 'Bass Clef' },
  { value: 'alto', label: 'Alto Clef' },
  { value: 'tenor', label: 'Tenor Clef' },
];

type ClefSelectorProps = {
  id: string;
  label: string;
  value: Clef;
  onChange: (value: Clef) => void;
};

function ClefSelector({ id, label, value, onChange }: ClefSelectorProps) {
  return (
    <label className="select-field" htmlFor={id}>
      <span>{label}</span>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value as Clef)}>
        {clefOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

export default ClefSelector;