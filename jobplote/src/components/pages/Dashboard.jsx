import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { api, openPdf } from '../../api';
import { useAuth } from '../../context/AuthContext';
import Page from '../Page';
import CountUp from '../CountUp';
import StatusBadge from '../StatusBadge';
import { ago, grad } from '../../utils';

const COLS = {
  Applied: { dot: 'bg-sky-500', bar: 'bg-sky-500', head: 'text-sky-600 dark:text-sky-300', box: 'border-sky-500/20 bg-sky-500/[0.04]' },
  Shortlisted: { dot: 'bg-amber-500', bar: 'bg-amber-500', head: 'text-amber-600 dark:text-amber-300', box: 'border-amber-500/20 bg-amber-500/[0.04]' },
  Hired: { dot: 'bg-emerald-500', bar: 'bg-emerald-500', head: 'text-emerald-600 dark:text-emerald-300', box: 'border-emerald-500/20 bg-emerald-500/[0.04]' },
  Rejected: { dot: 'bg-rose-500', bar: 'bg-rose-500', head: 'text-rose-600 dark:text-rose-300', box: 'border-rose-500/20 bg-rose-500/[0.04]' },
};
const ACTIONS = {
  Applied: [['Shortlisted', 'Shortlist'], ['Rejected', 'Reject']],
  Shortlisted: [['Hired', 'Hire'], ['Rejected', 'Reject']],
  Hired: [['Applied', 'Reopen']],
  Rejected: [['Applied', 'Reopen']],
};
const EMPTY = { jobs: [], applications: [], stats: { online: { seekers: 0, recruiters: 0 }, totalSeekers: 0, days: [] } };

