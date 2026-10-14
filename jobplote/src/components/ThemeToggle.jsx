import { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const [dark, setDark] = useState(() => (localStorage.getItem('jp_theme') || 'dark') === 'dark');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('jp_theme', dark ? 'dark' : 'light');
  }, [dark]);

  return (
    <button onClick={() => setDark(!dark)} aria-label="Toggle theme" className="btn-ghost h-10 w-10 !p-0 text-base">
      {dark ? '☀️' : '🌙'}
    </button>
  );
}