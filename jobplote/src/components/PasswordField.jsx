import { useState } from 'react';

const LEVEL = [
  ['Too short', 'bg-rose-500'],
  ['Weak', 'bg-rose-500'],
  ['Okay', 'bg-amber-500'],
  ['Good', 'bg-emerald-500'],
  ['Strong', 'bg-emerald-500'],
];

export const strength = (p) =>
  [p.length >= 8, /[A-Z]/.test(p) && /[a-z]/.test(p), /\d/.test(p), /[^A-Za-z0-9]/.test(p)].filter(Boolean).length;

export default function PasswordField({ value, onChange, placeholder = 'Password', meter, auto }) {
  const [show, setShow] = useState(false);
  const score = strength(value);

  return (
    <div>
      <div className="relative">
        <input
          className="input pr-16"
          type={show ? 'text' : 'password'}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          autoComplete={auto}
          required
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-ink/50 hover:text-ink"
        >
          {show ? 'Hide' : 'Show'}
        </button>
      </div>

      {meter && value && (
        <div className="mt-2">
          <div className="flex gap-1.5">
            {[1, 2, 3, 4].map((n) => (
              <span
                key={n}
                className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${score >= n ? LEVEL[score][1] : 'bg-ink/10'}`}
              />
            ))}
          </div>
          <p className="mt-1 text-xs text-ink/50">{LEVEL[score][0]}</p>
        </div>
      )}
    </div>
  );
}