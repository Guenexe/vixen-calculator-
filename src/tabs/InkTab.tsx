import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { db, type InkEntry } from '../db/db'
import { fmt } from '../utils/format'

const EMPTY: Omit<InkEntry, 'id'> = { printer: '', ink: '', color: '', costPerPage: 0 }

export default function InkTab() {
  const entries = useLiveQuery(() => db.ink.orderBy('printer').toArray(), [])
  const [form, setForm]     = useState<Omit<InkEntry, 'id'>>(EMPTY)
  const [editId, setEditId] = useState<number | null>(null)
  const [error, setError]   = useState('')

  const validate = () => {
    if (!form.printer.trim()) return 'Printer is required.'
    if (!form.ink.trim())     return 'Ink is required.'
    if (!form.color.trim())   return 'Color is required.'
    if (form.costPerPage < 0) return 'Cost cannot be negative.'
    return ''
  }

  const handleSave = async () => {
    const err = validate()
    if (err) { setError(err); return }
    setError('')
    if (editId !== null) { await db.ink.update(editId, form); setEditId(null) }
    else                   await db.ink.add(form)
    setForm(EMPTY)
  }

  const handleEdit   = (e: InkEntry) => { setEditId(e.id!); setForm({ printer: e.printer, ink: e.ink, color: e.color, costPerPage: e.costPerPage }); setError('') }
  const handleDelete = async (id: number) => { if (confirm('Delete this ink entry?')) await db.ink.delete(id) }
  const handleCancel = () => { setEditId(null); setForm(EMPTY); setError('') }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-white">Ink Catalog</h2>
        <p className="text-sm mt-0.5" style={{ color: 'rgba(148,163,184,0.6)' }}>
          Define printer/ink/color combos and their cost per printed page.
        </p>
      </div>

      {/* Form */}
      <div className="card">
        <div className="card-header" style={{ color: '#f9a8d4' }}>
          <span className="card-header-dot" style={{ background: '#ec4899', boxShadow: '0 0 8px #ec4899' }} />
          {editId !== null ? 'Edit Ink Entry' : 'Add New Ink Entry'}
        </div>
        <div className="card-body space-y-4">
          {error && (
            <div className="rounded-xl px-4 py-2.5 text-sm flex items-center gap-2"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5' }}>
              ⚠ {error}
            </div>
          )}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="field-label">Printer</label>
              <input className="input-field" value={form.printer}
                onChange={e => setForm(f => ({ ...f, printer: e.target.value }))}
                placeholder="e.g. Epson L805" />
            </div>
            <div>
              <label className="field-label">Ink</label>
              <input className="input-field" value={form.ink}
                onChange={e => setForm(f => ({ ...f, ink: e.target.value }))}
                placeholder="e.g. Sublimation" />
            </div>
            <div>
              <label className="field-label">Color</label>
              <input className="input-field" value={form.color}
                onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                placeholder="e.g. CMYK" />
            </div>
            <div>
              <label className="field-label">Cost / Page (₱)</label>
              <input type="number" min={0} step="0.0001" className="input-field"
                value={form.costPerPage}
                onChange={e => setForm(f => ({ ...f, costPerPage: parseFloat(e.target.value) || 0 }))} />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button className="btn-primary" onClick={handleSave}>
              {editId !== null ? '✓ Update Entry' : '+ Add Ink Entry'}
            </button>
            {editId !== null && <button className="btn-secondary" onClick={handleCancel}>Cancel</button>}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-header" style={{ color: 'rgba(148,163,184,0.7)' }}>
          <span className="card-header-dot" style={{ background: 'rgba(148,163,184,0.4)' }} />
          All Ink Entries
          <span className="ml-auto text-xs font-normal px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(148,163,184,0.6)' }}>
            {entries?.length ?? 0} items
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr>
              <th>Printer</th><th>Ink</th><th>Color</th><th>Cost / Page</th><th className="text-right pr-5">Actions</th>
            </tr></thead>
            <tbody>
              {(!entries || entries.length === 0) && (
                <tr><td colSpan={5} className="text-center py-10" style={{ color: 'rgba(148,163,184,0.35)' }}>
                  No ink entries yet — add one above.
                </td></tr>
              )}
              {entries?.map((e: InkEntry) => (
                <tr key={e.id}>
                  <td className="font-medium text-slate-200">{e.printer}</td>
                  <td style={{ color: 'rgba(203,213,225,0.8)' }}>{e.ink}</td>
                  <td style={{ color: 'rgba(203,213,225,0.8)' }}>{e.color}</td>
                  <td className="tabular-nums" style={{ color: '#f472b6' }}>{fmt(e.costPerPage, 4)}</td>
                  <td className="text-right pr-5">
                    <div className="flex gap-2 justify-end">
                      <button className="btn-success" onClick={() => handleEdit(e)}>Edit</button>
                      <button className="btn-danger"  onClick={() => handleDelete(e.id!)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
