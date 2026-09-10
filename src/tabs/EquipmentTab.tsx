import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { db, type Equipment } from '../db/db'
import { fmt } from '../utils/format'

const EMPTY: Omit<Equipment, 'id'> = { name: '', electricityCostPerMin: 0 }

export default function EquipmentTab() {
  const equipment = useLiveQuery(() => db.equipment.orderBy('name').toArray(), [])
  const [form, setForm]     = useState<Omit<Equipment, 'id'>>(EMPTY)
  const [editId, setEditId] = useState<number | null>(null)
  const [error, setError]   = useState('')

  const validate = () => {
    if (!form.name.trim())                    return 'Item name is required.'
    if (form.electricityCostPerMin < 0)       return 'Cost cannot be negative.'
    return ''
  }

  const handleSave = async () => {
    const err = validate()
    if (err) { setError(err); return }
    setError('')
    if (editId !== null) { await db.equipment.update(editId, form); setEditId(null) }
    else                   await db.equipment.add(form)
    setForm(EMPTY)
  }

  const handleEdit   = (e: Equipment) => { setEditId(e.id!); setForm({ name: e.name, electricityCostPerMin: e.electricityCostPerMin }); setError('') }
  const handleDelete = async (id: number) => { if (confirm('Delete this equipment?')) await db.equipment.delete(id) }
  const handleCancel = () => { setEditId(null); setForm(EMPTY); setError('') }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-white">Equipment Catalog</h2>
        <p className="text-sm mt-0.5" style={{ color: 'rgba(148,163,184,0.6)' }}>
          Define equipment and their electricity cost per minute of operation.
        </p>
      </div>

      {/* Form */}
      <div className="card">
        <div className="card-header" style={{ color: '#fdba74' }}>
          <span className="card-header-dot" style={{ background: '#f97316', boxShadow: '0 0 8px #f97316' }} />
          {editId !== null ? 'Edit Equipment' : 'Add New Equipment'}
        </div>
        <div className="card-body space-y-4">
          {error && (
            <div className="rounded-xl px-4 py-2.5 text-sm flex items-center gap-2"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5' }}>
              ⚠ {error}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="field-label">Item Name</label>
              <input className="input-field" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Heat Press Machine" />
            </div>
            <div>
              <label className="field-label">Electricity Cost / min (₱)</label>
              <input type="number" min={0} step="0.0001" className="input-field"
                value={form.electricityCostPerMin}
                onChange={e => setForm(f => ({ ...f, electricityCostPerMin: parseFloat(e.target.value) || 0 }))} />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button className="btn-primary" onClick={handleSave}>
              {editId !== null ? '✓ Update Equipment' : '+ Add Equipment'}
            </button>
            {editId !== null && <button className="btn-secondary" onClick={handleCancel}>Cancel</button>}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-header" style={{ color: 'rgba(148,163,184,0.7)' }}>
          <span className="card-header-dot" style={{ background: 'rgba(148,163,184,0.4)' }} />
          All Equipment
          <span className="ml-auto text-xs font-normal px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(148,163,184,0.6)' }}>
            {equipment?.length ?? 0} items
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr>
              <th>Item Name</th><th>Electricity Cost / min</th><th className="text-right pr-5">Actions</th>
            </tr></thead>
            <tbody>
              {(!equipment || equipment.length === 0) && (
                <tr><td colSpan={3} className="text-center py-10" style={{ color: 'rgba(148,163,184,0.35)' }}>
                  No equipment yet — add one above.
                </td></tr>
              )}
              {equipment?.map((e: Equipment) => (
                <tr key={e.id}>
                  <td className="font-medium text-slate-200">{e.name}</td>
                  <td className="tabular-nums" style={{ color: '#fb923c' }}>{fmt(e.electricityCostPerMin, 4)}</td>
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
