import { useState } from 'react'
import type { PricelistEntry } from './db/db'
import CalculatorTab, { type LoadData } from './tabs/CalculatorTab'
import EquipmentTab from './tabs/EquipmentTab'
import InkTab from './tabs/InkTab'
import MaterialsTab from './tabs/MaterialsTab'
import PricelistTab from './tabs/PricelistTab'

type Tab = 'calculator' | 'materials' | 'equipment' | 'ink' | 'pricelist'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'calculator', label: 'Calculator', icon: '🧮' },
  { id: 'materials', label: 'Materials',  icon: '📦' },
  { id: 'equipment', label: 'Equipment',  icon: '⚙️' },
  { id: 'ink',       label: 'Ink',        icon: '🖨️' },
  { id: 'pricelist', label: 'Pricelist',  icon: '📋' },
]

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('calculator')
  const [loadData, setLoadData]   = useState<LoadData | null>(null)
  const [savedFlash, setSavedFlash] = useState(false)

  const handleSaved = () => {
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 3000)
  }

  const handleLoadEntry = (entry: PricelistEntry) => {
    setLoadData({
      productName: entry.productName + ' (Copy)',
      markup: 80, salesTax: 10, discount: 0, bulkQty: 1, wage: 500,
      directRows: [], packagingRows: [], inkRows: [], equipmentRows: [], laborRows: [],
      finalSetPriceRegular: entry.finalSetPriceRegular,
      finalSetPriceDiscounted: entry.finalSetPriceDiscounted,
    })
    setActiveTab('calculator')
  }

  return (
    <div className="min-h-screen" style={{ background: '#12020d' }}>

      {/* ── Ambient glow blobs ───────────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full opacity-25"
          style={{ background: 'radial-gradient(circle, #db2777 0%, transparent 70%)' }} />
        <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #9d174d 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 left-1/3 w-[500px] h-[500px] rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #be185d 0%, transparent 70%)' }} />
        <div className="absolute top-1/2 left-1/2 w-[300px] h-[300px] rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #a21caf 0%, transparent 70%)' }} />
      </div>

      {/* ── Header ───────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40"
        style={{
          background: 'rgba(18,2,13,0.85)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(236,72,153,0.15)',
        }}>
        <div className="max-w-7xl mx-auto px-5">
          <div className="flex items-center justify-between h-14">

            {/* Logo */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-lg"
                style={{ background: 'linear-gradient(135deg,#db2777,#9d174d)', boxShadow: '0 0 18px rgba(219,39,119,0.55)' }}>
                🦊
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold leading-none" style={{ color: '#f9a8d4' }}>
                  Vixen Calculator
                </span>
                <span className="text-xs mt-0.5 leading-none" style={{ color: 'rgba(249,168,212,0.4)' }}>
                  Print-on-demand · Crafts pricing
                </span>
              </div>
            </div>

            {/* Tab pills */}
            <nav className="flex items-center gap-1 overflow-x-auto">
              {TABS.map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`tab-btn ${activeTab === t.id ? 'tab-active' : 'tab-inactive'}`}
                >
                  <span>{t.icon}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </nav>

            {/* Toast */}
            <div className="w-40 flex justify-end">
              {savedFlash && (
                <span className="text-xs px-3 py-1.5 rounded-full font-semibold flex items-center gap-1.5"
                  style={{
                    background: 'rgba(236,72,153,0.15)',
                    border: '1px solid rgba(244,114,182,0.35)',
                    color: '#f9a8d4',
                    boxShadow: '0 0 16px rgba(236,72,153,0.25)',
                    animation: 'fadeIn .3s ease',
                  }}>
                  <span>✓</span> Saved!
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ── Content ──────────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-5 py-7 relative z-10">
        {activeTab === 'calculator' && (
          <CalculatorTab onSaved={handleSaved} loadData={loadData} onLoadConsumed={() => setLoadData(null)} />
        )}
        {activeTab === 'materials'  && <MaterialsTab />}
        {activeTab === 'equipment'  && <EquipmentTab />}
        {activeTab === 'ink'        && <InkTab />}
        {activeTab === 'pricelist'  && <PricelistTab onLoadEntry={handleLoadEntry} />}
      </main>

      <style>{`
        @keyframes fadeIn { from { opacity:0; transform:translateY(-4px); } to { opacity:1; transform:none; } }
      `}</style>
    </div>
  )
}
