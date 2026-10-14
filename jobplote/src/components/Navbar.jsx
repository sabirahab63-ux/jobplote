import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { ago } from '../utils';
import ThemeToggle from './ThemeToggle';

function Item({ to, end, children }) {
  return (
    <NavLink to={to} end={end} className="relative rounded-full px-4 py-2 text-sm font-bold">
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.span layoutId="nav-pill" transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              className="absolute inset-0 rounded-full bg-surface shadow-md shadow-black/10 ring-1 ring-ink/10" />
          )}
          <span className={`relative ${isActive ? 'text-brand-700 dark:text-brand-300' : 'text-ink/60 hover:text-ink'}`}>{children}</span>
        </>
      )}
    </NavLink>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menu, setMenu] = useState(false);
  const [bell, setBell] = useState(false);
  const [acct, setAcct] = useState(false);
  const [notes, setNotes] = useState([]);
  const [toast, setToast] = useState(null);
  const known = useRef(null);
  const bellRef = useRef(null);
  const acctRef = useRef(null);
  const unread = notes.filter((n) => !n.read).length;

  useEffect(() => {
    if (!user) return;
    const ping = () => api('/ping', { method: 'POST' }).catch(() => {});
    ping();
    const t = setInterval(ping, 30000);
    return () => clearInterval(t);
  }, [user]);

  const pull = useCallback(async () => {
    try {
      const list = await api('/notifications');
      if (known.current) {
        const fresh = list.find((n) => !n.read && !known.current.has(n.id));
        if (fresh) { setToast(fresh); setTimeout(() => setToast(null), 7000); }
      }
      known.current = new Set(list.map((n) => n.id));
      setNotes(list);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!user) { setNotes([]); known.current = null; return; }
    pull();
    const t = setInterval(pull, 12000);
    return () => clearInterval(t);
  }, [user, pull]);

  useEffect(() => {
    document.title = unread ? `(${unread}) JobPilot` : 'JobPilot - Jobs & Internships';
  }, [unread]);

  useEffect(() => {
    const close = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) setBell(false);
      if (acctRef.current && !acctRef.current.contains(e.target)) setAcct(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const openNote = (n) => {
    setBell(false); setToast(null);
    if (!n.read) {
      setNotes((l) => l.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      api('/notifications/read', { method: 'POST', body: { id: n.id } }).catch(() => {});
    }
    if (n.link) navigate(n.link);
  };
  const readAll = () => {
    setNotes((l) => l.map((x) => ({ ...x, read: true })));
    api('/notifications/read', { method: 'POST', body: { all: true } }).catch(() => {});
  };
  const out = () => { logout(); setMenu(false); setAcct(false); setBell(false); navigate('/'); };

  const links = [
    ['/', 'Find jobs', true],
    ...(user?.role === 'seeker' ? [['/applications', 'My applications']] : []),
    ...(user?.role === 'recruiter' ? [['/dashboard', 'Dashboard'], ['/post', 'Post a job']] : []),
  ];

  return (
    <header className="sticky top-3 z-40 px-3 sm:px-6">
      <div className="glass mx-auto flex max-w-6xl items-center justify-between gap-3 rounded-2xl px-3 py-2 shadow-lg shadow-black/5">
        <Link to="/" className="flex items-center gap-3 pl-1">
          <motion.div whileHover={{ rotate: 8, scale: 1.08 }} className="logo-mark">JP</motion.div>
          <div className="hidden sm:block">
            <p className="font-display text-lg font-extrabold leading-none">JobPilot</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-ink/45">Jobs & internships</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 rounded-full bg-ink/5 p-1 md:flex">
          {links.map(([to, label, end]) => <Item key={to} to={to} end={end}>{label}</Item>)}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />

          {user && (
            <div className="relative" ref={bellRef}>
              <button onClick={() => setBell(!bell)} className="btn-ghost relative h-10 w-10 !p-0 text-base" aria-label="Notifications">
                🔔
                {unread > 0 && (
                  <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-extrabold text-white">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </button>
              <AnimatePresence>
                {bell && (
                  <motion.div initial={{ opacity: 0, y: -8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8 }}
                    className="absolute right-0 mt-3 w-[calc(100vw-2rem)] max-w-sm overflow-hidden rounded-2xl border border-ink/10 bg-surface shadow-2xl">
                    <div className="flex items-center justify-between border-b border-ink/10 px-4 py-3">
                      <p className="font-display text-base font-extrabold">Notifications</p>
                      {unread > 0 && <button onClick={readAll} className="text-xs font-bold text-brand-600 dark:text-brand-300">Mark all read</button>}
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notes.map((n) => (
                        <button key={n.id} onClick={() => openNote(n)}
                          className={`flex w-full items-start gap-3 border-b border-ink/5 px-4 py-3 text-left transition hover:bg-ink/5 ${n.read ? '' : 'bg-brand-500/5'}`}>
                          <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? 'bg-transparent' : 'bg-brand-500'}`} />
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-bold">{n.title}</span>
                            <span className="block text-xs leading-5 text-ink/60">{n.body}</span>
                            <span className="mt-0.5 block text-[11px] text-ink/40">{ago(n.createdAt)}</span>
                          </span>
                        </button>
                      ))}
                      {!notes.length && <p className="px-4 py-10 text-center text-sm text-ink/45">No notifications yet</p>}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {!user ? (
            <>
              <Link to="/login" className="btn-ghost hidden sm:inline-flex">Log in</Link>
              <Link to="/register" className="btn-primary">Get started</Link>
            </>
          ) : (
            <div className="relative hidden md:block" ref={acctRef}>
              <button onClick={() => setAcct(!acct)} className="flex items-center gap-2 rounded-xl border border-ink/10 bg-surface/60 py-1.5 pl-1.5 pr-3 transition hover:border-brand-500/40">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-brand-800 text-xs font-extrabold text-white">{user.name?.charAt(0).toUpperCase()}</span>
                <span className="text-left leading-tight">
                  <span className="block text-xs font-extrabold">{user.name?.split(' ')[0]}</span>
                  <span className="block text-[10px] capitalize text-ink/50">{user.role}</span>
                </span>
              </button>
              <AnimatePresence>
                {acct && (
                  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                    className="absolute right-0 mt-3 w-52 overflow-hidden rounded-2xl border border-ink/10 bg-surface p-1.5 shadow-2xl">
                    <Link to="/profile" onClick={() => setAcct(false)} className="block rounded-xl px-3 py-2.5 text-sm font-bold hover:bg-ink/5">👤 My profile</Link>
                    <button onClick={out} className="block w-full rounded-xl px-3 py-2.5 text-left text-sm font-bold text-rose-600 hover:bg-rose-500/10">↩ Log out</button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          <button onClick={() => setMenu(!menu)} className="btn-ghost h-10 w-10 !p-0 md:hidden" aria-label="Menu">{menu ? '✕' : '☰'}</button>
        </div>
      </div>

      <AnimatePresence>
        {menu && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="glass mx-auto mt-2 max-w-6xl space-y-1 rounded-2xl p-3 shadow-lg md:hidden">
            {[...links, ...(user ? [['/profile', 'My profile']] : [])].map(([to, label, end]) => (
              <NavLink key={to} to={to} end={end} onClick={() => setMenu(false)}
                className={({ isActive }) => `block rounded-xl px-4 py-3 text-sm font-bold ${isActive ? 'bg-brand-500/10 text-brand-700 dark:text-brand-300' : 'text-ink/70'}`}>
                {label}
              </NavLink>
            ))}
            {user ? <button onClick={out} className="btn-ghost mt-1 w-full">Log out</button> : <Link to="/login" onClick={() => setMenu(false)} className="btn-ghost mt-1 w-full">Log in</Link>}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.button initial={{ x: 60, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 60, opacity: 0 }} onClick={() => openNote(toast)}
            className="fixed right-4 top-24 z-[120] w-[calc(100vw-2rem)] max-w-xs rounded-2xl border border-brand-500/30 bg-surface p-4 text-left shadow-2xl shadow-brand-600/20">
            <span className="flex items-center gap-2 text-sm font-extrabold">🔔 {toast.title}</span>
            <span className="mt-1 block text-xs leading-5 text-ink/65">{toast.body}</span>
          </motion.button>
        )}
      </AnimatePresence>
    </header>
  );
}