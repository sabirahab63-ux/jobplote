const G = [
  'from-teal-500 to-emerald-500',
  'from-sky-500 to-indigo-500',
  'from-violet-500 to-fuchsia-500',
  'from-amber-500 to-orange-500',
  'from-rose-500 to-pink-500',
];

export const grad = (s = '') => G[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % G.length];

export const ago = (iso) => {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 6e4);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

export const fmtSize = (b = 0) => (b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`);