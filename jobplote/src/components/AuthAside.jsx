import { motion } from 'framer-motion';

const POINTS = [
  ['✉', 'Email-verified accounts', 'Every account is confirmed with a one-time code.'],
  ['📄', 'One resume, many applications', 'Upload your PDF once and apply anywhere.'],
  ['🔔', 'Instant updates', 'Get notified the moment your application changes.'],
];

export default function AuthAside() {
  return (
    <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }} className="hidden lg:block">
      <span className="inline-flex items-center gap-2 rounded-full border border-brand-500/25 bg-brand-500/10 px-4 py-1.5 text-xs font-bold text-brand-700 dark:text-brand-300">
        <span className="h-2 w-2 animate-pulse rounded-full bg-brand-500" /> Secure sign in
      </span>
      <h1 className="hero-title mt-5 font-display text-5xl font-extrabold leading-[1.05]">
        Your next opportunity starts here.
      </h1>
      <ul className="mt-8 space-y-4">
        {POINTS.map(([icon, title, text], k) => (
          <motion.li key={title} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + k * 0.12 }} className="flex gap-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-500/10 text-lg">{icon}</span>
            <span>
              <b className="block text-sm">{title}</b>
              <span className="text-sm text-ink/55">{text}</span>
            </span>
          </motion.li>
        ))}
      </ul>
    </motion.div>
  );
}