export type Role = 'admin' | 'client'
export type ProductCondition = 'nuevo' | 'excelente' | 'muy_bueno' | 'bueno' | 'regular'
export type ProductStatus = 'available' | 'sold' | 'reserved' | 'archived'
export type SaleStatus = 'completed' | 'cancelled'
export type PaymentMethod = 'cash' | 'transfer' | 'card' | 'mercadopago'
export type PricingStrategy = 'conservador' | 'balanceado' | 'agresivo'

export interface User {
  id: number
  name: string
  email: string
  role: Role
  phone: string | null
  is_active: boolean
  created_at: string
}

export interface Category {
  id: number
  name: string
  slug: string
  description: string | null
  created_at: string
}

export interface Style {
  id: number
  name: string
  slug: string
  description: string | null
}

export interface Product {
  id: number
  sku: string
  name: string
  description: string
  category: Category
  brand: string | null
  size: string | null
  color: string | null
  condition: ProductCondition
  status: ProductStatus
  price: number
  image_url: string | null
  is_featured: boolean
  styles: Style[]
  available: boolean
  created_at: string
}

export interface AdminProduct extends Product {
  purchase_cost: number
  margin_amount: number
  margin_percent: number
  is_active: boolean
  updated_at: string
}

export interface Page<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  pages: number
}

export interface SaleItem {
  id: number
  product_id: number
  product_name: string
  quantity: number
  unit_price: number
  line_total: number
}

export interface AdminSaleItem extends SaleItem {
  unit_cost: number
  line_profit: number
}

export interface Sale {
  id: number
  code: string
  status: SaleStatus
  payment_method: PaymentMethod
  subtotal: number
  discount: number
  total: number
  customer_name: string | null
  customer_email: string | null
  notes: string | null
  items: SaleItem[]
  total_items: number
  created_at: string
}

export interface AdminSale extends Sale {
  user_id: number
  sold_by_id: number | null
  items: AdminSaleItem[]
  total_cost: number
  total_profit: number
  margin_percent: number
}

export interface AuthResponse {
  access_token: string
  token_type: string
  expires_in: number
  user: User
}

export interface StylistSuggestion {
  product: Product
  reason: string
  score: number
}

export interface OutfitSuggestion {
  title: string
  description: string
  product_ids: number[]
}

export interface StylistResponse {
  reply: string
  detected_styles: string[]
  suggestions: StylistSuggestion[]
  outfits: OutfitSuggestion[]
  tips: string[]
}

export interface PricingResult {
  suggested_price: number
  min_price: number
  max_price: number
  estimated_profit: number
  margin_percent: number
  markup: number
  confidence: number
  strategy: PricingStrategy
  category_name: string
  rationale: string[]
  disclaimer: string
  suggestion_id: number | null
}

export interface PricingHistoryItem {
  id: number
  strategy: string
  category_name: string
  condition: ProductCondition
  brand: string | null
  purchase_cost: number
  suggested_price: number
  estimated_profit: number
  margin_percent: number
  confidence: number
  created_at: string
}

export interface Totals {
  revenue: number
  discounts: number
  sales_count: number
  cost: number
  profit: number
  units_sold: number
  products_sold: number
  average_ticket: number
  margin_percent: number
}

export interface DailyPoint {
  date: string
  revenue: number
  profit: number
  sales: number
}

export interface CategoryPerformance {
  category: string
  revenue: number
  cost: number
  profit: number
  units: number
  margin_percent: number
}

export interface TopProduct {
  id: number
  name: string
  sku: string
  image_url: string | null
  revenue: number
  profit: number
  units: number
}

export interface StockSummary {
  available: number
  sold: number
  reserved: number
  archived: number
  inventory_cost: number
  inventory_retail: number
  inventory_potential_profit: number
  available_units: number
}

export interface CategoryStock {
  category: string
  total_products: number
  available: number
  sold_or_reserved: number
  inventory_cost: number
  inventory_retail: number
}

export interface ReportSummary {
  range: { from: string; to: string }
  totals: Totals
  daily: DailyPoint[]
  by_category: CategoryPerformance[]
  by_brand: { brand: string; revenue: number; profit: number; units: number }[]
  by_payment: { method: string; sales: number; revenue: number }[]
  top_products: TopProduct[]
  stock: StockSummary
}

export interface DashboardData {
  today: Totals
  month: Totals
  previous_month: Totals
  growth_percent: number
  lifetime: {
    lifetime_revenue: number
    lifetime_profit: number
    lifetime_sales: number
    lifetime_margin: number
  }
  stock: StockSummary
  counts: { products: number; clients: number }
  recent_sales: {
    id: number
    code: string
    customer: string
    total: number
    profit: number
    items: number
    status: SaleStatus
    created_at: string
  }[]
  top_products: TopProduct[]
  monthly_series: { month: string; revenue: number; sales: number }[]
  daily_14: DailyPoint[]
  category_stock: CategoryStock[]
  alerts: string[]
}

export interface CartItem {
  product: Product
}

export interface ApiErrorBody {
  error?: {
    code?: string
    message?: string
    details?: unknown
  }
}

export interface ReportStockData {
  totals: StockSummary
  by_category: CategoryStock[]
  products: {
    sku: string
    product: string
    category: string
    brand: string
    condition: string
    status: string
    cost: number
    price: number
    margin: number
    styles: string
  }[]
}
