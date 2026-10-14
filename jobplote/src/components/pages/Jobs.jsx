import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';
import Page from '../Page';
import HiringBoard from '../HiringBoard';
import ResumeUploader from '../ResumeUploader';
import LocationSelect from '../LocationSelect';
import CountUp from '../CountUp';
import { ago, grad } from '../../utils';

const TYPES = [['All', 'All'], ['Job', 'Jobs'], ['Internship', 'Internships']];
const POPULAR = ['Remote', 'Marketing', 'Finance', 'Design', 'Healthcare', 'Teaching'];

export default function Jobs() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [jobs, setJobs] = useState([]);
  const [meta, setMeta] = useState({ totals: null, categories: [], cities: [] });
  const [q, setQ] = useState('');
  const [type, setType] = useState('All');
  const [category, setCategory] = useState('All');
  const [loc, setLoc] = useState('');
  const [coords, setCoords] = useState('');
  const [locating, setLocating] = useState(false);
  const [filters, setFilters] = useState(false);
  const [visible, setVisible] = useState(8);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selected, setSelected] = useState(null);
  const [coverNote, setCoverNote] = useState('');
  const [applying, setApplying] = useState(false);
  const [resume, setResume] = useState(undefined); // undefined = loading, null = none
  const [needResume, setNeedResume] = useState(false);
  const [toast, setToast] = useState(null);

  const say = (text, ok = true) => { setToast({ text, ok }); setTimeout(() => setToast(null), 3800); };

  useEffect(() => { api('/meta').then(setMeta).catch(() => {}); }, []);

  useEffect(() => {
    if (user?.role === 'seeker') api('/me').then((r) => setResume(r.resume)).catch(() => {});
    else setResume(undefined);
  }, [user]);

  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        setError('');
        const p = new URLSearchParams({ q, type, category });
        if (loc === 'near' && coords) p.set('near', coords);
        else if (loc) p.set('loc', loc);
        setJobs(await api(`/jobs?${p}`));
        setVisible(8);
      } catch (e) { setError(e.message); } finally { setLoading(false); }
    }, 250);
    return () => clearTimeout(t);
  }, [q, type, category, loc, coords]);

  const chooseLoc = (v) => {
    if (v !== 'near') { setLoc(v); return; }
    if (!navigator.geolocation) { say('Location is not supported in this browser', false); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => { setCoords(`${p.coords.latitude},${p.coords.longitude}`); setLoc('near'); setLocating(false); },
      () => { setLocating(false); say('Please allow location access to see jobs near you', false); },
      { timeout: 10000 }
    );
  };

  const submit = async () => {
    if (resume === null) { setNeedResume(true); return; }
    try {
      setApplying(true);
      await api(`/jobs/${selected.id}/apply`, { method: 'POST', body: { coverNote } });
      setSelected(null); setCoverNote('');
      say('Application submitted. Good luck!');
    } catch (e) {
      if (e.code === 'RESUME_REQUIRED') { setResume(null); setNeedResume(true); }
      else say(e.message, false);
    } finally { setApplying(false); }
  };

  const afterUpload = (r) => {
    setResume(r);
    if (r) { setNeedResume(false); say('Resume uploaded. Now you can apply!'); }
  };

  const hasFilters = q || type !== 'All' || category !== 'All' || loc;
  const reset = () => { setQ(''); setType('All'); setCategory('All'); setLoc(''); };
  const quick = (p) => (p === 'Remote' ? setLoc('remote') : setQ(p));
  const locLabel = { near: 'Near me', remote: 'Remote', India: 'All of India', International: 'International' }[loc] || loc;
  const stop = (e) => e.stopPropagation();

  const stats = [
    [meta.totals?.jobs ?? 0, 'open roles'],
    [meta.totals?.internships ?? 0, 'internships'],
    [meta.totals?.companies ?? 0, 'companies'],
    [meta.categories.length, 'fields'],
  ];

  return (
    <Page>
      {/* HERO */}
      <section className="grid items-center gap-12 py-8 lg:grid-cols-[1.1fr_.9fr] lg:py-14">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-500/25 bg-brand-500/10 px-4 py-1.5 text-xs font-bold text-brand-700 dark:text-brand-300">
            <span className="h-2 w-2 animate-pulse rounded-full bg-brand-500" /> Jobs & internships across India and abroad
          </span>
          <h1 className="hero-title mt-5 font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
            Find work that moves your career forward.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-ink/60 sm:text-lg">
            Tech, design, finance, healthcare, teaching and more. Discover roles near you, apply in seconds and track every application.
          </p>

          <div className="relative z-20 mt-8 rounded-2xl border border-ink/10 bg-surface/80 p-2 shadow-2xl shadow-brand-600/10 backdrop-blur">
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <label className="flex flex-1 items-center gap-3 px-3">
                <span>🔎</span>
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Job title, company or skill"
                  className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none placeholder:text-ink/40" />
              </label>
              <div className="hidden h-8 w-px bg-ink/10 md:block" />
              <LocationSelect value={loc} onChange={chooseLoc} cities={meta.cities} busy={locating} />
              <button type="button" className="btn-primary h-12 px-7"
                onClick={() => document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' })}>
                {locating ? 'Locating...' : 'Search'}
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-ink/45">Popular:</span>
            {POPULAR.map((p) => (
              <button key={p} onClick={() => quick(p)} className="chip text-ink/70">{p}</button>
            ))}
          </div>

          <div className="mt-8 grid max-w-lg grid-cols-4 gap-3">
            {stats.map(([n, l]) => (
              <div key={l}>
                <CountUp to={n} className="font-display text-3xl font-extrabold" />
                <p className="text-xs font-bold text-ink/50">{l}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <HiringBoard />
      </section>

      {/* RESULTS */}
      <section id="results" className="mt-10 grid scroll-mt-28 gap-8 lg:grid-cols-[260px_1fr]">
        {/* Filters */}
        <div>
          <button onClick={() => setFilters(!filters)} className="btn-ghost mb-3 w-full lg:hidden">
            {filters ? 'Hide filters' : 'Show filters'}
          </button>
          <aside className={`${filters ? 'block' : 'hidden'} lg:sticky lg:top-28 lg:block`}>
            <div className="card space-y-6">
              <div>
                <p className="eyebrow">Type</p>
                <div className="mt-3 grid grid-cols-3 gap-1 rounded-xl bg-ink/5 p-1">
                  {TYPES.map(([v, l]) => (
                    <button key={v} onClick={() => setType(v)}
                      className={`rounded-lg py-2 text-xs font-bold transition ${type === v ? 'bg-surface text-brand-700 shadow dark:text-brand-300' : 'text-ink/55 hover:text-ink'}`}>{l}</button>
                  ))}
                </div>
              </div>
              <div>
                <p className="eyebrow">Field</p>
                <div className="mt-3 max-h-80 space-y-1 overflow-y-auto pr-1">
                  {[{ name: 'All', count: meta.totals?.jobs }, ...meta.categories].map((c) => (
                    <button key={c.name} onClick={() => setCategory(c.name)}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-semibold transition ${category === c.name ? 'bg-brand-500/10 text-brand-700 dark:text-brand-300' : 'text-ink/65 hover:bg-ink/5'}`}>
                      <span>{c.name === 'All' ? 'All fields' : c.name}</span>
                      <span className="text-xs opacity-60">{c.count ?? 0}</span>
                    </button>
                  ))}
                </div>
              </div>
              {hasFilters && <button onClick={reset} className="btn-ghost w-full">Clear all filters</button>}
            </div>
          </aside>
        </div>

        {/* List */}
        <div>
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="eyebrow">Open positions</p>
              <h2 className="mt-1 font-display text-3xl font-extrabold">
                Latest roles
                <span className="ml-3 rounded-full bg-brand-500/10 px-3 py-1 align-middle text-sm text-brand-700 dark:text-brand-300">{jobs.length}</span>
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {loc && <button onClick={() => setLoc('')} className="chip">📍 {locLabel} ✕</button>}
              {category !== 'All' && <button onClick={() => setCategory('All')} className="chip">{category} ✕</button>}
              {q && <button onClick={() => setQ('')} className="chip">“{q}” ✕</button>}
            </div>
          </div>

          {loc === 'near' && <p className="mb-4 text-sm text-ink/55">Sorted by distance from your location. Remote roles appear last.</p>}

          {loading && <div className="space-y-4">{[1, 2, 3, 4].map((n) => <div key={n} className="card h-36 animate-pulse" />)}</div>}

          {error && (
            <div className="card border-rose-500/30 text-center">
              <div className="text-3xl">🔌</div>
              <h3 className="mt-2 text-lg font-extrabold">Can't reach the server</h3>
              <p className="mt-1 text-sm text-ink/60">Start the backend (<code>npm start</code> in the server folder) and refresh. Details: {error}</p>
            </div>
          )}

          {!loading && !error && jobs.length === 0 && (
            <div className="card py-14 text-center">
              <div className="text-4xl">{meta.totals?.jobs === 0 ? '🗄️' : '🔎'}</div>
              <h3 className="mt-3 text-xl font-extrabold">{meta.totals?.jobs === 0 ? 'The database has no jobs yet' : 'No roles found'}</h3>
              <p className="mx-auto mt-2 max-w-sm text-sm text-ink/55">
                {meta.totals?.jobs === 0 ? 'Run "npm run seed" in the server folder to add demo jobs, or post one as a recruiter.' : 'Try another city, field or keyword.'}
              </p>
              {hasFilters && <button onClick={reset} className="btn-primary mt-5">Clear filters</button>}
            </div>
          )}

          <div className="space-y-4">
            <AnimatePresence initial={false}>
              {!loading && jobs.slice(0, visible).map((job, i) => {
                const isNew = Date.now() - new Date(job.createdAt).getTime() < 3 * 864e5;
                return (
                  <motion.article key={job.id} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    transition={{ delay: Math.min(i, 6) * 0.04 }} className="job-row" onClick={() => { setSelected(job); setCoverNote(''); }}>
                    <div className="flex gap-4">
                      <div className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${grad(job.company)} text-xl font-black text-white shadow-lg`}>
                        {job.company?.charAt(0).toUpperCase()}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-display text-lg font-extrabold leading-snug">{job.title}</h3>
                          {isNew && <span className="badge bg-amber-400/20 text-amber-600 dark:text-amber-300">New</span>}
                        </div>
                        <p className="mt-0.5 text-sm text-ink/60">
                          {job.company} · {job.location}
                          {job.distanceKm != null && <span className="ml-2 font-bold text-brand-600 dark:text-brand-300">{job.distanceKm} km away</span>}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className={`badge ${job.type === 'Job' ? 'bg-sky-500/10 text-sky-600 dark:text-sky-300' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300'}`}>{job.type}</span>
                          <span className="badge bg-brand-500/10 text-brand-700 dark:text-brand-300">{job.category}</span>
                          <span className="badge bg-ink/5 text-ink/70">{job.mode}</span>
                          {job.skills?.slice(0, 3).map((s) => <span key={s} className="badge bg-ink/5 text-ink/55">{s}</span>)}
                        </div>
                      </div>

                      <div className="hidden shrink-0 flex-col items-end justify-between text-right sm:flex">
                        <div>
                          <p className="font-display text-base font-extrabold text-brand-700 dark:text-brand-300">{job.pay || 'Not disclosed'}</p>
                          <p className="text-xs text-ink/45">Posted {ago(job.createdAt)}</p>
                        </div>
                        <span className="btn-primary mt-3">View & apply →</span>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between sm:hidden">
                      <p className="font-display text-sm font-extrabold text-brand-700 dark:text-brand-300">{job.pay || 'Not disclosed'}</p>
                      <span className="btn-primary">View & apply →</span>
                    </div>
                  </motion.article>
                );
              })}
            </AnimatePresence>
          </div>

          {!loading && jobs.length > visible && (
            <div className="mt-8 text-center">
              <button onClick={() => setVisible(visible + 8)} className="btn-ghost">Show more ({jobs.length - visible} left)</button>
            </div>
          )}
        </div>
      </section>

      {/* DETAIL DRAWER */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div key="shade" className="fixed inset-0 z-[100] bg-black/55 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelected(null)} />
            <motion.aside key="drawer" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 32, stiffness: 300 }}
              className="fixed inset-y-0 right-0 z-[110] flex w-full max-w-xl flex-col border-l border-ink/10 bg-surface shadow-2xl">
              <div className="flex items-start gap-4 border-b border-ink/10 p-6">
                <div className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${grad(selected.company)} text-xl font-black text-white`}>
                  {selected.company?.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-2xl font-extrabold leading-tight">{selected.title}</h2>
                  <p className="mt-1 text-sm text-ink/60">{selected.company}</p>
                </div>
                <button onClick={() => setSelected(null)} className="rounded-full px-3 py-1.5 text-xl hover:bg-ink/10" aria-label="Close">×</button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-2 gap-3">
                  {[['💰 Pay', selected.pay || 'Not disclosed'], ['📍 Location', selected.location], ['🏢 Work mode', selected.mode], ['🗓 Posted', ago(selected.createdAt)]].map(([l, v]) => (
                    <div key={l} className="rounded-xl bg-ink/5 p-3">
                      <p className="text-xs font-bold text-ink/50">{l}</p>
                      <p className="mt-1 text-sm font-extrabold">{v}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <span className="badge bg-brand-500/10 text-brand-700 dark:text-brand-300">{selected.category}</span>
                  <span className="badge bg-ink/5">{selected.type}</span>
                </div>

                <h3 className="mt-6 text-sm font-extrabold uppercase tracking-wider text-ink/50">About the role</h3>
                <p className="mt-2 text-sm leading-7 text-ink/75">{selected.description}</p>

                <h3 className="mt-6 text-sm font-extrabold uppercase tracking-wider text-ink/50">Skills</h3>
                <div className="mt-2 flex flex-wrap gap-2">{selected.skills?.map((s) => <span key={s} className="badge bg-ink/5 text-ink/75">{s}</span>)}</div>

                {user?.role === 'seeker' && (
                  <>
                    {resume !== undefined && (
                      <div className={`mt-6 flex items-center justify-between gap-3 rounded-xl border p-3 text-sm ${resume ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-amber-500/40 bg-amber-500/10'}`}>
                        <span className="min-w-0 truncate font-bold">{resume ? `📄 ${resume.name}` : '⚠ No resume uploaded yet'}</span>
                        <button className="chip shrink-0" onClick={() => setNeedResume(true)}>{resume ? 'Change' : 'Upload'}</button>
                      </div>
                    )}
                    <label className="mt-6 block text-sm font-bold">Cover note <span className="font-normal text-ink/45">(optional)</span></label>
                    <textarea className="input mt-2 min-h-28 resize-none" placeholder="Tell the recruiter why you're a good fit..." value={coverNote} onChange={(e) => setCoverNote(e.target.value)} />
                  </>
                )}
              </div>

              <div className="border-t border-ink/10 p-5">
                {!user ? (
                  <button onClick={() => navigate('/login')} className="btn-primary w-full">Log in to apply</button>
                ) : user.role !== 'seeker' ? (
                  <p className="rounded-xl bg-amber-500/10 p-3 text-center text-sm font-bold text-amber-700 dark:text-amber-300">Recruiters cannot apply to jobs.</p>
                ) : (
                  <button onClick={submit} disabled={applying} className="btn-primary w-full py-3">{applying ? 'Submitting...' : 'Submit application'}</button>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* RESUME REQUIRED POP-UP */}
      <AnimatePresence>
        {needResume && (
          <motion.div className="fixed inset-0 z-[130] grid place-items-center bg-black/60 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setNeedResume(false)}>
            <motion.div onClick={stop} initial={{ opacity: 0, scale: 0.92, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.92 }}
              className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl border border-ink/10 bg-surface p-6 shadow-2xl">
              <div className="text-4xl">📄</div>
              <h3 className="mt-3 font-display text-2xl font-extrabold">{resume ? 'Change your resume' : 'Upload your resume first'}</h3>
              <p className="mt-2 text-sm leading-6 text-ink/60">
                {resume ? 'Upload a new PDF to replace the current one.' : 'Recruiters need your resume (PDF) to review your application. Upload it once and apply to as many roles as you like.'}
              </p>
              <div className="mt-5"><ResumeUploader resume={resume} onChange={afterUpload} /></div>
              <div className="mt-4 flex gap-2">
                <Link to="/profile" onClick={() => setNeedResume(false)} className="btn-ghost flex-1">Go to profile</Link>
                <button onClick={() => setNeedResume(false)} className="btn-ghost">{resume ? 'Done' : 'Later'}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOAST */}
      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[140] flex justify-center px-4">
        <AnimatePresence>
          {toast && (
            <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
              className={`rounded-2xl px-5 py-3 text-sm font-bold text-white shadow-2xl ${toast.ok ? 'bg-emerald-600' : 'bg-rose-600'}`}>
              {toast.ok ? '✅' : '⚠️'} {toast.text}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Page>
  );
}