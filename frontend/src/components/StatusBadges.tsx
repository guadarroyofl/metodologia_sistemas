import { Badge } from './ui'
import { CONDITION_LABELS, SALE_STATUS_LABELS, STATUS_LABELS } from '../lib/format'
import type { ProductCondition, ProductStatus, SaleStatus } from '../types'

export function ConditionBadge({ condition }: { condition: ProductCondition }) {
  const tone = condition === 'nuevo' || condition === 'excelente' ? 'sage' : condition === 'regular' ? 'danger' : 'sand'
  return <Badge tone={tone}>{CONDITION_LABELS[condition]}</Badge>
}

export function ProductStatusBadge({ status }: { status: ProductStatus }) {
  const tone = status === 'available' ? 'sage' : status === 'reserved' ? 'ochre' : status === 'sold' ? 'sand' : 'neutral'
  return <Badge tone={tone}>{STATUS_LABELS[status]}</Badge>
}

export function SaleStatusBadge({ status }: { status: SaleStatus }) {
  return <Badge tone={status === 'completed' ? 'sage' : 'danger'}>{SALE_STATUS_LABELS[status]}</Badge>
}
