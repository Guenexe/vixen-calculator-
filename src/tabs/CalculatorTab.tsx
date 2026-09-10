import { useLiveQuery } from 'dexie-react-hooks'
import { useCallback, useEffect, useState } from 'react'
import {
  Bar, BarChart, CartesianGrid, Cell, Legend,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { db, type Equipment, type InkEntry, type Material } from '../db/db'
import { fmt } from '../utils/format'

// ─── Row types ────────────────────────────────────────────────────────────────
interface MaterialRow  { id: string; materialId: number|null; costPerUom: number; uom: string; qtyUsed: number }
interface InkRow       { id: string; inkId: number|null; costPerPage: number; pages: number }
interface EquipmentRow { id: string; equipmentId: number|null; costPerMin: number; runTime: number }
interface LaborRow     { id: string; activity: string; durationMin: number; ratePerDay: number }

const uid = () => Math.random().toString(36).slice(2)
const emptyMaterialRow  = (): MaterialRow  => ({ id: uid(), materialId: null, costPerUom: 0, uom: '', qtyUsed: 0 })
const emptyInkRow       = (): InkRow       => ({ id: uid(), inkId: null, costPerPage: 0, pages: 0 })
const emptyEquipmentRow = (): EquipmentRow => ({ id: uid(), equipmentId: null, costPerMin: 0, runTime: 0 })
const emptyLaborRow     = (w: number): LaborRow => ({ id: uid(), activity: '', durationMin: 0, ratePerDay: w })

// ─── Tooltip component ────────────────────────────────────────────────────────
function Tip({ text }: { text: string }) {
  const [show, setShow] = useState(false)
  return (
    <span className="relative inline-block ml-1 align-middle">
      <button
        type="button" aria-label="More info"
        className="w-4 h-4 rounded-full text-xs flex items-center justify-center transition-colors"
        style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(148,163,184,0.7)' }}
        onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}
      >?</button>
      {show && (
        <span className="absolute z-50 left-5 top-0 w-64 rounded-xl text-xs leading-relaxed p-3 shadow-2xl"
          style={{ background: '#1e1b2e', border: '1px solid rgba(167,139,250,0.25)', color: '#cbd5e1' }}>
          {text}
        </span>
      )}
    </span>
  )
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({ label, color, dot }: { label: string; color: string; dot: string }) {
  return (
    <div className="card-header" style={{ color }}>
      <span className="card-header-dot" style={{ background: dot, boxShadow: `0 0 8px ${dot}` }} />
      {label}
    </div>
  )
}

// ─── Summary row ──────────────────────────────────────────────────────────────
function SRow({ label, value, accent, total }: { label: string; value: string; accent?: boolean; total?: boolean }) {
  if (total) return (
    <div className="flex justify-between items-center py-3 px-1 mt-1 rounded-xl"
      style={{ background: 'rgba(219,39,119,0.1)', border: '1px solid rgba(236,72,153,0.22)' }}>
      <span className="text-sm font-bold text-pink-100">{label}</span>
      <span className="text-lg font-bold tabular-nums" style={{ color: '#f472b6' }}>{value}</span>
    </div>
  )
  return (
    <div className="summary-row">
      <span className="summary-label">{label}</span>
      <span className={`summary-value ${accent ? '' : ''}`} style={accent ? { color: '#a78bfa' } : {}}>{value}</span>
    </div>
  )
}

// ─── Props / LoadData ─────────────────────────────────────────────────────────
interface Props { onSaved?: () => void; loadData?: LoadData|null; onLoadConsumed?: () => void }
export interface LoadData {
  productName: string; markup: number; salesTax: number; discount: number; bulkQty: number; wage: number
  directRows: MaterialRow[]; packagingRows: MaterialRow[]; inkRows: InkRow[]
  equipmentRows: EquipmentRow[]; laborRows: LaborRow[]
  finalSetPriceRegular: number; finalSetPriceDiscounted: number
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function CalculatorTab({ onSaved, loadData, onLoadConsumed }: Props) {
  const materials       = useLiveQuery(() => db.materials.orderBy('name').toArray(), [])  ?? []
  const inkCatalog      = useLiveQuery(() => db.ink.orderBy('printer').toArray(), [])      ?? []
  const equipmentCatalog= useLiveQuery(() => db.equipment.orderBy('name').toArray(), [])  ?? []

  const directMaterials   = (materials as Material[]).filter(m => m.type === 'Direct')
  const packagingMaterials= (materials as Material[]).filter(m => m.type === 'Packaging')

  // Setup
  const [productName, setProductName]   = useState('')
  const [markup, setMarkup]             = useState(80)
  const [salesTax, setSalesTax]         = useState(10)
  const [discount, setDiscount]         = useState(0)
  const [bulkQty, setBulkQty]           = useState(1)
  const [wage, setWage]                 = useState(500)

  // Rows
  const [directRows,    setDirectRows]    = useState<MaterialRow[]>([emptyMaterialRow()])
  const [packagingRows, setPackagingRows] = useState<MaterialRow[]>([emptyMaterialRow()])
  const [inkRows,       setInkRows]       = useState<InkRow[]>([emptyInkRow()])
  const [equipmentRows, setEquipmentRows] = useState<EquipmentRow[]>([emptyEquipmentRow()])
  const [laborRows,     setLaborRows]     = useState<LaborRow[]>([emptyLaborRow(500)])

  // Final prices
  const [finalSetPriceRegular,    setFinalSetPriceRegular]    = useState(0)
  const [finalSetPriceDiscounted, setFinalSetPriceDiscounted] = useState(0)
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  // Load from pricelist
  useEffect(() => {
    if (!loadData) return
    setProductName(loadData.productName); setMarkup(loadData.markup); setSalesTax(loadData.salesTax)
    setDiscount(loadData.discount); setBulkQty(loadData.bulkQty); setWage(loadData.wage)
    setDirectRows(loadData.directRows.length    ? loadData.directRows    : [emptyMaterialRow()])
    setPackagingRows(loadData.packagingRows.length ? loadData.packagingRows : [emptyMaterialRow()])
    setInkRows(loadData.inkRows.length          ? loadData.inkRows       : [emptyInkRow()])
    setEquipmentRows(loadData.equipmentRows.length ? loadData.equipmentRows : [emptyEquipmentRow()])
    setLaborRows(loadData.laborRows.length      ? loadData.laborRows     : [emptyLaborRow(loadData.wage)])
    setFinalSetPriceRegular(loadData.finalSetPriceRegular)
    setFinalSetPriceDiscounted(loadData.finalSetPriceDiscounted)
    onLoadConsumed?.()
  }, [loadData])

  // Computations
  const totalDirect    = directRows.reduce((s,r)    => s + r.costPerUom * r.qtyUsed, 0)
  const totalPackaging = packagingRows.reduce((s,r)  => s + r.costPerUom * r.qtyUsed, 0)
  const totalInk       = inkRows.reduce((s,r)        => s + r.costPerPage * r.pages, 0)
  const totalEquipment = equipmentRows.reduce((s,r)  => s + r.costPerMin * r.runTime, 0)
  const totalLabor     = laborRows.reduce((s,r)      => s + (r.ratePerDay / 480) * r.durationMin, 0)
  const totalProductionCost = totalDirect + totalPackaging + totalInk + totalEquipment + totalLabor
  const sellingPreVAT       = totalProductionCost * (1 + markup / 100)
  const suggestedPriceRegular = sellingPreVAT * (1 + salesTax / 100)
  const profitPerUnit       = suggestedPriceRegular - totalProductionCost
  const discountedPrice     = suggestedPriceRegular * (1 - discount / 100)
  const profitDiscounted    = discountedPrice - totalProductionCost
  const totalOrderCost      = totalProductionCost * bulkQty
  const totalProfit         = profitDiscounted * bulkQty

  useEffect(() => { setFinalSetPriceRegular(p    => p === 0 ? suggestedPriceRegular : p) }, [suggestedPriceRegular])
  useEffect(() => { setFinalSetPriceDiscounted(p => p === 0 ? discountedPrice : p) }, [discountedPrice])

  const netProfitFinalRegular    = finalSetPriceRegular    - totalProductionCost
  const netProfitFinalDiscounted = finalSetPriceDiscounted - totalProductionCost

  // Charts
  const PIE_COLORS = ['#f472b6', '#e879f9']
  const pieData = suggestedPriceRegular > 0 ? [
    { name: 'Production Cost', value: parseFloat(((totalProductionCost / suggestedPriceRegular)*100).toFixed(2)) },
    { name: 'Net Profit',      value: parseFloat(((profitPerUnit / suggestedPriceRegular)*100).toFixed(2)) },
  ] : []
  const barData = [
    { name: 'Regular',    Price: parseFloat(suggestedPriceRegular.toFixed(2)), 'Net Profit': parseFloat(profitPerUnit.toFixed(2)) },
    { name: 'Discounted', Price: parseFloat(discountedPrice.toFixed(2)),       'Net Profit': parseFloat(profitDiscounted.toFixed(2)) },
  ]

  // Row updaters
  const updateDirectRow   = useCallback((id:string, p:Partial<MaterialRow>)  => setDirectRows(r=>r.map(x=>x.id===id?{...x,...p}:x)), [])
  const updatePackagingRow= useCallback((id:string, p:Partial<MaterialRow>)  => setPackagingRows(r=>r.map(x=>x.id===id?{...x,...p}:x)), [])

  const handleDirectMaterialSelect   = (rowId:string, matId:number) => {
    const m = directMaterials.find((m:Material)=>m.id===matId)
    updateDirectRow(rowId, m ? {materialId:matId,costPerUom:m.cost,uom:m.uom} : {materialId:null,costPerUom:0,uom:''})
  }
  const handlePackagingMaterialSelect= (rowId:string, matId:number) => {
    const m = packagingMaterials.find((m:Material)=>m.id===matId)
    updatePackagingRow(rowId, m ? {materialId:matId,costPerUom:m.cost,uom:m.uom} : {materialId:null,costPerUom:0,uom:''})
  }
  const handleInkSelect      = (rowId:string, inkId:number) => {
    const i = inkCatalog.find((i:InkEntry)=>i.id===inkId)
    setInkRows(r=>r.map(x=>x.id===rowId?{...x,inkId:i?inkId:null,costPerPage:i?i.costPerPage:0}:x))
  }
  const handleEquipmentSelect= (rowId:string, eqId:number) => {
    const e = equipmentCatalog.find((e:Equipment)=>e.id===eqId)
    setEquipmentRows(r=>r.map(x=>x.id===rowId?{...x,equipmentId:e?eqId:null,costPerMin:e?e.electricityCostPerMin:0}:x))
  }

  // Save / Clear
  const handleSave = async () => {
    await db.pricelist.add({
      savedAt: Date.now(), productName: productName||'Unnamed Product', totalProductionCost,
      suggestedPriceRegular, netProfitSuggestedRegular: profitPerUnit, finalSetPriceRegular, netProfitFinalRegular,
      suggestedPriceDiscounted: discountedPrice, netProfitSuggestedDiscounted: profitDiscounted,
      finalSetPriceDiscounted, netProfitFinalDiscounted,
    })
    onSaved?.()
  }
  const handleClear = () => {
    setProductName(''); setMarkup(80); setSalesTax(10); setDiscount(0); setBulkQty(1); setWage(500)
    setDirectRows([emptyMaterialRow()]); setPackagingRows([emptyMaterialRow()])
    setInkRows([emptyInkRow()]); setEquipmentRows([emptyEquipmentRow()]); setLaborRows([emptyLaborRow(500)])
    setFinalSetPriceRegular(0); setFinalSetPriceDiscounted(0); setShowClearConfirm(false)
  }

  // ── Reusable material table renderer ────────────────────────────────────────
  const renderMaterialTable = (
    rows: MaterialRow[], catalog: Material[],
    onSelect: (rowId:string,matId:number)=>void,
    updateRow: (id:string,p:Partial<MaterialRow>)=>void,
    addRow: ()=>void, removeRow:(id:string)=>void,
    total: number, label: string, dotColor: string, textColor: string,
  ) => (
    <div className="card">
      <SectionHeader label={label} color={textColor} dot={dotColor} />
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead><tr>
            <th style={{minWidth:180}}>Item</th>
            <th style={{minWidth:110}}>Cost / UoM (₱)</th>
            <th style={{minWidth:70}}>UoM</th>
            <th style={{minWidth:100}}>Qty Used</th>
            <th style={{minWidth:110}}>Total Cost</th>
            <th style={{width:36}}></th>
          </tr></thead>
          <tbody>
            {rows.map(row => {
              const rowTotal  = row.costPerUom * row.qtyUsed
              const showWarn  = row.materialId !== null && row.qtyUsed === 0
              return (
                <tr key={row.id}>
                  <td>
                    <select className="table-input" value={row.materialId??''} onChange={e=>onSelect(row.id,parseInt(e.target.value))}>
                      <option value="">— Select item —</option>
                      {catalog.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </td>
                  <td><input type="number" min={0} step="0.01" className="table-input" value={row.costPerUom}
                    onChange={e=>updateRow(row.id,{costPerUom:parseFloat(e.target.value)||0})} /></td>
                  <td className="text-xs" style={{color:'rgba(148,163,184,0.5)'}}>{row.uom||'—'}</td>
                  <td>
                    <div className="flex items-center gap-1">
                      <input type="number" min={0} step="0.001" className="table-input" value={row.qtyUsed}
                        onChange={e=>updateRow(row.id,{qtyUsed:parseFloat(e.target.value)||0})} />
                      {showWarn && <span title="Qty is 0 but item selected" className="text-xs" style={{color:'#fbbf24'}}>⚠</span>}
                    </div>
                  </td>
                  <td className="tabular-nums font-semibold" style={{color:textColor}}>{fmt(rowTotal)}</td>
                  <td>
                    <button onClick={()=>removeRow(row.id)} title="Remove"
                      className="w-6 h-6 flex items-center justify-center rounded-lg text-sm transition-colors"
                      style={{color:'rgba(148,163,184,0.3)'}}
                      onMouseEnter={e=>(e.currentTarget.style.color='#fca5a5')}
                      onMouseLeave={e=>(e.currentTarget.style.color='rgba(148,163,184,0.3)')}>×</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot><tr>
            <td colSpan={4} className="text-right text-xs font-semibold pr-3 py-3"
              style={{color:'rgba(249,168,212,0.5)'}}>Total</td>
            <td className="tabular-nums font-bold py-3" style={{color:textColor}}>{fmt(total)}</td>
            <td></td>
          </tr></tfoot>
        </table>
      </div>
      <div className="px-5 py-3" style={{borderTop:'1px solid rgba(255,255,255,0.05)'}}>
        <button className="btn-secondary text-xs" onClick={addRow}>+ Add Row</button>
      </div>
    </div>
  )

  const inkLabel = (e:InkEntry)  => `${e.printer} · ${e.ink} · ${e.color}`
  const eqLabel  = (e:Equipment) => e.name

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* ── Quick stats bar ──────────────────────────────────────────────── */}
      {totalProductionCost > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Production Cost',   value: fmt(totalProductionCost),   color: '#f472b6' },
            { label: 'Suggested Price',   value: fmt(suggestedPriceRegular), color: '#f9a8d4' },
            { label: 'Net Profit / Unit', value: fmt(profitPerUnit),         color: profitPerUnit >= 0 ? '#e879f9' : '#f87171' },
            { label: 'Discounted Price',  value: fmt(discountedPrice),       color: '#c084fc' },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <div className="stat-label">{s.label}</div>
              <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Product Setup ─────────────────────────────────────────────────── */}
      <div className="card">
        <SectionHeader label="Product Setup" color="#f9a8d4" dot="#ec4899" />
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="md:col-span-2 lg:col-span-3">
              <label className="field-label">Product Name</label>
              <input className="input-field max-w-sm" value={productName}
                onChange={e=>setProductName(e.target.value)} placeholder="e.g. Sublimation Mug" />
            </div>
            {[
              { label:'Markup %', val:markup, set:(v:number)=>setMarkup(v), step:'1' },
              { label:'Sales Tax %', val:salesTax, set:(v:number)=>setSalesTax(v), step:'0.1' },
              { label:'Discount %', val:discount, set:(v:number)=>setDiscount(v), step:'1' },
              { label:'Bulk Order Qty', val:bulkQty, set:(v:number)=>setBulkQty(Math.max(1,Math.floor(v))), step:'1' },
            ].map(f=>(
              <div key={f.label}>
                <label className="field-label">{f.label}</label>
                <input type="number" min={0} step={f.step} className="input-field" value={f.val}
                  onChange={e=>f.set(parseFloat(e.target.value)||0)} />
              </div>
            ))}
            <div>
              <label className="field-label">Wage / day (₱) <span style={{color:'rgba(148,163,184,0.4)',fontWeight:400}}>8 hrs / 480 min</span></label>
              <input type="number" min={0} step="1" className="input-field" value={wage}
                onChange={e=>{const v=parseFloat(e.target.value)||0;setWage(v);setLaborRows(r=>r.map(x=>({...x,ratePerDay:v})))}} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Direct Materials ─────────────────────────────────────────────── */}
      {renderMaterialTable(
        directRows, directMaterials, handleDirectMaterialSelect, updateDirectRow,
        ()=>setDirectRows(r=>[...r,emptyMaterialRow()]), id=>setDirectRows(r=>r.filter(x=>x.id!==id)),
        totalDirect, 'Direct Materials', '#ec4899', '#f9a8d4',
      )}

      {/* ── Packaging Materials ──────────────────────────────────────────── */}
      {renderMaterialTable(
        packagingRows, packagingMaterials, handlePackagingMaterialSelect, updatePackagingRow,
        ()=>setPackagingRows(r=>[...r,emptyMaterialRow()]), id=>setPackagingRows(r=>r.filter(x=>x.id!==id)),
        totalPackaging, 'Packaging Materials', '#a21caf', '#e879f9',
      )}

      {/* ── Ink ──────────────────────────────────────────────────────────── */}
      <div className="card">
        <SectionHeader label="Ink Cost" color="#f0abfc" dot="#d946ef" />
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr>
              <th style={{minWidth:220}}>Printer · Ink · Color</th>
              <th style={{minWidth:120}}>Cost / Page (₱)</th>
              <th style={{minWidth:100}}># of Pages</th>
              <th style={{minWidth:110}}>Total Cost</th>
              <th style={{width:36}}></th>
            </tr></thead>
            <tbody>
              {inkRows.map(row=>{
                const rowTotal = row.costPerPage * row.pages
                const showWarn = row.inkId !== null && row.pages === 0
                return (
                  <tr key={row.id}>
                    <td>
                      <select className="table-input" value={row.inkId??''} onChange={e=>handleInkSelect(row.id,parseInt(e.target.value))}>
                        <option value="">— Select ink —</option>
                        {inkCatalog.map((i:InkEntry)=><option key={i.id} value={i.id}>{inkLabel(i)}</option>)}
                      </select>
                    </td>
                    <td><input type="number" min={0} step="0.0001" className="table-input" value={row.costPerPage}
                      onChange={e=>setInkRows(r=>r.map(x=>x.id===row.id?{...x,costPerPage:parseFloat(e.target.value)||0}:x))} /></td>
                    <td>
                      <div className="flex items-center gap-1">
                        <input type="number" min={0} step="1" className="table-input" value={row.pages}
                          onChange={e=>setInkRows(r=>r.map(x=>x.id===row.id?{...x,pages:parseFloat(e.target.value)||0}:x))} />
                        {showWarn && <span title="Pages is 0 but ink selected" style={{color:'#fbbf24'}} className="text-xs">⚠</span>}
                      </div>
                    </td>
                    <td className="tabular-nums font-semibold" style={{color:'#e879f9'}}>{fmt(rowTotal)}</td>
                    <td>
                      <button onClick={()=>setInkRows(r=>r.filter(x=>x.id!==row.id))}
                        className="w-6 h-6 flex items-center justify-center rounded-lg text-sm transition-colors"
                        style={{color:'rgba(148,163,184,0.3)'}}
                        onMouseEnter={e=>(e.currentTarget.style.color='#fca5a5')}
                        onMouseLeave={e=>(e.currentTarget.style.color='rgba(148,163,184,0.3)')}>×</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot><tr>
              <td colSpan={3} className="text-right text-xs font-semibold pr-3 py-3" style={{color:'rgba(249,168,212,0.5)'}}>Total Ink Cost</td>
              <td className="tabular-nums font-bold py-3" style={{color:'#e879f9'}}>{fmt(totalInk)}</td><td></td>
            </tr></tfoot>
          </table>
        </div>
        <div className="px-5 py-3" style={{borderTop:'1px solid rgba(255,255,255,0.05)'}}>
          <button className="btn-secondary text-xs" onClick={()=>setInkRows(r=>[...r,emptyInkRow()])}>+ Add Row</button>
        </div>
      </div>

      {/* ── Equipment ────────────────────────────────────────────────────── */}
      <div className="card">
        <SectionHeader label="Equipment Cost" color="#f9a8d4" dot="#ec4899" />
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr>
              <th style={{minWidth:200}}>Item</th>
              <th style={{minWidth:160}}>Electricity Cost / min (₱)</th>
              <th style={{minWidth:130}}>Run Time (min)</th>
              <th style={{minWidth:110}}>Total Cost</th>
              <th style={{width:36}}></th>
            </tr></thead>
            <tbody>
              {equipmentRows.map(row=>{
                const rowTotal = row.costPerMin * row.runTime
                const showWarn = row.equipmentId !== null && row.runTime === 0
                return (
                  <tr key={row.id}>
                    <td>
                      <select className="table-input" value={row.equipmentId??''} onChange={e=>handleEquipmentSelect(row.id,parseInt(e.target.value))}>
                        <option value="">— Select equipment —</option>
                        {equipmentCatalog.map((e:Equipment)=><option key={e.id} value={e.id}>{eqLabel(e)}</option>)}
                      </select>
                    </td>
                    <td><input type="number" min={0} step="0.0001" className="table-input" value={row.costPerMin}
                      onChange={e=>setEquipmentRows(r=>r.map(x=>x.id===row.id?{...x,costPerMin:parseFloat(e.target.value)||0}:x))} /></td>
                    <td>
                      <div className="flex items-center gap-1">
                        <input type="number" min={0} step="0.1" className="table-input" value={row.runTime}
                          onChange={e=>setEquipmentRows(r=>r.map(x=>x.id===row.id?{...x,runTime:parseFloat(e.target.value)||0}:x))} />
                        {showWarn && <span title="Run time is 0 but equipment selected" style={{color:'#fbbf24'}} className="text-xs">⚠</span>}
                      </div>
                    </td>
                    <td className="tabular-nums font-semibold" style={{color:'#f472b6'}}>{fmt(rowTotal)}</td>
                    <td>
                      <button onClick={()=>setEquipmentRows(r=>r.filter(x=>x.id!==row.id))}
                        className="w-6 h-6 flex items-center justify-center rounded-lg text-sm transition-colors"
                        style={{color:'rgba(148,163,184,0.3)'}}
                        onMouseEnter={e=>(e.currentTarget.style.color='#fca5a5')}
                        onMouseLeave={e=>(e.currentTarget.style.color='rgba(148,163,184,0.3)')}>×</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot><tr>
              <td colSpan={3} className="text-right text-xs font-semibold pr-3 py-3" style={{color:'rgba(249,168,212,0.5)'}}>Total Equipment Cost</td>
              <td className="tabular-nums font-bold py-3" style={{color:'#f472b6'}}>{fmt(totalEquipment)}</td><td></td>
            </tr></tfoot>
          </table>
        </div>
        <div className="px-5 py-3" style={{borderTop:'1px solid rgba(255,255,255,0.05)'}}>
          <button className="btn-secondary text-xs" onClick={()=>setEquipmentRows(r=>[...r,emptyEquipmentRow()])}>+ Add Row</button>
        </div>
      </div>

      {/* ── Labor ────────────────────────────────────────────────────────── */}
      <div className="card">
        <SectionHeader label="Labor Cost" color="#fbcfe8" dot="#db2777" />
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr>
              <th style={{minWidth:160}}>Activity</th>
              <th style={{minWidth:130}}>Duration (min)</th>
              <th style={{minWidth:150}}>
                <span>Rate / day (₱)</span>
                <Tip text="Labor cost = (Rate/day ÷ 480 mins) × Duration. Assumes an 8-hour (480-minute) workday. Adjust the rate per row if needed." />
              </th>
              <th style={{minWidth:110}}>Total Cost</th>
              <th style={{width:36}}></th>
            </tr></thead>
            <tbody>
              {laborRows.map(row=>{
                const rowTotal = (row.ratePerDay/480)*row.durationMin
                return (
                  <tr key={row.id}>
                    <td><input className="table-input" value={row.activity} placeholder="e.g. Cutting"
                      onChange={e=>setLaborRows(r=>r.map(x=>x.id===row.id?{...x,activity:e.target.value}:x))} /></td>
                    <td><input type="number" min={0} step="0.5" className="table-input" value={row.durationMin}
                      onChange={e=>setLaborRows(r=>r.map(x=>x.id===row.id?{...x,durationMin:parseFloat(e.target.value)||0}:x))} /></td>
                    <td><input type="number" min={0} step="1" className="table-input" value={row.ratePerDay}
                      onChange={e=>setLaborRows(r=>r.map(x=>x.id===row.id?{...x,ratePerDay:parseFloat(e.target.value)||0}:x))} /></td>
                    <td className="tabular-nums font-semibold" style={{color:'#fda4af'}}>{fmt(rowTotal)}</td>
                    <td>
                      <button onClick={()=>setLaborRows(r=>r.filter(x=>x.id!==row.id))}
                        className="w-6 h-6 flex items-center justify-center rounded-lg text-sm transition-colors"
                        style={{color:'rgba(148,163,184,0.3)'}}
                        onMouseEnter={e=>(e.currentTarget.style.color='#fca5a5')}
                        onMouseLeave={e=>(e.currentTarget.style.color='rgba(148,163,184,0.3)')}>×</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot><tr>
              <td colSpan={3} className="text-right text-xs font-semibold pr-3 py-3" style={{color:'rgba(249,168,212,0.5)'}}>Total Labor Cost</td>
              <td className="tabular-nums font-bold py-3" style={{color:'#fda4af'}}>{fmt(totalLabor)}</td><td></td>
            </tr></tfoot>
          </table>
        </div>
        <div className="px-5 py-3" style={{borderTop:'1px solid rgba(255,255,255,0.05)'}}>
          <button className="btn-secondary text-xs" onClick={()=>setLaborRows(r=>[...r,emptyLaborRow(wage)])}>+ Add Row</button>
        </div>
      </div>

      {/* ── Price Summary ────────────────────────────────────────────────── */}
      <div className="card">
        <SectionHeader label="Price Computation Summary" color="#f9a8d4" dot="#ec4899" />
        <div className="card-body space-y-0.5">
          <SRow label="Direct Materials"    value={fmt(totalDirect)} />
          <SRow label="Packaging Materials" value={fmt(totalPackaging)} />
          <SRow label="Ink"                 value={fmt(totalInk)} />
          <SRow label="Equipment"           value={fmt(totalEquipment)} />
          <SRow label="Labor"               value={fmt(totalLabor)} />
          <SRow label="Total Production Cost" value={fmt(totalProductionCost)} total />
          <div className="pt-2 space-y-0.5">
            <SRow label={`Selling Price (Pre-VAT) @ ${markup}% markup`} value={fmt(sellingPreVAT)} />
            <SRow label={`Suggested Price (Incl. ${salesTax}% VAT)`}    value={fmt(suggestedPriceRegular)} accent />
            <SRow label="Profit per Unit"   value={fmt(profitPerUnit)} />
          </div>
        </div>
      </div>

      {/* ── Discount Scenario ────────────────────────────────────────────── */}
      <div className="card">
        <SectionHeader label={`Discount Scenario — ${discount}% off`} color="#fcd34d" dot="#f59e0b" />
        <div className="card-body space-y-0.5">
          <SRow label="Discounted Price per Unit"    value={fmt(discountedPrice)} accent />
          <SRow label="Profit per Unit (Discounted)" value={fmt(profitDiscounted)} />
          <SRow label={`Total Order Cost (×${bulkQty} units)`} value={fmt(totalOrderCost)} />
          <SRow label="Total Profit (Bulk)"          value={fmt(totalProfit)} total />
        </div>
      </div>

      {/* ── Charts ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card">
          <SectionHeader label="Cost Breakdown" color="#f9a8d4" dot="#ec4899" />
          <div className="card-body">
            {suggestedPriceRegular > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={90} innerRadius={50}
                    dataKey="value" label={({name,value})=>`${name}: ${value}%`} labelLine>
                    {pieData.map((_,i)=><Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={v=>`${v}%`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-40 text-sm" style={{color:'rgba(249,168,212,0.3)'}}>
                Enter costs above to see chart
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <SectionHeader label="Regular vs Discounted" color="#f9a8d4" dot="#ec4899" />
          <div className="card-body">
            {suggestedPriceRegular > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={barData} margin={{top:10,right:10,left:0,bottom:5}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(236,72,153,0.08)" />
                  <XAxis dataKey="name" tick={{fontSize:12}} />
                  <YAxis tick={{fontSize:11}} tickFormatter={v=>`₱${v}`} />
                  <Tooltip formatter={v=>fmt(Number(v))} />
                  <Legend />
                  <Bar dataKey="Price"      fill="#ec4899" radius={[6,6,0,0]} />
                  <Bar dataKey="Net Profit" fill="#d946ef" radius={[6,6,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-40 text-sm" style={{color:'rgba(249,168,212,0.3)'}}>
                Enter costs above to see chart
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Final Price Summary ──────────────────────────────────────────── */}
      <div className="card">
        <SectionHeader label="Final Price Summary" color="#fbcfe8" dot="#db2777" />
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Regular */}
            <div className="rounded-2xl p-4 space-y-2" style={{background:'rgba(236,72,153,0.07)',border:'1px solid rgba(236,72,153,0.18)'}}>
              <div className="text-xs font-bold tracking-widest uppercase mb-3" style={{color:'#f472b6'}}>Regular</div>
              <SRow label="Suggested Price"           value={fmt(suggestedPriceRegular)} />
              <SRow label="Net Profit from Suggested" value={fmt(profitPerUnit)} />
              <div className="pt-2">
                <label className="field-label">Final Set Price (₱)</label>
                <input type="number" min={0} step="0.01" className="input-field"
                  value={finalSetPriceRegular} onChange={e=>setFinalSetPriceRegular(parseFloat(e.target.value)||0)} />
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="text-sm font-semibold text-pink-100">Net Profit from Final</span>
                <span className="text-base font-bold tabular-nums"
                  style={{color:netProfitFinalRegular>=0?'#f472b6':'#f87171'}}>{fmt(netProfitFinalRegular)}</span>
              </div>
            </div>

            {/* Discounted */}
            <div className="rounded-2xl p-4 space-y-2" style={{background:'rgba(168,85,247,0.07)',border:'1px solid rgba(168,85,247,0.18)'}}>
              <div className="text-xs font-bold tracking-widest uppercase mb-3" style={{color:'#e879f9'}}>Discounted ({discount}% off)</div>
              <SRow label="Suggested Price"           value={fmt(discountedPrice)} />
              <SRow label="Net Profit from Suggested" value={fmt(profitDiscounted)} />
              <div className="pt-2">
                <label className="field-label">Final Set Price (₱)</label>
                <input type="number" min={0} step="0.01" className="input-field"
                  value={finalSetPriceDiscounted} onChange={e=>setFinalSetPriceDiscounted(parseFloat(e.target.value)||0)} />
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="text-sm font-semibold text-pink-100">Net Profit from Final</span>
                <span className="text-base font-bold tabular-nums"
                  style={{color:netProfitFinalDiscounted>=0?'#e879f9':'#f87171'}}>{fmt(netProfitFinalDiscounted)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Actions ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 pb-12">
        <button className="btn-primary" onClick={handleSave}>
          <span>💾</span> Save to Pricelist
        </button>
        <button className="btn-secondary" onClick={()=>setShowClearConfirm(true)}>
          <span>🗑</span> Clear Data
        </button>
      </div>

      {/* ── Clear confirm modal ───────────────────────────────────────────── */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{background:'rgba(0,0,0,0.7)',backdropFilter:'blur(8px)'}}>
          <div className="rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            style={{background:'#1f0318',border:'1px solid rgba(236,72,153,0.2)',boxShadow:'0 0 60px rgba(219,39,119,0.15)'}}>
            <h2 className="text-base font-bold text-pink-100 mb-2">Clear all data?</h2>
            <p className="text-sm mb-5" style={{color:'rgba(249,168,212,0.6)'}}>
              This will reset the product name, all setup fields, and every cost row. This cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button className="btn-secondary" onClick={()=>setShowClearConfirm(false)}>Cancel</button>
              <button className="btn-danger px-4 py-2" onClick={handleClear}>Clear</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
