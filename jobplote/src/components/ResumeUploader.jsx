import { useRef, useState } from 'react';
import { api, openPdf, upload } from '../api';
import { fmtSize } from '../utils';

export default function ResumeUploader({ resume, onChange }) {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [err, setErr] = useState('');

  const pick = async (file) => {
    if (!file) return;
    if (!/\.pdf$/i.test(file.name) || (file.type && file.type !== 'application/pdf')) return setErr('Only PDF files are allowed');
    if (file.size > 5 * 1024 * 1024) return setErr('PDF must be under 5 MB');
    setBusy(true); setErr('');
    try { const r = await upload('/me/resume', file); onChange(r.resume); }
    catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  const remove = async () => {
    try { await api('/me/resume', { method: 'DELETE' }); onChange(null); }
    catch (e) { setErr(e.message); }
  };

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files[0]); }}
        className={`rounded-2xl border-2 border-dashed p-6 text-center transition ${drag ? 'border-brand-500 bg-brand-500/10' : 'border-ink/15 bg-ink/[0.03]'}`}
      >
        <div className="text-3xl">📄</div>
        <p className="mt-2 text-sm font-bold">{resume ? 'Replace your resume' : 'Drag your resume here, or click upload'}</p>
        <p className="mt-1 text-xs text-ink/50">PDF only, up to 5 MB</p>
        <button type="button" disabled={busy} onClick={() => input.current?.click()} className="btn-primary mt-4">
          {busy ? 'Uploading...' : resume ? 'Choose new PDF' : 'Upload PDF'}
        </button>
        <input ref={input} type="file" accept="application/pdf,.pdf" hidden onChange={(e) => { pick(e.target.files[0]); e.target.value = ''; }} />
      </div>

      {resume && (
        <div className="mt-3 flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
          <span className="text-xl">✅</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{resume.name}</p>
            <p className="text-xs text-ink/55">{fmtSize(resume.size)}</p>
          </div>
          <button type="button" className="chip" onClick={() => openPdf('/me/resume').catch((e) => setErr(e.message))}>View</button>
          <button type="button" className="chip hover:!border-rose-500/40" onClick={remove}>Remove</button>
        </div>
      )}

      {err && <p role="alert" className="mt-3 rounded-xl bg-rose-500/10 px-4 py-2.5 text-sm font-bold text-rose-600">{err}</p>}
    </div>
  );
}