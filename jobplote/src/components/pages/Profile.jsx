import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';
import Page from '../Page';
import CountUp from '../CountUp';
import ResumeUploader from '../ResumeUploader';
import { grad } from '../../utils';

function Field({ label, hint, wide, children }) {
  return (
    <div className={wide ? 'sm:col-span-2' : ''}>
      <label className="mb-2 block text-sm font-bold">{label}</label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-ink/45">{hint}</p>}
    </div>
  );
}

export default function Profile() {
  const { user, token, login } = useAuth();
  const isRec = user.role === 'recruiter';
  const [f, setF] = useState(null);
  const [stats, setStats] = useState({});
  const [resume, setResume] = useState(null);
  const [cities, setCities] = useState([]);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const [pw, setPw] = useState({ current: '', next: '' });

  const say = (text, ok = true) => { setToast({ text, ok }); setTimeout(() => setToast(null), 3500); };

  useEffect(() => {
    api('/me')
      .then(({ user: u, stats: s, resume: r }) => { setF({ ...u, skills: (u.skills || []).join(', ') }); setStats(s); setResume(r || null); })
      .catch((e) => say(e.message, false));
    api('/meta').then((m) => setCities(m.cities)).catch(() => {});
  }, []);

  if (!f) return <Page><div className="card h-80 animate-pulse" /></Page>;

  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const checks = isRec ? [f.phone, f.city, f.company, f.website, f.about] : [f.phone, f.city, f.headline, f.bio, f.skills, f.education, resume];
  const pct = Math.round((checks.filter(Boolean).length / checks.length) * 100);

  const save = async (e) => {
    e.preventDefault(); setBusy(true);
    try {
      const { user: u } = await api('/me', { method: 'PUT', body: f });
      login({ token, user: { ...user, name: u.name } });
      setF({ ...u, skills: (u.skills || []).join(', ') });
      say('Profile saved');
    } catch (x) { say(x.message, false); } finally { setBusy(false); }
  };

  const changePw = async (e) => {
    e.preventDefault();
    try { await api('/me/password', { method: 'POST', body: pw }); setPw({ current: '', next: '' }); say('Password updated'); }
    catch (x) { say(x.message, false); }
  };

  const tiles = isRec
    ? [['Open roles', stats.jobs], ['Applicants', stats.applicants], ['Hired', stats.hired]]
    : [['Applied', stats.applied], ['Shortlisted', stats.shortlisted], ['Hired', stats.hired]];

  return (
    <Page>
      <div className="grid gap-6 lg:grid-cols-[330px_1fr]">
        <aside className="space-y-4 lg:sticky lg:top-28 lg:self-start">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card text-center">
            <div className={`mx-auto grid h-24 w-24 place-items-center rounded-3xl bg-gradient-to-br ${grad(f.name)} text-4xl font-black text-white shadow-xl`}>{f.name.charAt(0).toUpperCase()}</div>
            <h1 className="mt-4 font-display text-2xl font-extrabold">{f.name}</h1>
            <p className="text-sm text-ink/55">{isRec ? f.company : f.headline || 'Add a headline below'}</p>
            <span className="badge mt-3 bg-brand-500/10 text-brand-700 dark:text-brand-300">{isRec ? 'Recruiter' : 'Job seeker'}</span>
            <div className="mt-5 space-y-2 text-left text-sm">
              <p className="flex gap-2"><span>✉</span><span className="break-all">{f.email}</span></p>
              {f.phone && <p className="flex gap-2"><span>📞</span>{f.phone}</p>}
              {f.city && <p className="flex gap-2"><span>📍</span>{f.city}</p>}
              <p className="pt-1 text-xs text-ink/45">Member since {new Date(f.createdAt).toLocaleDateString()}</p>
            </div>
          </motion.div>

          <div className="card">
            <div className="flex items-center justify-between text-sm font-bold">
              <span>Profile completeness</span><span className="text-brand-600 dark:text-brand-300">{pct}%</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink/10">
              <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-300" />
            </div>
            <p className="mt-2 text-xs text-ink/50">{pct < 100 ? 'A complete profile gets noticed faster.' : 'Your profile is complete. Great job!'}</p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {tiles.map(([l, n]) => (
              <div key={l} className="stat-card !p-4 text-center">
                <CountUp to={n || 0} className="font-display text-2xl font-extrabold text-brand-600 dark:text-brand-300" />
                <p className="mt-1 text-[11px] font-bold text-ink/50">{l}</p>
              </div>
            ))}
          </div>
        </aside>

        <div className="space-y-6">
          {!isRec && (
            <div className="card">
              <p className="eyebrow">Required to apply</p>
              <h2 className="mt-1 font-display text-2xl font-extrabold">Your resume</h2>
              <p className="mb-5 mt-1 text-sm text-ink/55">Recruiters see this PDF when you apply to their jobs.</p>
              <ResumeUploader resume={resume} onChange={(r) => { setResume(r); say(r ? 'Resume uploaded' : 'Resume removed'); }} />
            </div>
          )}

          <form onSubmit={save} className="card">
            <p className="eyebrow">Your details</p>
            <h2 className="mt-1 font-display text-2xl font-extrabold">Edit profile</h2>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <Field label="Full name"><input className="input" value={f.name} onChange={set('name')} required /></Field>
              <Field label="Email" hint="Email cannot be changed"><input className="input opacity-60" value={f.email} disabled /></Field>
              <Field label="Phone"><input className="input" placeholder="+91 98765 43210" value={f.phone} onChange={set('phone')} /></Field>
              <Field label="City / location">
                <input className="input" list="city-list" placeholder="Start typing your city" value={f.city} onChange={set('city')} />
                <datalist id="city-list">{cities.map((c) => <option key={c.name} value={c.name} />)}</datalist>
              </Field>

              {isRec ? (
                <>
                  <Field label="Company name"><input className="input" value={f.company || ''} onChange={set('company')} /></Field>
                  <Field label="Website"><input className="input" placeholder="https://yourcompany.com" value={f.website} onChange={set('website')} /></Field>
                  <Field label="About the company" wide><textarea className="input min-h-28 resize-none" value={f.about} onChange={set('about')} placeholder="What does your company do?" /></Field>
                </>
              ) : (
                <>
                  <Field label="Headline" wide><input className="input" placeholder="e.g. Marketing student | Content writer" value={f.headline} onChange={set('headline')} /></Field>
                  <Field label="About me" wide><textarea className="input min-h-28 resize-none" value={f.bio} onChange={set('bio')} placeholder="A few lines about you" /></Field>
                  <Field label="Skills" hint="Separate with commas"><input className="input" placeholder="Excel, Writing, Figma" value={f.skills} onChange={set('skills')} /></Field>
                  <Field label="Education"><input className="input" placeholder="B.A. English, University of Kashmir" value={f.education} onChange={set('education')} /></Field>
                  <Field label="LinkedIn" wide><input className="input" placeholder="https://linkedin.com/in/..." value={f.linkedin} onChange={set('linkedin')} /></Field>
                </>
              )}
            </div>

            <label className="mt-6 flex cursor-pointer items-center gap-3 rounded-xl border border-ink/10 bg-ink/[0.03] p-4">
              <input type="checkbox" className="h-4 w-4 accent-[rgb(var(--b600))]" checked={!!f.notifyEmail} onChange={set('notifyEmail')} />
              <span className="text-sm"><b>Email me</b> when {isRec ? 'someone applies to my jobs' : 'a recruiter updates my application'}</span>
            </label>

            <button disabled={busy} className="btn-primary mt-6 w-full sm:w-auto">{busy ? 'Saving...' : 'Save changes'}</button>
          </form>

          <form onSubmit={changePw} className="card">
            <h2 className="font-display text-xl font-extrabold">Change password</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <input className="input" type="password" placeholder="Current password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} required />
              <input className="input" type="password" placeholder="New password (6+ characters)" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} required />
            </div>
            <button className="btn-ghost mt-4">Update password</button>
          </form>
        </div>
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[110] flex justify-center px-4">
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