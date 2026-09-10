import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { db, type PricelistEntry } from '../db/db'
import { fmt } from '../utils/format'

type SortKey = keyof PricelistEntry
type SortDir = 'asc' | 'desc'

function sortEntries(entries: PricelistEntry[], key: SortKey, dir: SortDir) {
  return [...entries].sort((a, b) => {
    const av = a[key] as number | string
    const bv = b[key] as number | string
    const cmp = av < bv ? -1 : av > bv ? 1 : 0
    return dir === 'asc' ? cmp : -cmp
  })
}

function exportCSV(entries: PricelistEntry[]) {
  const headers = [
    'Date','Product Name','Total Production Cost',
    'Suggested Price (Regular)','Net Profit Suggested (Regular)','Final Set Price (Regular)','Net Profit Final (Regular)',
    'Suggested Price (Discounted)','Net Profit Suggested (Discounted)','Final Set Price (Discounted)','Net Profit Final (Discounted)',
  ]
  const rows = entries.map(e => [
    new Date(e.savedAt).toLocaleString(),
    `"${e.productName.replace(/"/g,'""')}"`,
    e.totalProductionCost.toFixed(2), e.suggestedPriceRegular.toFixed(2),
    e.netProfitSuggestedRegular.toFixed(2), e.finalSetPriceRegular.toFixed(2), e.netProfitFinalRegular.toFixed(2),
    e.suggestedPriceDiscounted.toFixed(2), e.netProfitSuggestedDiscounted.toFixed(2),
    e.finalSetPriceDiscounted.toFixed(2), e.netProfitFinalDiscounted.toFixed(2),
  ])
  const csv  = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = `pricelist-${new Date().toISOString().slice(0,10)}.csv`; a.click()
  URL.revokeObjectURL(url)
}

interface Props { onLoadEntry?: (entry: PricelistEntry) => void }

