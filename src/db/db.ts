import Dexie, { type Table } from 'dexie'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Material {
  id?: number
  name: string
  type: 'Direct' | 'Packaging'
  cost: number
  uom: string
}

export interface Equipment {
  id?: number
  name: string
  electricityCostPerMin: number
}

export interface InkEntry {
  id?: number
  printer: string
  ink: string
  color: string
  costPerPage: number
}

export interface PricelistEntry {
  id?: number
  savedAt: number // timestamp
  productName: string
  totalProductionCost: number
  // Regular
  suggestedPriceRegular: number
  netProfitSuggestedRegular: number
  finalSetPriceRegular: number
  netProfitFinalRegular: number
  // Discounted
  suggestedPriceDiscounted: number
  netProfitSuggestedDiscounted: number
  finalSetPriceDiscounted: number
  netProfitFinalDiscounted: number
}

// ─── Database ─────────────────────────────────────────────────────────────────

class VixenDB extends Dexie {
  materials!: Table<Material, number>
  equipment!: Table<Equipment, number>
  ink!: Table<InkEntry, number>
  pricelist!: Table<PricelistEntry, number>

  constructor() {
    super('VixenCalculatorDB')
    this.version(1).stores({
      materials: '++id, name, type',
      equipment: '++id, name',
      ink: '++id, printer, ink, color',
      pricelist: '++id, savedAt, productName',
    })
  }
}

export const db = new VixenDB()
