import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../../api';
import Page from '../Page';

function Field({ label, hint, wide, children }) {
  return (
    <div className={wide ? 'sm:col-span-2' : ''}>
      <label className="mb-2 block text-sm font-bold">{label}</label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-ink/45">{hint}</p>}
    </div>
  );
}

export default function PostJob() {
  const navigate = useNavigate();
  const [meta, setMeta] = useState({ categories: [], cities: [] });
  const [form, setForm] = useState({
    title: '', type: 'Internship', category: 'Technology', mode: 'On-site',
    city: 'Delhi', pay: '', skills: '', description: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { api('/meta').then(setMeta).catch(() => {}); }, []);

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const india = meta.cities.filter((c) => c.region === 'India');
  const abroad = meta.cities.filter((c) => c.region === 'International');

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError('');
    try {
      await api('/jobs', {
        method: 'POST',
        body: {
          ...form,
          city: form.mode === 'Remote' ? 'Remote' : form.city,
          skills: form.skills.split(',').map((s) => s.trim()).filter(Boolean),
        },
      });
      navigate('/dashboard');
    } catch (x) { setError(x.message); } finally { setBusy(false); }
  };

  return (
    <Page className="max-w-3xl">
      <motion.form onSubmit={submit} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-600 dark:text-brand-300">Recruiter tools</p>
        <h1 className="mt-2 font-display text-3xl font-extrabold">Post a new opportunity</h1>
        <p className="mt-2 text-sm text-ink/55">Jobs and internships in any field, in any city.</p>

        <div className="mt-7 grid gap-5 sm:grid-cols-2">
          <Field label="Title" wide>
            <input className="input" placeholder="e.g. Content Writer Intern" value={form.title} onChange={update('title')} required />
          </Field>

          <Field label="Type">
            <select className="input" value={form.type} onChange={update('type')}>
              <option>Internship</option><option>Job</option>
            </select>
          </Field>

          <Field label="Category">
            <select className="input" value={form.category} onChange={update('category')}>
              {meta.categories.map((c) => <option key={c.name}>{c.name}</option>)}
            </select>
          </Field>

          <Field label="Work mode">
            <select className="input" value={form.mode} onChange={update('mode')}>
              <option>On-site</option><option>Hybrid</option><option>Remote</option>
            </select>
          </Field>

          <Field label="City" hint={form.mode === 'Remote' ? 'Remote roles do not need a city' : undefined}>
            <select className="input" value={form.city} onChange={update('city')} disabled={form.mode === 'Remote'}>
              <optgroup label="India">{india.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}</optgroup>
              <optgroup label="International">{abroad.map((c) => <option key={c.name} value={c.name}>{c.name}, {c.country}</option>)}</optgroup>
            </select>
          </Field>

          <Field label="Stipend / salary" hint="Example: ₹10,000/month or ₹4-6 LPA" wide>
            <input className="input" placeholder="₹10,000/month" value={form.pay} onChange={update('pay')} />
          </Field>

          <Field label="Skills" hint="Separate with commas" wide>
            <input className="input" placeholder="Excel, Communication, Writing" value={form.skills} onChange={update('skills')} />
          </Field>

          <Field label="Description" wide>
            <textarea className="input min-h-40 resize-none" placeholder="Describe the role, responsibilities and requirements..."
              value={form.description} onChange={update('description')} required />
          </Field>
        </div>

        {error && <div className="mt-5 rounded-xl bg-rose-500/10 p-3 text-sm font-bold text-rose-600">{error}</div>}

        <button disabled={busy} className="btn-primary mt-6 w-full">{busy ? 'Publishing...' : 'Publish'}</button>
      </motion.form>
    </Page>
  );
}