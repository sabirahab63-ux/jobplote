import { useRef } from 'react';
import { motion } from 'framer-motion';

export default function Otp({ digits, setDigits }) {
  const refs = useRef([]);

  const put = (i, raw) => {
    const d = raw.replace(/\D/g, '');
    if (!d) return;
    const next = [...digits];
    d.slice(0, 6 - i).split('').forEach((c, k) => { next[i + k] = c; });
    setDigits(next);
    refs.current[Math.min(i + d.length, 5)]?.focus();
  };

  const back = (e, i) => {
    if (e.key !== 'Backspace') return;
    const n = [...digits];
    if (n[i]) n[i] = '';
    else if (i) { n[i - 1] = ''; refs.current[i - 1]?.focus(); }
    setDigits(n);
  };

  return (
    <div className="flex justify-center gap-2">
      {digits.map((d, i) => (
        <motion.input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          value={d}
          inputMode="numeric"
          maxLength={6}
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          onFocus={(e) => e.target.select()}
          onChange={(e) => put(i, e.target.value)}
          onKeyDown={(e) => back(e, i)}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="h-14 w-11 rounded-xl border border-ink/15 bg-surface text-center font-display text-2xl font-extrabold outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 sm:w-12"
        />
      ))}
    </div>
  );
}