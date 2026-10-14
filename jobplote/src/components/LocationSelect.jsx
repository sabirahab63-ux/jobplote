import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const QUICK = [
  { value: '', label: 'Anywhere', icon: '🌍' },
  { value: 'near', label: 'Near me', icon: '📍' },
  { value: 'remote', label: 'Remote only', icon: '🏠' },
];

export default function LocationSelect({ value, onChange, cities = [], busy = false }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [hi, setHi] = useState(0);
  const box = useRef(null);

  const rows = useMemo(() => {
    const row = (c) => ({ value: c.name, label: c.region === 'India' ? c.name : `${c.name}, ${c.country}`, count: c.count, icon: '📌' });
    return [
      ...QUICK.map((r) => ({ ...r, group: 'Quick' })),
      { value: 'India', label: 'All of India', icon: '🧭', group: 'India' },
      ...cities.filter((c) => c.region === 'India').map((c) => ({ ...row(c), group: 'India' })),
      { value: 'International', label: 'All international', icon: '🌐', group: 'International' },
      ...cities.filter((c) => c.region !== 'India').map((c) => ({ ...row(c), group: 'International' })),
    ];
  }, [cities]);

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? rows.filter((r) => r.label.toLowerCase().includes(s)) : rows;
  }, [rows, q]);

  const current = rows.find((r) => r.value === value) || rows[0];

  useEffect(() => {
    const close = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  useEffect(() => { setHi(0); }, [q, open]);

  const pick = (r) => { if (!r) return; onChange(r.value); setOpen(false); setQ(''); };
  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi((i) => Math.min(i + 1, shown.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); pick(shown[hi]); }
    else if (e.key === 'Escape') setOpen(false);
  };

  let last = '';
  return (
    <div ref={box} className="relative md:w-56">
      <button type="button" onClick={() => setOpen(!open)} aria-haspopup="listbox" aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-ink/10 bg-surface/60 px-3.5 py-3 text-sm font-semibold transition hover:border-brand-500/40">
        <span className="flex items-center gap-2 truncate"><span>{current.icon}</span>{busy ? 'Locating…' : current.label}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} className="text-xs opacity-60">▾</motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.98 }} transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 top-full z-50 mt-2 min-w-[260px] overflow-hidden rounded-2xl border border-ink/15 bg-surface shadow-2xl shadow-black/20">
            <div className="border-b border-ink/10 p-2">
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey} placeholder="Search city or country"
                className="w-full rounded-lg bg-ink/5 px-3 py-2 text-sm text-ink outline-none placeholder:text-ink/40" />
            </div>
            <ul role="listbox" className="max-h-72 overflow-y-auto p-1.5">
              {shown.map((r, i) => {
                const head = r.group !== last; last = r.group;
                return (
                  <li key={r.group + r.value}>
                    {head && !q && <p className="px-3 pb-1 pt-3 text-[10px] font-extrabold uppercase tracking-[0.18em] text-ink/40">{r.group}</p>}
                    <button type="button" role="option" aria-selected={r.value === value} onMouseEnter={() => setHi(i)} onClick={() => pick(r)}
                      ref={(el) => { if (el && i === hi) el.scrollIntoView({ block: 'nearest' }); }}
                      className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors ${i === hi ? 'bg-brand-500/15 text-brand-700 dark:text-brand-300' : 'text-ink'} ${r.value === value ? 'ring-1 ring-brand-500/40' : ''}`}>
                      <span className="flex items-center gap-2"><span>{r.icon}</span>{r.label}</span>
                      <span className="flex items-center gap-2 text-xs">
                        {r.count != null && <span className="opacity-50">{r.count}</span>}
                        {r.value === value && <span className="text-brand-600 dark:text-brand-300">✓</span>}
                      </span>
                    </button>
                  </li>
                );
              })}
              {!shown.length && <li className="px-3 py-6 text-center text-sm text-ink/45">No place found</li>}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}