import type { PaymentMethod, PricingStrategy, ProductCondition, ProductStatus, Role, SaleStatus } from '../types'
import type { SyntheticEvent } from 'react'

export const CONDITION_LABELS: Record<ProductCondition, string> = {
  nuevo: 'Nuevo',
  excelente: 'Excelente',
  muy_bueno: 'Muy bueno',
  bueno: 'Bueno',
  regular: 'Regular',
}

export const STATUS_LABELS: Record<ProductStatus, string> = {
  available: 'Disponible',
  sold: 'Vendida',
  reserved: 'Reservada',
  archived: 'Archivada',
}

export const SALE_STATUS_LABELS: Record<SaleStatus, string> = {
  completed: 'Completada',
  cancelled: 'Cancelada',
}

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cash: 'Efectivo',
  transfer: 'Transferencia',
  card: 'Tarjeta',
  mercadopago: 'Mercado Pago',
}

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administradora',
  client: 'Cliente',
}

export const STRATEGY_LABELS: Record<PricingStrategy, string> = {
  conservador: 'Conservador',
  balanceado: 'Balanceado',
  agresivo: 'Agresivo',
}

export function formatCurrency(value: number | null | undefined): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value ?? 0)
}

export function formatNumber(value: number | null | undefined): string {
  return new Intl.NumberFormat('es-AR').format(value ?? 0)
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—'
  const date = typeof value === 'string' ? new Date(value) : value
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—'
  const date = typeof value === 'string' ? new Date(value) : value
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function shortDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit' }).format(date)
}

export function toDateInput(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function daysAgo(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return toDateInput(date)
}

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ')
}

export const FALLBACK_IMAGE =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#E8DDCC"/><stop offset="1" stop-color="#D2C1A8"/></linearGradient></defs><rect width="800" height="1000" fill="url(#g)"/><text x="400" y="470" font-family="Georgia" font-size="70" fill="#B4552D" text-anchor="middle" letter-spacing="8">CAOS</text><text x="400" y="520" font-family="Georgia" font-size="26" fill="#7C7268" text-anchor="middle" letter-spacing="6">VINTAGE</text></svg>`,
  )

export function handleImageError(event: SyntheticEvent<HTMLImageElement>): void {
  const image = event.currentTarget
  if (image.src !== FALLBACK_IMAGE) image.src = FALLBACK_IMAGE
}
