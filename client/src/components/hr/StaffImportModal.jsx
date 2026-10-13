import { useEffect, useState } from 'react';
import { Download, Upload, Loader2 } from 'lucide-react';
import Modal from '../common/Modal';
import { api } from '../../lib/api';

const headers = ['staff_id', 'first_name', 'last_name', 'email', 'phone', 'department', 'position', 'work_location', 'hire_date'];
function downloadCsv(filename, rows) {
  const escape = value => '"' + String(value ?? '').replace(/^[=+@\-\t\r]/, "'$&").replaceAll('"', '""') + '"';
  const url = URL.createObjectURL(new Blob(['\uFEFF' + rows.map(row => row.map(escape).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function StaffImportModal({ isOpen, onClose, onImported, locations = [] }) {
  const [file, setFile] = useState(null);
  const [locationId, setLocationId] = useState('');
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [credentialsSaved, setCredentialsSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { if (isOpen) { setFile(null); setLocationId(''); setPreview(null); setResult(null); setCredentialsSaved(false); setError(''); } }, [isOpen]);
  async function submit(commit) {
    if (!file) return;
    setBusy(true); setError('');
    try {
      const form = new FormData(); form.append('file', file); form.append('location_id', locationId);
      const data = await api.post(`/hr/employees/import${commit ? '' : '/preview'}`, form, { requireOnline: true });
      if (commit) { setResult(data); setPreview(null); onImported?.(); } else setPreview(data);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  const close = () => {
    if (busy) return;
    if (result?.accounts.length && !credentialsSaved) { setError('Download the new account credentials before closing this screen.'); return; }
    onClose();
  };
  return <Modal title="Import staff" subtitle="Upload your HR directory as CSV or Excel. Preview every row before creating accounts." isOpen={isOpen} onClose={close} maxWidth="max-w-4xl">
    <div className="space-y-4 text-sm">
      {error && <p role="alert" className="rounded-lg bg-red-500/10 p-3 text-red-600">{error}</p>}
      {!result && <>
        <button type="button" onClick={() => downloadCsv('staff-import-template.csv', [headers])} className="flex items-center gap-2 text-orange-600 font-semibold"><Download size={16} />Download blank CSV template</button>
        <p className="text-zinc-500">Include first and last names, and an email or Nigerian phone number. Keep staff IDs as text to preserve leading zeros. Use YYYY-MM-DD for hire dates. Up to 500 staff, 5 MB per file.</p>
        <label className="block font-semibold" htmlFor="staff-import-file">Staff file</label>
        <input id="staff-import-file" type="file" accept=".csv,.xlsx" disabled={busy} onChange={event => { setFile(event.target.files?.[0] || null); setPreview(null); setError(''); }} className="block w-full rounded-lg border border-zinc-300 dark:border-zinc-700 p-3" />
        <label className="block font-semibold" htmlFor="staff-import-location">Default work location</label>
        <select id="staff-import-location" value={locationId} disabled={busy} onChange={event => { setLocationId(event.target.value); setPreview(null); }} className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-3">
          <option value="">Leave unassigned</option>{locations.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}
        </select>
        <p className="text-xs text-zinc-500">The work_location column overrides this default and must match an active office name. Create offices in Location Assignments. Existing staff are skipped; their details are kept.</p>
        <button type="button" disabled={!file || busy} onClick={() => submit(false)} className="btn-primary flex items-center gap-2 disabled:opacity-50">{busy ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}Preview file</button>
      </>}
      {preview && <>
        <p role="status" className="font-semibold">{preview.ready} ready · {preview.skipped} existing · {preview.invalid} invalid</p>
        <div className="overflow-auto max-h-72 rounded-lg border border-zinc-200 dark:border-zinc-700">
          <table className="w-full text-left text-xs"><thead><tr className="bg-zinc-100 dark:bg-zinc-800">{['Row', 'Staff ID', 'Name', 'Contact', 'Work location', 'Result'].map(label => <th key={label} className="p-2">{label}</th>)}</tr></thead><tbody>
            {preview.rows.map(row => <tr key={row.row} className="border-t border-zinc-200 dark:border-zinc-700"><td className="p-2">{row.row}</td><td className="p-2">{row.staff_id || 'Auto'}</td><td className="p-2">{row.name}</td><td className="p-2">{row.email || row.phone}</td><td className="p-2">{row.work_location || 'Unassigned'}</td><td className={`p-2 ${row.errors.length ? 'text-red-600' : ''}`}>{row.errors.join(' ') || (row.action === 'skip' ? 'Existing — skip' : 'Ready')}</td></tr>)}
          </tbody></table>
        </div>
        <button type="button" disabled={busy || preview.invalid > 0 || !preview.ready} onClick={() => submit(true)} className="btn-primary disabled:opacity-50">{busy ? 'Importing…' : `Import ${preview.ready} staff`}</button>
        <p className="text-xs text-zinc-500">New accounts receive unique temporary passwords and must change them on first sign-in. Download credentials after import and share each password securely with its owner.</p>
      </>}
      {result && <>
        <p role="status" className="rounded-lg bg-emerald-500/10 p-3 text-emerald-700 dark:text-emerald-400 font-semibold">{result.created} staff imported · {result.skipped} existing skipped · {result.errors.length} failed</p>
        {result.errors.map(row => <p key={row.row} className="text-red-600">Row {row.row}, {row.name}: {row.message}</p>)}
        {result.accounts.length > 0 && <><button type="button" className="btn-primary flex items-center gap-2" onClick={() => { const fields = ['name', 'staff_id', 'email', 'phone', 'temporary_password']; downloadCsv('new-staff-credentials.csv', [fields, ...result.accounts.map(account => fields.map(field => account[field]))]); setCredentialsSaved(true); }}><Download size={16} />Download new account credentials</button><p className="text-zinc-500">Save this file before closing. Each staff member must change their temporary password. Credentials are not stored in this browser.</p></>}
        {result.errors.length > 0 && <p className="text-zinc-500">Correct the reported rows and upload the file again. Successfully imported staff will be skipped.</p>}
      </>}
    </div>
  </Modal>;
}
