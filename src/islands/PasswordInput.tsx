import { useState } from 'preact/hooks';

interface Props {
  id: string;
  value: string;
  onInput: (e: Event & { currentTarget: HTMLInputElement }) => void;
  autocomplete: 'current-password' | 'new-password';
  minLength?: number;
}

/** Password field with an eye button that shows or hides what was typed. */
export default function PasswordInput({ id, value, onInput, autocomplete, minLength }: Props) {
  const [shown, setShown] = useState(false);
  return (
    <div class="pw">
      <input id={id} class="input" type={shown ? 'text' : 'password'} autocomplete={autocomplete} autocapitalize="none" spellcheck={false}
        minLength={minLength} required value={value} onInput={onInput} />
      <button type="button" class="pw-eye" aria-label={shown ? 'Ascunde parola' : 'Arată parola'} aria-pressed={shown} onClick={() => setShown(!shown)}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
          <circle cx="12" cy="12" r="3" />
          {shown && <path d="M4 4l16 16" />}
        </svg>
      </button>
    </div>
  );
}