export default function PricelistTab({ onLoadEntry }: Props) {
  const all      = useLiveQuery(() => db.pricelist.orderBy('savedAt').reverse().toArray(), []) ?? []
  const [sortKey, setSortKey] = useState<SortKey>('savedAt')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [search,  setSearch]  = useState('')

  const filtered = all.filter((e: PricelistEntry) => e.productName.toLowerCase().includes(search.toLowerCase()))
  const sorted   = sortEntries(filtered, sortKey, sortDir)

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const SortBtn = ({ col, label }: { col: SortKey; label: string }) => (
    <button className="flex items-center gap-1 transition-colors hover:text-violet-400" onClick={() => toggleSort(col)}>
      {label}
      <span style={{color:'rgba(148,163,184,0.35)',fontSize:'0.65rem'}}>
        {sortKey === col ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
      </span>
    </button>
  )

  const handleDelete = async (id: number) => {
    if (confirm('Delete this pricelist entry?')) await db.pricelist.delete(id)
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-white">Pricelist</h2>
        <p className="text-sm mt-0.5" style={{color:'rgba(148,163,184,0.6)'}}>
          Every product you've saved. Sort, search, export to CSV, or load back into the calculator.
        </p>
      </div>

      <div className="card">
        <div className="card-header" style={{color:'#f9a8d4'}}>
          <span className="card-header-dot" style={{background:'#ec4899',boxShadow:'0 0 8px #ec4899'}} />
          Saved Products
          <span className="ml-auto text-xs font-normal px-2 py-0.5 rounded-full"
            style={{background:'rgba(236,72,153,0.08)',color:'rgba(249,168,212,0.5)'}}>
            {sorted.length} entr{sorted.length !== 1 ? 'ies' : 'y'}
          </span>
        </div>

        {/* Toolbar */}
        <div className="px-5 py-3 flex flex-wrap items-center gap-3"
          style={{borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs" style={{color:'rgba(148,163,184,0.4)'}}>🔍</span>
            <input
              className="input-field pl-8 w-56"
              placeholder="Search products…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button
            className="btn-secondary ml-auto"
            onClick={() => exportCSV(sorted)}
            disabled={sorted.length === 0}
            style={sorted.length === 0 ? {opacity:0.4,cursor:'not-allowed'} : {}}
          >
            <span>⬇</span> Export CSV
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th><SortBtn col="savedAt"            label="Date" /></th>
                <th><SortBtn col="productName"        label="Product" /></th>
                <th><SortBtn col="totalProductionCost" label="Prod. Cost" /></th>
                <th className="text-center" style={{background:'rgba(236,72,153,0.07)',borderLeft:'1px solid rgba(236,72,153,0.1)'}}>
                  <span style={{color:'#f472b6'}}>Regular</span>
                </th>
                <th style={{background:'rgba(236,72,153,0.07)'}}>
                  <SortBtn col="finalSetPriceRegular" label="Final Price" />
                </th>
                <th style={{background:'rgba(236,72,153,0.07)'}}>
                  <SortBtn col="netProfitFinalRegular" label="Net Profit" />
                </th>
                <th className="text-center" style={{background:'rgba(168,85,247,0.07)',borderLeft:'1px solid rgba(168,85,247,0.1)'}}>
                  <span style={{color:'#e879f9'}}>Discounted</span>
                </th>
                <th style={{background:'rgba(168,85,247,0.07)'}}>
                  <SortBtn col="finalSetPriceDiscounted" label="Final Price" />
                </th>
                <th style={{background:'rgba(168,85,247,0.07)'}}>
                  <SortBtn col="netProfitFinalDiscounted" label="Net Profit" />
                </th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={10} className="text-center py-16" style={{color:'rgba(249,168,212,0.25)'}}>
                    <div className="text-3xl mb-2">🌸</div>
                    No saved entries yet.<br/>
                    <span style={{color:'rgba(249,168,212,0.15)'}}>Use "Save to Pricelist" in the Calculator tab.</span>
                  </td>
                </tr>
              )}
              {sorted.map(e => (
                <tr key={e.id} className="group">
                  <td style={{color:'rgba(249,168,212,0.35)',whiteSpace:'nowrap'}}>
                    {new Date(e.savedAt).toLocaleDateString()}<br/>
                    <span style={{fontSize:'0.65rem',color:'rgba(249,168,212,0.2)'}}>{new Date(e.savedAt).toLocaleTimeString()}</span>
                  </td>
                  <td className="font-semibold text-slate-200">{e.productName}</td>
                  <td className="tabular-nums" style={{color:'rgba(249,168,212,0.5)'}}>{fmt(e.totalProductionCost)}</td>
                  {/* regular */}
                  <td style={{borderLeft:'1px solid rgba(236,72,153,0.08)',background:'rgba(236,72,153,0.03)'}} />
                  <td className="tabular-nums font-medium" style={{color:'#f472b6',background:'rgba(236,72,153,0.03)'}}>{fmt(e.finalSetPriceRegular)}</td>
                  <td className="tabular-nums font-semibold" style={{color:e.netProfitFinalRegular>=0?'#f472b6':'#f87171',background:'rgba(236,72,153,0.03)'}}>{fmt(e.netProfitFinalRegular)}</td>
                  {/* discounted */}
                  <td style={{borderLeft:'1px solid rgba(168,85,247,0.08)',background:'rgba(168,85,247,0.03)'}} />
                  <td className="tabular-nums font-medium" style={{color:'#e879f9',background:'rgba(168,85,247,0.03)'}}>{fmt(e.finalSetPriceDiscounted)}</td>
                  <td className="tabular-nums font-semibold" style={{color:e.netProfitFinalDiscounted>=0?'#e879f9':'#f87171',background:'rgba(168,85,247,0.03)'}}>{fmt(e.netProfitFinalDiscounted)}</td>
                  <td className="pr-4">
                    <div className="flex gap-1.5 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      {onLoadEntry && (
                        <button className="btn-success" onClick={() => onLoadEntry(e)} title="Load into calculator">
                          ↩ Load
                        </button>
                      )}
                      <button className="btn-danger" onClick={() => handleDelete(e.id!)}>Delete</button>
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
