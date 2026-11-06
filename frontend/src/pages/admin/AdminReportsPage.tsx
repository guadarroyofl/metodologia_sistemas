import { useEffect, useState } from 'react'
import {
  BarChart3,
  CalendarDays,
  Download,
  FileSpreadsheet,
  FileText,
  Package,
  Receipt,
  RefreshCcw,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { api, download, saveBlob } from '../../lib/api'
import { daysAgo, formatCurrency, formatNumber, PAYMENT_LABELS, shortDate, toDateInput } from '../../lib/format'
import type { PaymentMethod, ReportSummary } from '../../types'
import { useToast } from '../../context/ToastContext'
import { ErrorState, LoadingState, StatCard } from '../../components/ui'

const REPORT_OPTIONS = [
  { key: 'ventas', label: 'Ventas', description: 'Detalle transacción por transacción' },
  { key: 'rentabilidad', label: 'Rentabilidad', description: 'Margen por categoría' },
  { key: 'stock', label: 'Stock', description: 'Inventario unitario valorizado' },
] as const

const FORMAT_OPTIONS = [
  { key: 'csv', label: 'CSV', icon: FileText },
  { key: 'xlsx', label: 'Excel', icon: FileSpreadsheet },
  { key: 'pdf', label: 'PDF', icon: FileText },
] as const

const CHART_COLORS = ['#B4552D', '#7C8471', '#C7A252', '#D98B64', '#8B3C1D', '#A8B0A0']

function compact(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${Math.round(value / 1_000)}k`
  return `$${value}`
}

export function AdminReportsPage() {
  const { toast } = useToast()
  const [dateFrom, setDateFrom] = useState(daysAgo(30))
  const [dateTo, setDateTo] = useState(toDateInput(new Date()))
  const [appliedFrom, setAppliedFrom] = useState(dateFrom)
  const [appliedTo, setAppliedTo] = useState(dateTo)
  const [data, setData] = useState<ReportSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    const query = new URLSearchParams()
    if (appliedFrom) query.set('date_from', appliedFrom)
    if (appliedTo) query.set('date_to', appliedTo)
    api
      .get<ReportSummary>(`/reports/summary?${query.toString()}`)
      .then((result) => active && setData(result))
      .catch((err: unknown) => active && setError(err instanceof Error ? err.message : 'No pudimos generar el reporte.'))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [appliedFrom, appliedTo, reloadKey])

  const applyRange = () => {
    if (dateFrom && dateTo && dateFrom > dateTo) {
      toast('La fecha desde no puede ser posterior a la fecha hasta.', 'error')
      return
    }
    setAppliedFrom(dateFrom)
    setAppliedTo(dateTo)
  }

  const exportReport = async (report: string, format: string) => {
    const key = `${report}-${format}`
    setDownloading(key)
    try {
      const query = new URLSearchParams({ report, format })
      if (report !== 'stock') {
        if (appliedFrom) query.set('date_from', appliedFrom)
        if (appliedTo) query.set('date_to', appliedTo)
      }
      const result = await download(`/reports/export?${query.toString()}`)
      saveBlob(result.blob, result.filename)
      toast(`Reporte ${report} exportado en ${format.toUpperCase()}.`)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'No pudimos exportar el reporte.', 'error')
    } finally {
      setDownloading(null)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">Análisis</p>
        <h1 className="mt-1 font-display text-3xl leading-tight text-ink sm:text-4xl">Reportes y exportaciones</h1>
        <p className="mt-1.5 text-sm text-muted">
          Ventas, rentabilidad y stock con trazabilidad de costos. Descargá los datos en CSV, Excel o PDF.
        </p>
      </div>

      <div className="card p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid flex-1 gap-3 sm:grid-cols-[1fr_1fr_auto_auto]">
            <label>
              <span className="label">Desde</span>
              <div className="relative">
                <CalendarDays size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="input py-2.5 pl-9 text-xs" />
              </div>
            </label>
            <label>
              <span className="label">Hasta</span>
              <div className="relative">
                <CalendarDays size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="input py-2.5 pl-9 text-xs" />
              </div>
            </label>
            <button onClick={applyRange} className="btn-primary h-[42px] self-end px-5 py-2 text-xs">
              <RefreshCcw size={13} /> Actualizar
            </button>
            <button
              onClick={() => {
                setDateFrom(daysAgo(30))
                setDateTo(toDateInput(new Date()))
                setAppliedFrom(daysAgo(30))
                setAppliedTo(toDateInput(new Date()))
              }}
              className="btn-secondary h-[42px] self-end px-4 py-2 text-xs"
            >
              Últimos 30 días
            </button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            { label: 'Hoy', from: toDateInput(new Date()), to: toDateInput(new Date()) },
            { label: 'Últimos 7 días', from: daysAgo(7), to: toDateInput(new Date()) },
            { label: 'Este año', from: `${new Date().getFullYear()}-01-01`, to: toDateInput(new Date()) },
          ].map((preset) => (
            <button
              key={preset.label}
              onClick={() => { setDateFrom(preset.from); setDateTo(preset.to); setAppliedFrom(preset.from); setAppliedTo(preset.to) }}
              className="rounded-full border border-sand bg-white/60 px-3 py-1.5 text-[10px] font-medium text-muted transition hover:border-clay hover:text-clay"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <LoadingState label="Generando reporte…" />
      ) : error ? (
        <ErrorState message={error} onRetry={() => setReloadKey((key) => key + 1)} />
      ) : data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Ingresos" value={formatCurrency(data.totals.revenue)} detail={`${data.totals.sales_count} ventas · ${data.totals.units_sold} prendas`} icon={<Wallet size={16} />} tone="clay" />
            <StatCard label="Ganancia" value={formatCurrency(data.totals.profit)} detail={`Margen ${data.totals.margin_percent.toFixed(1)}%`} icon={<TrendingUp size={16} />} tone="sage" />
            <StatCard label="Ticket promedio" value={formatCurrency(data.totals.average_ticket)} detail={`Costo ${formatCurrency(data.totals.cost)}`} icon={<Receipt size={16} />} />
            <StatCard label="Descuentos otorgados" value={formatCurrency(data.totals.discounts)} detail={`${formatNumber(data.stock.available_units)} unidades disponibles`} icon={<BarChart3 size={16} />} />
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
            <div className="card p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">Serie diaria</p>
                  <h2 className="mt-0.5 font-display text-xl text-ink">Evolución de ingresos y ganancia</h2>
                </div>
                <span className="chip">{shortDate(data.range.from)} — {shortDate(data.range.to)}</span>
              </div>
              <div className="mt-4 h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.daily} margin={{ top: 5, right: 5, left: -14, bottom: 0 }}>
                    <defs>
                      <linearGradient id="reportRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#B4552D" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#B4552D" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="reportProfit" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#7C8471" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#7C8471" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E8DDCC" vertical={false} />
                    <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 10, fill: '#7C7268' }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={compact} tick={{ fontSize: 10, fill: '#7C7268' }} axisLine={false} tickLine={false} width={52} />
                    <Tooltip
                      formatter={(value: number, name: string) => [formatCurrency(value), name === 'revenue' ? 'Ingresos' : 'Ganancia']}
                      labelFormatter={(label: string) => `Fecha ${shortDate(label)}`}
                      contentStyle={{ borderRadius: 12, border: '1px solid #E8DDCC', fontSize: 11, background: '#FCF8F1' }}
                    />
                    <Legend formatter={(value) => (value === 'revenue' ? 'Ingresos' : 'Ganancia')} wrapperStyle={{ fontSize: 10 }} />
                    <Area type="monotone" dataKey="revenue" stroke="#B4552D" strokeWidth={2} fill="url(#reportRevenue)" />
                    <Area type="monotone" dataKey="profit" stroke="#7C8471" strokeWidth={2} fill="url(#reportProfit)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">Inventario</p>
              <h2 className="mt-0.5 font-display text-xl text-ink">Stock valorizado</h2>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {[
                  { label: 'Disponibles', value: data.stock.available },
                  { label: 'Vendidas', value: data.stock.sold },
                  { label: 'Reservadas', value: data.stock.reserved },
                  { label: 'Archivadas', value: data.stock.archived },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl bg-cream/70 px-3 py-3">
                    <p className="font-display text-2xl leading-none text-ink">{item.value}</p>
                    <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted">{item.label}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 space-y-2 border-t border-sand pt-4 text-xs">
                <SummaryRow label="Costo del inventario" value={formatCurrency(data.stock.inventory_cost)} />
                <SummaryRow label="Valor de venta" value={formatCurrency(data.stock.inventory_retail)} />
                <SummaryRow label="Ganancia potencial" value={formatCurrency(data.stock.inventory_potential_profit)} accent />
                <SummaryRow label="Unidades disponibles" value={formatNumber(data.stock.available_units)} />
              </div>
            </div>
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <div className="card p-5">
              <h2 className="font-display text-xl text-ink">Rentabilidad por categoría</h2>
              <div className="mt-3 h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.by_category} margin={{ top: 5, right: 5, left: -14, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E8DDCC" vertical={false} />
                    <XAxis dataKey="category" tick={{ fontSize: 9, fill: '#7C7268' }} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={52} />
                    <YAxis tickFormatter={compact} tick={{ fontSize: 10, fill: '#7C7268' }} axisLine={false} tickLine={false} width={52} />
                    <Tooltip
                      formatter={(value: number, name: string) => [formatCurrency(value), name === 'revenue' ? 'Ingresos' : 'Ganancia']}
                      contentStyle={{ borderRadius: 12, border: '1px solid #E8DDCC', fontSize: 11, background: '#FCF8F1' }}
                    />
                    <Legend formatter={(value) => (value === 'revenue' ? 'Ingresos' : 'Ganancia')} wrapperStyle={{ fontSize: 10 }} />
                    <Bar dataKey="revenue" fill="#B4552D" radius={[5, 5, 0, 0]} maxBarSize={22} />
                    <Bar dataKey="profit" fill="#7C8471" radius={[5, 5, 0, 0]} maxBarSize={22} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card p-5">
              <h2 className="font-display text-xl text-ink">Medios de pago</h2>
              <div className="mt-3 h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.by_payment.map((row) => ({ ...row, method: PAYMENT_LABELS[row.method as PaymentMethod] ?? row.method }))} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E8DDCC" horizontal={false} />
                    <XAxis type="number" tickFormatter={compact} tick={{ fontSize: 10, fill: '#7C7268' }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="method" tick={{ fontSize: 10, fill: '#7C7268' }} axisLine={false} tickLine={false} width={90} />
                    <Tooltip formatter={(value: number) => [formatCurrency(value), 'Facturado']} contentStyle={{ borderRadius: 12, border: '1px solid #E8DDCC', fontSize: 11, background: '#FCF8F1' }} />
                    <Bar dataKey="revenue" radius={[0, 5, 5, 0]} maxBarSize={18}>
                      {data.by_payment.map((entry, index) => (
                        <Cell key={entry.method} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <div className="card overflow-hidden">
              <div className="border-b border-sand px-5 py-4">
                <h2 className="font-display text-xl text-ink">Detalle por categoría</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="table-base min-w-[520px]">
                  <thead>
                    <tr>
                      <th>Categoría</th>
                      <th className="text-right">Unidades</th>
                      <th className="text-right">Ingresos</th>
                      <th className="text-right">Ganancia</th>
                      <th className="text-right">Margen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.by_category.length === 0 && (
                      <tr><td colSpan={5} className="py-8 text-center text-xs text-muted">Sin ventas en el período.</td></tr>
                    )}
                    {data.by_category.map((row) => (
                      <tr key={row.category}>
                        <td className="text-xs font-medium text-ink">{row.category}</td>
                        <td className="text-right text-xs text-muted">{row.units}</td>
                        <td className="text-right text-xs text-ink">{formatCurrency(row.revenue)}</td>
                        <td className="text-right text-xs text-sage">{formatCurrency(row.profit)}</td>
                        <td className="text-right text-xs text-muted">{row.margin_percent.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card overflow-hidden">
              <div className="border-b border-sand px-5 py-4">
                <h2 className="font-display text-xl text-ink">Prendas más vendidas</h2>
              </div>
              <div className="divide-y divide-sand/60">
                {data.top_products.length === 0 && (
                  <p className="px-5 py-8 text-center text-xs text-muted">Sin ventas en el período.</p>
                )}
                {data.top_products.map((product, index) => (
                  <div key={product.id} className="flex items-center gap-3 px-5 py-3">
                    <span className="font-display text-lg text-sand">{String(index + 1).padStart(2, '0')}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-ink">{product.name}</p>
                      <p className="text-[10px] text-muted">{product.sku} · {product.units} {product.units === 1 ? 'unidad' : 'unidades'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold text-ink">{formatCurrency(product.revenue)}</p>
                      <p className="text-[10px] text-sage">+{formatCurrency(product.profit)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sand px-5 py-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">Exportaciones</p>
                <h2 className="mt-0.5 font-display text-xl text-ink">Descargar reportes</h2>
              </div>
              <p className="flex items-center gap-1.5 text-[10px] text-muted">
                <Download size={12} /> Archivos generados en el servidor
              </p>
            </div>
            <div className="grid gap-4 p-5 md:grid-cols-3">
              {REPORT_OPTIONS.map((report) => (
                <div key={report.key} className="rounded-2xl border border-sand bg-cream/30 p-4">
                  <div className="flex items-center gap-2">
                    {report.key === 'stock' ? <Package size={15} className="text-clay" /> : <BarChart3 size={15} className="text-clay" />}
                    <p className="text-xs font-semibold text-ink">{report.label}</p>
                  </div>
                  <p className="mt-1 text-[10px] leading-relaxed text-muted">{report.description}</p>
                  <div className="mt-3 grid grid-cols-3 gap-1.5">
                    {FORMAT_OPTIONS.map((format) => {
                      const Icon = format.icon
                      const key = `${report.key}-${format.key}`
                      return (
                        <button
                          key={format.key}
                          onClick={() => exportReport(report.key, format.key)}
                          disabled={downloading === key}
                          className="flex flex-col items-center gap-1 rounded-lg border border-sand bg-white/70 px-2 py-2 text-[9px] font-semibold uppercase tracking-[0.08em] text-muted transition hover:border-clay hover:text-clay disabled:opacity-50"
                        >
                          <Icon size={13} />
                          {downloading === key ? '…' : format.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}

function SummaryRow({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted">{label}</span>
      <span className={accent ? 'font-semibold text-sage' : 'font-medium text-ink'}>{value}</span>
    </div>
  )
}
