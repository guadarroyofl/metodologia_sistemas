import { useEffect, useState } from 'react'
import {
  Ban,
  CalendarDays,
  Eye,
  Receipt,
  Search,
  TrendingUp,
  X,
} from 'lucide-react'
import { api } from '../../lib/api'
import { formatCurrency, formatDateTime, PAYMENT_LABELS } from '../../lib/format'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import type { AdminSale, Page } from '../../types'
import { useToast } from '../../context/ToastContext'
import {
  EmptyState,
  ErrorState,
  LoadingState,
  Modal,
  Pagination,
  SearchField,
  Spinner,
  StatCard,
} from '../../components/ui'
import { SaleStatusBadge } from '../../components/StatusBadges'

export function AdminSalesPage() {
  const { toast } = useToast()
  const [sales, setSales] = useState<AdminSale[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 350)
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  const [detail, setDetail] = useState<AdminSale | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [cancelTarget, setCancelTarget] = useState<AdminSale | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    const query = new URLSearchParams({ page: String(page), page_size: '20' })
    if (debouncedSearch) query.set('search', debouncedSearch)
    if (statusFilter) query.set('status', statusFilter)
    if (dateFrom) query.set('date_from', dateFrom)
    if (dateTo) query.set('date_to', dateTo)

    api
      .get<Page<AdminSale>>(`/admin/sales?${query.toString()}`)
      .then((result) => {
        if (!active) return
        setSales(result.items)
        setPages(result.pages)
        setTotal(result.total)
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'No pudimos cargar las ventas.')
      })
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [debouncedSearch, statusFilter, dateFrom, dateTo, page, reloadKey])

  const openDetail = async (sale: AdminSale) => {
    setDetailLoading(true)
    try {
      const full = await api.get<AdminSale>(`/admin/sales/${sale.id}`)
      setDetail(full)
    } catch (error) {
      toast(error instanceof Error ? error.message : 'No pudimos abrir la venta.', 'error')
    } finally {
      setDetailLoading(false)
    }
  }

  const cancelSale = async () => {
    if (!cancelTarget) return
    setCancelling(true)
    try {
      await api.post<AdminSale>(`/admin/sales/${cancelTarget.id}/cancel`, { reason: cancelReason.trim() || null })
      toast('Venta cancelada. El stock fue repuesto automáticamente.')
      setCancelTarget(null)
      setCancelReason('')
      setDetail(null)
      setReloadKey((key) => key + 1)
    } catch (error) {
      toast(error instanceof Error ? error.message : 'No pudimos cancelar la venta.', 'error')
    } finally {
      setCancelling(false)
    }
  }

  const completed = sales.filter((sale) => sale.status === 'completed')
  const pageRevenue = completed.reduce((sum, sale) => sum + Number(sale.total), 0)
  const pageProfit = completed.reduce((sum, sale) => sum + Number(sale.total_profit), 0)

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">Transacciones</p>
          <h1 className="mt-1 font-display text-3xl leading-tight text-ink sm:text-4xl">Ventas</h1>
          <p className="mt-1.5 text-sm text-muted">
            {total} operaciones registradas · historial inmutable con trazabilidad de costos.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Ventas en esta página" value={String(completed.length)} detail={`${sales.length - completed.length} canceladas`} icon={<Receipt size={16} />} tone="clay" />
        <StatCard label="Ingresos de la página" value={formatCurrency(pageRevenue)} icon={<TrendingUp size={16} />} tone="sage" />
        <StatCard label="Ganancia de la página" value={formatCurrency(pageProfit)} detail="Solo ventas completadas" icon={<TrendingUp size={16} />} />
      </div>

      <div className="card p-4">
        <div className="grid gap-3 lg:grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr]">
          <SearchField value={search} onChange={(value) => { setSearch(value); setPage(1) }} placeholder="Buscar por código, cliente o email…" />
          <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1) }} className="select py-3 text-xs">
            <option value="">Todos los estados</option>
            <option value="completed">Completadas</option>
            <option value="cancelled">Canceladas</option>
          </select>
          <label className="relative">
            <CalendarDays size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input type="date" value={dateFrom} onChange={(event) => { setDateFrom(event.target.value); setPage(1) }} className="input py-3 pl-9 text-xs" title="Desde" />
          </label>
          <label className="relative">
            <CalendarDays size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input type="date" value={dateTo} onChange={(event) => { setDateTo(event.target.value); setPage(1) }} className="input py-3 pl-9 text-xs" title="Hasta" />
          </label>
        </div>
        {(dateFrom || dateTo || statusFilter || search) && (
          <button
            onClick={() => { setSearch(''); setStatusFilter(''); setDateFrom(''); setDateTo(''); setPage(1) }}
            className="mt-3 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-clay"
          >
            <X size={11} /> Limpiar filtros
          </button>
        )}
      </div>

      {loading ? (
        <LoadingState label="Cargando ventas…" />
      ) : error ? (
        <ErrorState message={error} onRetry={() => setReloadKey((key) => key + 1)} />
      ) : sales.length === 0 ? (
        <EmptyState icon={<Receipt size={24} />} title="No hay ventas con estos filtros" description="Probá ampliar el rango de fechas o limpiar la búsqueda." />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table-base min-w-[860px]">
              <thead>
                <tr>
                  <th>Venta</th>
                  <th>Cliente</th>
                  <th>Prendas</th>
                  <th>Pago</th>
                  <th className="text-right">Total</th>
                  <th className="text-right">Ganancia</th>
                  <th>Estado</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
                  <tr key={sale.id}>
                    <td>
                      <p className="text-xs font-semibold text-ink">{sale.code}</p>
                      <p className="text-[10px] text-muted">{formatDateTime(sale.created_at)}</p>
                    </td>
                    <td>
                      <p className="text-xs text-ink">{sale.customer_name || 'Consumidor final'}</p>
                      <p className="text-[10px] text-muted">{sale.customer_email || '—'}</p>
                    </td>
                    <td className="text-xs text-muted">{sale.total_items}</td>
                    <td className="text-xs text-muted">{PAYMENT_LABELS[sale.payment_method]}</td>
                    <td className="text-right text-xs font-semibold text-ink">{formatCurrency(sale.total)}</td>
                    <td className="text-right">
                      <p className="text-xs font-medium text-sage">{formatCurrency(sale.total_profit)}</p>
                      <p className="text-[10px] text-muted">{sale.margin_percent.toFixed(1)}%</p>
                    </td>
                    <td><SaleStatusBadge status={sale.status} /></td>
                    <td>
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openDetail(sale)} className="rounded-lg p-2 text-muted transition hover:bg-cream hover:text-ink" title="Ver detalle">
                          <Eye size={14} />
                        </button>
                        {sale.status === 'completed' && (
                          <button onClick={() => setCancelTarget(sale)} className="rounded-lg p-2 text-muted transition hover:bg-red-50 hover:text-red-700" title="Cancelar venta">
                            <Ban size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Pagination page={page} pages={pages} onChange={setPage} />

      <Modal
        open={Boolean(detail) || detailLoading}
        onClose={() => setDetail(null)}
        title={detail ? `Venta ${detail.code}` : 'Cargando venta…'}
        description={detail ? `${formatDateTime(detail.created_at)} · ${PAYMENT_LABELS[detail.payment_method]}` : undefined}
        size="lg"
        footer={
          detail?.status === 'completed' ? (
            <button
              onClick={() => {
                setCancelTarget(detail)
                setDetail(null)
              }}
              className="inline-flex items-center gap-2 rounded-full bg-red-700 px-5 py-2 text-xs font-semibold text-white transition hover:bg-red-800"
            >
              <Ban size={13} /> Cancelar venta
            </button>
          ) : (
            <button onClick={() => setDetail(null)} className="btn-secondary px-5 py-2 text-xs">Cerrar</button>
          )
        }
      >
        {detailLoading && <div className="flex items-center gap-2 py-10 text-sm text-muted"><Spinner size={16} className="text-clay" /> Abriendo detalle…</div>}
        {detail && !detailLoading && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <SaleStatusBadge status={detail.status} />
              <span className="chip">{detail.total_items} prendas</span>
              <span className="chip">Cliente: {detail.customer_name || 'Consumidor final'}</span>
            </div>

            <div className="overflow-hidden rounded-xl border border-sand">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Prenda</th>
                    <th className="text-right">Precio</th>
                    <th className="text-right">Costo</th>
                    <th className="text-right">Ganancia</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <p className="text-xs font-medium text-ink">{item.product_name}</p>
                        <p className="text-[10px] text-muted">Cantidad {item.quantity}</p>
                      </td>
                      <td className="text-right text-xs text-ink">{formatCurrency(item.unit_price)}</td>
                      <td className="text-right text-xs text-muted">{formatCurrency(item.unit_cost)}</td>
                      <td className="text-right text-xs text-sage">{formatCurrency(item.line_profit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-2 rounded-xl bg-cream/60 px-4 py-3 text-xs sm:grid-cols-2">
              <Row label="Subtotal" value={formatCurrency(detail.subtotal)} />
              <Row label="Descuento" value={formatCurrency(detail.discount)} />
              <Row label="Total cobrado" value={formatCurrency(detail.total)} strong />
              <Row label="Costo de mercadería" value={formatCurrency(detail.total_cost)} />
              <Row label="Ganancia neta" value={formatCurrency(detail.total_profit)} accent />
              <Row label="Margen" value={`${detail.margin_percent.toFixed(1)}%`} accent />
            </div>

            {detail.customer_email && <p className="text-[11px] text-muted">Email de contacto: {detail.customer_email}</p>}
            {detail.notes && <p className="rounded-xl border border-sand px-4 py-3 text-xs text-muted">Notas: {detail.notes}</p>}
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        title="Cancelar venta"
        description="La operación se marcará como cancelada y las prendas volverán automáticamente al stock disponible."
        size="sm"
        footer={
          <>
            <button onClick={() => setCancelTarget(null)} className="btn-secondary px-5 py-2 text-xs" disabled={cancelling}>Volver</button>
            <button onClick={cancelSale} disabled={cancelling} className="inline-flex items-center gap-2 rounded-full bg-red-700 px-5 py-2 text-xs font-semibold text-white transition hover:bg-red-800 disabled:opacity-60">
              {cancelling && <Spinner size={13} />} Confirmar cancelación
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-xl bg-cream/60 px-4 py-3 text-xs text-muted">
            <p><strong className="text-ink">{cancelTarget?.code}</strong> · {cancelTarget && formatCurrency(cancelTarget.total)} · {cancelTarget?.total_items} prendas</p>
            <p className="mt-1">Cliente: {cancelTarget?.customer_name || 'Consumidor final'}</p>
          </div>
          <label className="block">
            <span className="label">Motivo (opcional)</span>
            <textarea value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} rows={3} className="input resize-none text-xs" placeholder="Devolución, error de cobro, talle incorrecto…" />
          </label>
        </div>
      </Modal>
    </div>
  )
}

function Row({ label, value, strong = false, accent = false }: { label: string; value: string; strong?: boolean; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted">{label}</span>
      <span className={accent ? 'font-semibold text-sage' : strong ? 'font-display text-base text-ink' : 'font-medium text-ink'}>{value}</span>
    </div>
  )
}
