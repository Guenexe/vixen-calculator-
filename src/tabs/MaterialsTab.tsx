import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { db, type Material } from '../db/db'
import { fmt } from '../utils/format'

const EMPTY: Omit<Material, 'id'> = { name: '', type: 'Direct', cost: 0, uom: '' }

export default function MaterialsTab() {
  const materials = useLiveQuery(() => db.materials.orderBy('name').toArray(), [])
  const [form, setForm]   = useState<Omit<Material, 'id'>>(EMPTY)
  const [editId, setEditId] = useState<number | null>(null)
  const [error, setError] = useState('')

  const validate = () => {
    if (!form.name.trim()) return 'Item name is required.'
    if (form.cost < 0)     return 'Cost cannot be negative.'
    if (!form.uom.trim())  return 'UoM is required.'
    return ''
  }

  const handleSave = async () => {
    const err = validate()
    if (err) { setError(err); return }
    setError('')
    if (editId !== null) { await db.materials.update(editId, form); setEditId(null) }
    else                   await db.materials.add(form)
    setForm(EMPTY)
  }

  const handleEdit   = (m: Material) => { setEditId(m.id!); setForm({ name: m.name, type: m.type, cost: m.cost, uom: m.uom }); setError('') }
  const handleDelete = async (id: number) => { if (confirm('Delete this material?')) await db.materials.delete(id) }
  const handleCancel = () => { setEditId(null); setForm(EMPTY); setError('') }

  return (
    <div className="space-y-5">
      {/* Page title */}
      <div>
        <h2 className="text-xl font-bold text-white">Materials Catalog</h2>
        <p className="text-sm mt-0.5" style={{ color: 'rgba(148,163,184,0.6)' }}>
          Manage direct and packaging materials used in your products.
        </p>
      </div>

      {/* Form card */}
      <div className="card">
        <div className="card-header" style={{ color: '#86efac' }}>
          <span className="card-header-dot" style={{ background: '#22c55e', boxShadow: '0 0 8px #22c55e' }} />
          {editId !== null ? 'Edit Material' : 'Add New Material'}
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
              <label className="field-label">Item Name</label>
              <input className="input-field" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. A4 Paper" />
            </div>
            <div>
              <label className="field-label">Type</label>
              <select className="input-field" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as Material['type'] }))}>
                <option value="Direct">Direct</option>
                <option value="Packaging">Packaging</option>
              </select>
            </div>
            <div>
              <label className="field-label">Cost (₱)</label>
              <input type="number" min={0} step="0.01" className="input-field" value={form.cost}
                onChange={e => setForm(f => ({ ...f, cost: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div>
              <label className="field-label">Unit of Measure</label>
              <input className="input-field" value={form.uom} onChange={e => setForm(f => ({ ...f, uom: e.target.value }))} placeholder="e.g. sheet, piece" />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button className="btn-primary" onClick={handleSave}>
              {editId !== null ? '✓ Update Material' : '+ Add Material'}
            </button>
            {editId !== null && <button className="btn-secondary" onClick={handleCancel}>Cancel</button>}
          </div>
        </div>
      </div>

      {/* Table card */}
      <div className="card">
        <div className="card-header" style={{ color: 'rgba(148,163,184,0.7)' }}>
          <span className="card-header-dot" style={{ background: 'rgba(148,163,184,0.4)' }} />
          All Materials
          <span className="ml-auto text-xs font-normal px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(148,163,184,0.6)' }}>
            {materials?.length ?? 0} items
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr>
              <th>Item Name</th><th>Type</th><th>Cost / UoM</th><th>UoM</th><th className="text-right pr-5">Actions</th>
            </tr></thead>
            <tbody>
              {(!materials || materials.length === 0) && (
                <tr><td colSpan={5} className="text-center py-10" style={{ color: 'rgba(148,163,184,0.35)' }}>
                  No materials yet — add one above.
                </td></tr>
              )}
              {materials?.map((m: Material) => (
                <tr key={m.id}>
                  <td className="font-medium text-slate-200">{m.name}</td>
                  <td>
                    <span className={`badge ${m.type === 'Direct' ? 'badge-direct' : 'badge-packaging'}`}>
                      {m.type}
                    </span>
                  </td>
                  <td className="tabular-nums" style={{ color: '#a78bfa' }}>{fmt(m.cost)}</td>
                  <td style={{ color: 'rgba(148,163,184,0.6)' }}>{m.uom}</td>
                  <td className="text-right pr-5">
                    <div className="flex gap-2 justify-end">
                      <button className="btn-success" onClick={() => handleEdit(m)}>Edit</button>
                      <button className="btn-danger"  onClick={() => handleDelete(m.id!)}>Delete</button>
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
