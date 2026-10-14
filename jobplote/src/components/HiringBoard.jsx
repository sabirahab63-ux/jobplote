import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import CountUp from './CountUp';

const PEOPLE = [
  { id: 'a', name: 'Aarav', role: 'Frontend Intern', g: 'from-teal-400 to-emerald-500' },
  { id: 'm', name: 'Meera', role: 'Data Analyst', g: 'from-sky-400 to-indigo-500' },
  { id: 's', name: 'Sana', role: 'Content Writer', g: 'from-amber-400 to-orange-500' },
  { id: 'k', name: 'Kabir', role: 'Marketing Intern', g: 'from-rose-400 to-pink-500' },
];
const COLS = [
  { label: 'Applied', dot: 'bg-sky-400' },
  { label: 'In review', dot: 'bg-amber-400' },
  { label: 'Hired', dot: 'bg-emerald-400' },
];
const EVENTS = ['New application', 'Moved to review', 'Offer accepted 🎉'];
const BARS = [38, 62, 48, 80, 58, 92, 70];

function Confetti() {
  return (
    <span className="pointer-events-none absolute inset-0">
      {Array.from({ length: 12 }).map((_, i) => (
        <motion.i key={i} className="absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full"
          style={{ background: ['#34d399', '#fbbf24', '#60a5fa', '#f472b6'][i % 4] }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{ x: Math.cos((i / 12) * Math.PI * 2) * 52, y: Math.sin((i / 12) * Math.PI * 2) * 52, opacity: 0, scale: 0.3 }}
          transition={{ duration: 1, ease: 'easeOut' }} />
      ))}
    </span>
  );
}

export default function HiringBoard() {
  const [stages, setStages] = useState([0, 1, 2, 0]);
  const [event, setEvent] = useState({ k: 0, who: 'Kabir', stage: 0 });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 2400);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!tick) return;
    const i = (tick - 1) % PEOPLE.length, next = (stages[i] + 1) % 3;
    setStages((s) => s.map((v, k) => (k === i ? next : v)));
    setEvent({ k: tick, who: PEOPLE[i].name, stage: next });
  }, [tick]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative mx-auto w-full max-w-md">
      <div className="absolute -inset-8 -z-10 rounded-[48px] blur-3xl"
        style={{ background: 'radial-gradient(circle at 25% 25%, rgb(var(--b500) / .35), transparent 60%), radial-gradient(circle at 80% 85%, rgb(var(--hero2) / .30), transparent 60%)' }} />

      <motion.div animate={{ y: [0, -7, 0] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        className="glass rounded-3xl p-5 shadow-2xl shadow-brand-600/15">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="font-display text-lg font-extrabold">Hiring board</p>
            <p className="text-xs text-ink/50">How applications move, step by step</p>
          </div>
          <span className="flex items-center gap-1.5 rounded-full bg-brand-500/10 px-3 py-1 text-xs font-bold text-brand-700 dark:text-brand-300">
            <span className="h-2 w-2 animate-pulse rounded-full bg-brand-500" /> Preview
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          {COLS.map((c, ci) => (
            <div key={c.label} className="min-h-[210px] rounded-2xl border border-ink/10 bg-ink/[0.04] p-2">
              <div className="mb-2 flex items-center justify-between px-1 text-[11px] font-extrabold">
                <span className="flex items-center gap-1.5"><i className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />{c.label}</span>
                <CountUp to={stages.filter((s) => s === ci).length} className="rounded-full bg-ink/10 px-1.5 py-0.5" />
              </div>
              <div className="space-y-2">
                {PEOPLE.map((p, k) => stages[k] === ci && (
                  <motion.div key={p.id} layout layoutId={p.id} transition={{ type: 'spring', stiffness: 260, damping: 26 }}
                    className="relative rounded-xl border border-ink/10 bg-surface p-2 shadow-sm">
                    <div className="flex items-center gap-2">
                      <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-to-br ${p.g} text-[11px] font-black text-white`}>{p.name[0]}</span>
                      <span className="min-w-0 leading-tight">
                        <span className="block truncate text-xs font-extrabold">{p.name}</span>
                        <span className="block truncate text-[10px] text-ink/50">{p.role}</span>
                      </span>
                    </div>
                    {ci === 2 && event.who === p.name && <Confetti key={event.k} />}
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4">
          <p className="mb-2 text-[11px] font-bold text-ink/45">Applications this week (sample)</p>
          <div className="flex h-12 items-end gap-1.5">
            {BARS.map((h, i) => (
              <motion.div key={i} className="flex-1 rounded-t-md bg-gradient-to-t from-brand-600 to-brand-300"
                animate={{ height: [`${h * 0.55}%`, `${h}%`, `${h * 0.55}%`] }}
                transition={{ duration: 3 + i * 0.35, repeat: Infinity, ease: 'easeInOut' }} />
            ))}
          </div>
        </div>
      </motion.div>

      <div className="absolute -right-3 -top-6 w-60">
        <AnimatePresence mode="wait">
          <motion.div key={event.k} initial={{ opacity: 0, x: 24, scale: 0.95 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 24 }}
            className="glass rounded-2xl px-4 py-2.5 text-xs shadow-xl">
            <span className="font-extrabold">🔔 {EVENTS[event.stage]}</span>
            <span className="ml-1 text-ink/55">· {event.who}</span>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}