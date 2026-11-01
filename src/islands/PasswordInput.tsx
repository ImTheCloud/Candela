import { useEffect, useRef, useState } from 'preact/hooks';

interface Props {
  id: string;
  value: string;
  onInput: (e: Event & { currentTarget: HTMLInputElement }) => void;
  autocomplete: 'current-password' | 'new-password';
  minLength?: number;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
}

/** Password field with an eye button that shows or hides what was typed. */
export default function PasswordInput({
  id,
  value,
  onInput,
  autocomplete,
  minLength,
  placeholder,
  disabled,
  required = true,
}: Props) {
  const [shown, setShown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const wasFocused = useRef(false);

  const toggle = (e: MouseEvent) => {
    e.preventDefault();
    if (inputRef.current && inputRef.current.value !== value) {
      onInput({ currentTarget: inputRef.current, target: inputRef.current } as any);
    }
    wasFocused.current = document.activeElement === inputRef.current;
    setShown((s) => !s);
  };

  useEffect(() => {
    if (wasFocused.current && inputRef.current) {
      inputRef.current.focus();
      const len = inputRef.current.value.length;
      inputRef.current.setSelectionRange(len, len);
      wasFocused.current = false;
    }
  }, [shown]);

  return (
    <div class="pw">
      <input
        ref={inputRef}
        key={shown ? 'pw-txt' : 'pw-pwd'}
        id={id}
        class={`input${shown ? ' pw-shown' : ''}`}
        type={shown ? 'text' : 'password'}
        autocomplete={shown ? 'off' : autocomplete}
        autocapitalize="none"
        spellcheck={false}
        minLength={minLength}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        value={value}
        onInput={onInput}
      />
      <button
        type="button"
        class="pw-eye"
        aria-label={shown ? 'Ascunde parola' : 'Arată parola'}
        aria-pressed={shown}
        onClick={toggle}
      >
        {shown ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}