function Live() {
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
    </span>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('pipeline');
  const [q, setQ] = useState('');
  const [jobFilter, setJobFilter] = useState('All');
  const [openNote, setOpenNote] = useState(null);
  const [toast, setToast] = useState('');
  const known = useRef(null);

  const load = useCallback(async () => {
    try {
      const r = await api('/recruiter/overview');
      if (known.current) {
        const fresh = r.applications.filter((a) => !known.current.has(a.id));
        if (fresh.length) { setToast(`New application: ${fresh[0].applicant?.name} applied for ${fresh[0].jobTitle}`); setTimeout(() => setToast(''), 5000); }
      }
      known.current = new Set(r.applications.map((a) => a.id));
      setData(r); setError('');
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load]);

  const move = async (id, status) => {
    try { await api(`/applications/${id}`, { method: 'PATCH', body: { status } }); load(); } catch (e) { setError(e.message); }
  };
  const removeJob = async (id) => {
    if (!confirm('Delete this job and all its applications?')) return;
    try { await api(`/jobs/${id}`, { method: 'DELETE' }); load(); } catch (e) { setError(e.message); }
  };

  const { jobs, applications: apps, stats } = data;
  const by = (s) => apps.filter((a) => a.status === s).length;
  const today = apps.filter((a) => Date.now() - new Date(a.createdAt).getTime() < 864e5).length;
  const rate = apps.length ? Math.round((by('Hired') / apps.length) * 100) : 0;
  const maxDay = Math.max(1, ...stats.days.map((d) => d.count));
  const recent = apps.slice(0, 6);
  const shown = apps.filter((a) =>
    (jobFilter === 'All' || a.jobId === jobFilter) &&
    `${a.applicant?.name} ${a.applicant?.email} ${a.jobTitle}`.toLowerCase().includes(q.toLowerCase()));

  const tiles = [
    { label: 'Total applications', value: apps.length, sub: `+${today} in last 24h`, icon: '📥', tone: 'from-sky-500/20 to-transparent' },
    { label: 'Active now', value: stats.online.seekers, sub: `${stats.totalSeekers} registered seekers`, icon: '🟢', tone: 'from-emerald-500/20 to-transparent', live: true },
    { label: 'Shortlisted', value: by('Shortlisted'), sub: 'Waiting for your decision', icon: '⭐', tone: 'from-amber-500/20 to-transparent' },
    { label: 'Hired', value: by('Hired'), sub: `${rate}% hire rate`, icon: '🎉', tone: 'from-violet-500/20 to-transparent' },
    { label: 'Open roles', value: jobs.length, sub: `${jobs.filter((j) => j.type === 'Internship').length} internships`, icon: '💼', tone: 'from-rose-500/20 to-transparent' },
  ];

  return (
    <Page>
      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="banner-grad relative overflow-hidden rounded-[28px] p-7 text-white shadow-2xl shadow-brand-900/30 sm:p-10">
        <div className="pointer-events-none absolute inset-0 opacity-30"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.12) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.12) 1px,transparent 1px)', backgroundSize: '36px 36px' }} />
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="relative z-10 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-emerald-200"><Live /> Recruiter workspace · live</p>
            <h1 className="mt-3 font-display text-3xl font-extrabold sm:text-4xl">Good to see you, {user?.name?.split(' ')[0]} 👋</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-emerald-100/80">New applications show up here automatically. Review resumes, move candidates through the pipeline and track your hiring in real time.</p>
          </div>
          <Link to="/post" className="btn shadow-lg hover:-translate-y-0.5">+ Post a job</Link>
        </div>
      </motion.section>

      {error && <div className="mt-5 rounded-2xl bg-rose-500/10 p-4 text-sm font-bold text-rose-600">{error}</div>}

      <section className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        {tiles.map((t, i) => (
          <motion.div key={t.label} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            className={`stat-card bg-gradient-to-br ${t.tone} ${i === 0 ? 'col-span-2 lg:col-span-1' : ''}`}>
            <div className="flex items-center justify-between"><span className="text-2xl">{t.icon}</span>{t.live && <Live />}</div>
            <CountUp to={loading ? 0 : t.value} className="mt-4 block font-display text-4xl font-extrabold" />
            <p className="mt-1 text-sm font-bold">{t.label}</p>
            <p className="mt-0.5 text-xs text-ink/50">{t.sub}</p>
          </motion.div>
        ))}
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <div className="flex items-start justify-between">
            <div><p className="eyebrow">Last 7 days</p><h2 className="mt-1 font-display text-xl font-extrabold">Applications received</h2></div>
            <span className="rounded-full bg-brand-500/10 px-3 py-1 text-xs font-bold text-brand-700 dark:text-brand-300">{stats.days.reduce((s, d) => s + d.count, 0)} this week</span>
          </div>
          <div className="mt-6 flex h-48 items-stretch gap-2 sm:gap-4">
            {stats.days.map((d, i) => (
              <div key={d.key} className="flex flex-1 flex-col items-center gap-2">
                <span className="text-xs font-bold text-ink/60">{d.count}</span>
                <div className="flex w-full flex-1 items-end">
                  <motion.div initial={{ height: 0 }} animate={{ height: `${Math.max(6, (d.count / maxDay) * 100)}%` }} transition={{ delay: i * 0.06, duration: 0.6 }}
                    className={`w-full rounded-t-xl ${i === 6 ? 'bg-gradient-to-t from-brand-600 to-brand-300' : 'bg-gradient-to-t from-ink/10 to-ink/25'}`} />
                </div>
                <span className="text-[11px] font-bold text-ink/45">{d.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between"><h2 className="font-display text-xl font-extrabold">Live activity</h2><Live /></div>
          <div className="mt-4 space-y-3">
            {recent.map((a) => (
              <div key={a.id} className="flex items-center gap-3">
                <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br ${grad(a.applicant?.name)} text-sm font-black text-white`}>{a.applicant?.name?.charAt(0)}</div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{a.applicant?.name}</p>
                  <p className="truncate text-xs text-ink/50">{a.jobTitle} · {ago(a.createdAt)}</p>
                </div>
                <StatusBadge status={a.status} />
              </div>
            ))}
            {!recent.length && <p className="py-8 text-center text-sm text-ink/45">Applications will appear here the moment candidates apply.</p>}
          </div>
        </div>
      </section>

      <section className="mt-10">
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="inline-flex self-start rounded-xl border border-ink/10 bg-surface/70 p-1">
            {[['pipeline', 'Hiring pipeline'], ['jobs', 'My jobs']].map(([k, l]) => (
              <button key={k} onClick={() => setTab(k)} className={`rounded-lg px-4 py-2 text-sm font-bold transition ${tab === k ? 'bg-ink text-paper' : 'text-ink/60 hover:text-ink'}`}>{l}</button>
            ))}
          </div>
          {tab === 'pipeline' && (
            <div className="flex flex-col gap-2 sm:flex-row">
              <input className="input sm:w-64" placeholder="Search candidate or role" value={q} onChange={(e) => setQ(e.target.value)} />
              <select className="input sm:w-52" value={jobFilter} onChange={(e) => setJobFilter(e.target.value)}>
                <option value="All">All jobs</option>
                {jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
              </select>
            </div>
          )}
        </div>

        {tab === 'pipeline' ? (
          <>
            <div className="card mb-5 !p-4">
              <div className="flex h-2.5 overflow-hidden rounded-full bg-ink/10">
                {Object.keys(COLS).map((s) => (
                  <motion.div key={s} className={COLS[s].bar} initial={{ width: 0 }} animate={{ width: `${apps.length ? (by(s) / apps.length) * 100 : 0}%` }} transition={{ duration: 0.7 }} />
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs font-bold text-ink/60">
                {Object.keys(COLS).map((s) => <span key={s} className="flex items-center gap-1.5"><i className={`h-2 w-2 rounded-full ${COLS[s].dot}`} />{s} · {by(s)}</span>)}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {Object.keys(COLS).map((col) => {
                const list = shown.filter((a) => a.status === col);
                return (
                  <div key={col} className={`rounded-2xl border p-3 ${COLS[col].box}`}>
                    <div className="mb-3 flex items-center justify-between px-1">
                      <span className={`flex items-center gap-2 text-sm font-extrabold ${COLS[col].head}`}><i className={`h-2 w-2 rounded-full ${COLS[col].dot}`} />{col}</span>
                      <span className="rounded-full bg-ink/10 px-2 py-0.5 text-xs font-bold">{list.length}</span>
                    </div>
                    <div className="space-y-3">
                      <AnimatePresence initial={false}>
                        {list.map((a) => {
                          const isNew = Date.now() - new Date(a.createdAt).getTime() < 864e5;
                          return (
                            <motion.div key={a.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                              className="rounded-xl border border-ink/10 bg-surface p-3.5 shadow-sm">
                              <div className="flex items-start gap-3">
                                <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br ${grad(a.applicant?.name)} text-sm font-black text-white`}>{a.applicant?.name?.charAt(0)}</div>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-extrabold">
                                    {a.applicant?.name}
                                    {isNew && <span className="ml-2 rounded bg-brand-500 px-1.5 py-0.5 text-[10px] font-bold text-white">NEW</span>}
                                  </p>
                                  <p className="truncate text-xs text-ink/55">{a.jobTitle} · {ago(a.createdAt)}</p>
                                  {(a.applicant?.headline || a.applicant?.city) && (
                                    <p className="truncate text-xs text-ink/45">{[a.applicant.headline, a.applicant.city].filter(Boolean).join(' · ')}</p>
                                  )}
                                </div>
                              </div>
                              {a.coverNote && (
                                <button onClick={() => setOpenNote(openNote === a.id ? null : a.id)}
                                  className={`mt-3 w-full text-left text-xs leading-5 text-ink/60 ${openNote === a.id ? '' : 'line-clamp-2'}`}>{a.coverNote}</button>
                              )}
                              <div className="mt-3 flex flex-wrap items-center gap-2">
                                {ACTIONS[col].map(([to, label]) => (
                                  <button key={to} onClick={() => move(a.id, to)} className={`chip ${to === 'Rejected' ? 'hover:!border-rose-500/40 hover:!bg-rose-500/10' : ''}`}>{label}</button>
                                ))}
                                <span className="ml-auto flex gap-2">
                                  {a.applicant?.hasResume && (
                                    <button onClick={() => openPdf(`/applications/${a.id}/resume`).catch((e) => setError(e.message))} className="chip">📄 Resume</button>
                                  )}
                                  <a href={`mailto:${a.applicant?.email}`} className="chip" title={a.applicant?.email}>✉</a>
                                </span>
                              </div>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                      {!list.length && <p className="rounded-xl border border-dashed border-ink/15 p-6 text-center text-xs text-ink/40">Nothing here yet</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {jobs.map((j, i) => {
              const list = apps.filter((a) => a.jobId === j.id);
              const pct = apps.length ? (list.length / apps.length) * 100 : 0;
              return (
                <motion.div key={j.id} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.05 }} className="card">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className={`badge ${j.type === 'Job' ? 'bg-sky-500/10 text-sky-600 dark:text-sky-300' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300'}`}>{j.type}</span>
                      <h3 className="mt-3 font-display text-lg font-extrabold">{j.title}</h3>
                      <p className="mt-1 text-sm text-ink/55">📍 {j.location} · {ago(j.createdAt)}</p>
                    </div>
                    <button onClick={() => removeJob(j.id)} className="chip hover:!border-rose-500/40 hover:!bg-rose-500/10" title="Delete job">🗑</button>
                  </div>
                  <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                    {[['Applied', list.length], ['Shortlist', list.filter((a) => a.status === 'Shortlisted').length], ['Hired', list.filter((a) => a.status === 'Hired').length]].map(([l, n]) => (
                      <div key={l} className="rounded-xl bg-ink/5 p-2.5"><p className="font-display text-xl font-extrabold">{n}</p><p className="text-[10px] font-bold uppercase tracking-wider text-ink/45">{l}</p></div>
                    ))}
                  </div>
                  <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-ink/10">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-300" />
                  </div>
                  <p className="mt-1.5 text-xs text-ink/45">{Math.round(pct)}% of all your applications</p>
                </motion.div>
              );
            })}
            {!jobs.length && !loading && (
              <div className="card py-14 text-center md:col-span-2 lg:col-span-3">
                <div className="text-4xl">💼</div>
                <h3 className="mt-3 text-lg font-extrabold">No jobs posted yet</h3>
                <Link to="/post" className="btn-primary mt-4">Create your first job</Link>
              </div>
            )}
          </div>
        )}
      </section>

      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[110] flex justify-center px-4">
        <AnimatePresence>
          {toast && (
            <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} className="rounded-2xl bg-ink px-5 py-3 text-sm font-bold text-paper shadow-2xl">🔔 {toast}</motion.div>
          )}
        </AnimatePresence>
      </div>
    </Page>
  );
}