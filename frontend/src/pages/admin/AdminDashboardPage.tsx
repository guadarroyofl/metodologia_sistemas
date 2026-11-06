import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  DollarSign,
  Package,
  Receipt,
  Shirt,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { api } from '../../lib/api'
import { formatCurrency, formatDateTime, shortDate } from '../../lib/format'
import type { DashboardData } from '../../types'
import { ErrorState, LoadingState, StatCard } from '../../components/ui'
import { SaleStatusBadge } from '../../components/StatusBadges'

const CHART_COLORS = ['#B4552D', '#7C8471', '#C7A252', '#D98B64', '#8B3C1D']

function compact(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${Math.round(value / 1_000)}k`
  return `$${value}`
}

export function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    api
      .get<DashboardData>('/dashboard')
      .then((result) => active && setData(result))
      .catch((err: unknown) => active && setError(err instanceof Error ? err.message : 'No pudimos cargar el panel.'))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [reloadKey])

  if (loading) return <LoadingState label="Calculando métricas del negocio…" />
  if (error || !data) return <ErrorState message={error ?? 'Panel no disponible.'} onRetry={() => setReloadKey((k) => k + 1)} />

  const growthPositive = data.growth_percent >= 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">Vista general</p>
          <h1 className="mt-1 font-display text-3xl leading-tight text-ink sm:text-4xl">El pulso de CAOS</h1>
          <p className="mt-1.5 text-sm text-muted">
            Ventas, margen y stock unitario actualizados en tiempo real.
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/admin/reportes" className="btn-secondary px-4 py-2 text-xs">
            Ver reportes <ArrowRight size={13} />
          </Link>
          <Link to="/admin/prendas" className="btn-primary px-4 py-2 text-xs">
            <Shirt size={13} /> Nueva prenda
          </Link>
        </div>
      </div>

      {data.alerts.length > 0 && (
        <div className="rounded-2xl border border-ochre/30 bg-ochre/10 px-5 py-4">
          <div className="flex items-start gap-3">
            <AlertTriangle size={17} className="mt-0.5 shrink-0 text-[#8a6b20]" />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8a6b20]">Atención operativa</p>
              <ul className="mt-1.5 space-y-0.5 text-xs leading-relaxed text-ink/70">
                {data.alerts.map((alert) => (
                  <li key={alert}>· {alert}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Ventas de hoy"
          value={formatCurrency(data.today.revenue)}
          detail={`${data.today.sales_count} ${data.today.sales_count === 1 ? 'operación' : 'operaciones'} · ${data.today.units_sold} prendas`}
          icon={<DollarSign size={16} />}
          tone="clay"
        />
        <StatCard
          label="Ventas del mes"
          value={formatCurrency(data.month.revenue)}
          detail={`Ganancia ${formatCurrency(data.month.profit)} · margen ${data.month.margin_percent.toFixed(1)}%`}
          icon={<Receipt size={16} />}
          tone="sage"
        />
        <StatCard
          label="Crecimiento mensual"
          value={`${growthPositive ? '+' : ''}${data.growth_percent.toFixed(1)}%`}
          detail={`Mes anterior ${formatCurrency(data.previous_month.revenue)}`}
          icon={growthPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
        />
        <StatCard
          label="Ganancia histórica"
          value={formatCurrency(data.lifetime.lifetime_profit)}
          detail={`${data.lifetime.lifetime_sales} ventas · margen ${data.lifetime.lifetime_margin.toFixed(1)}%`}
          icon={<ArrowUpRight size={16} />}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <div className="card p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">Últimos 14 días</p>
              <h2 className="mt-1 font-display text-2xl text-ink">Ingresos y ganancia</h2>
            </div>
            <span className="chip">ARS</span>
          </div>
          <div className="mt-5 h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.daily_14} margin={{ top: 5, right: 5, left: -14, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#B4552D" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#B4552D" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="profitFill" x1="0" y1="0" x2="0" y2="1">
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
                <Area type="monotone" dataKey="revenue" stroke="#B4552D" strokeWidth={2} fill="url(#revenueFill)" />
                <Area type="monotone" dataKey="profit" stroke="#7C8471" strokeWidth={2} fill="url(#profitFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex gap-5 text-[10px] uppercase tracking-[0.14em] text-muted">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-clay" /> Ingresos</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-sage" /> Ganancia</span>
          </div>
        </div>

        <div className="card p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">Inventario unitario</p>
          <h2 className="mt-1 font-display text-2xl text-ink">Estado del stock</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {[
              { label: 'Disponibles', value: data.stock.available, tone: 'text-sage' },
              { label: 'Vendidas', value: data.stock.sold, tone: 'text-ink' },
              { label: 'Reservadas', value: data.stock.reserved, tone: 'text-ochre' },
              { label: 'Archivadas', value: data.stock.archived, tone: 'text-muted' },
            ].map((item) => (
              <div key={item.label} className="rounded-xl bg-cream/70 px-3 py-3">
                <p className={`font-display text-2xl leading-none ${item.tone}`}>{item.value}</p>
                <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted">{item.label}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-2 border-t border-sand pt-4 text-[11px]">
            <Row label="Costo del inventario" value={formatCurrency(data.stock.inventory_cost)} />
            <Row label="Valor de venta" value={formatCurrency(data.stock.inventory_retail)} />
            <Row label="Ganancia potencial" value={formatCurrency(data.stock.inventory_potential_profit)} accent />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-sand pt-4">
            <div className="flex items-center gap-2 text-xs text-muted">
              <Users size={14} className="text-clay" /> {data.counts.clients} clientes
            </div>
            <div className="flex items-center gap-2 text-xs text-muted">
              <Package size={14} className="text-clay" /> {data.counts.products} prendas
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-sand px-5 py-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">Actividad</p>
              <h2 className="mt-0.5 font-display text-xl text-ink">Últimas ventas</h2>
            </div>
            <Link to="/admin/ventas" className="link-underline text-[11px]">
              Ver todas <ArrowRight size={12} />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="table-base min-w-[520px]">
              <thead>
                <tr>
                  <th>Venta</th>
                  <th>Cliente</th>
                  <th>Total</th>
                  <th>Ganancia</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {data.recent_sales.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-xs text-muted">Sin ventas registradas todavía.</td>
                  </tr>
                )}
                {data.recent_sales.map((sale) => (
                  <tr key={sale.id}>
                    <td>
                      <p className="text-xs font-semibold text-ink">{sale.code}</p>
                      <p className="text-[10px] text-muted">{formatDateTime(sale.created_at)}</p>
                    </td>
                    <td className="text-xs text-muted">{sale.customer || 'Consumidor final'}</td>
                    <td className="text-xs font-medium text-ink">{formatCurrency(sale.total)}</td>
                    <td className="text-xs text-sage">{formatCurrency(sale.profit)}</td>
                    <td><SaleStatusBadge status={sale.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">Top 30 días</p>
              <h2 className="mt-0.5 font-display text-xl text-ink">Prendas más vendidas</h2>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {data.top_products.length === 0 && (
              <p className="py-6 text-center text-xs text-muted">Todavía no hay ventas en el período.</p>
            )}
            {data.top_products.map((product, index) => (
              <div key={product.id} className="flex items-center gap-3">
                <span className="font-display text-lg text-sand">{String(index + 1).padStart(2, '0')}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-ink">{product.name}</p>
                  <p className="text-[10px] text-muted">{product.units} {product.units === 1 ? 'unidad' : 'unidades'} · {product.sku}</p>
                </div>
                <p className="shrink-0 text-xs font-semibold text-ink">{formatCurrency(product.revenue)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <div className="card p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">Evolución</p>
          <h2 className="mt-0.5 font-display text-xl text-ink">Ingresos por mes</h2>
          <div className="mt-4 h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.monthly_series} margin={{ top: 5, right: 5, left: -14, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8DDCC" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#7C7268' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={compact} tick={{ fontSize: 10, fill: '#7C7268' }} axisLine={false} tickLine={false} width={52} />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), 'Ingresos']}
                  contentStyle={{ borderRadius: 12, border: '1px solid #E8DDCC', fontSize: 11, background: '#FCF8F1' }}
                />
                <Bar dataKey="revenue" radius={[6, 6, 0, 0]} fill="#B4552D" maxBarSize={38} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">Distribución</p>
          <h2 className="mt-0.5 font-display text-xl text-ink">Stock disponible por categoría</h2>
          <div className="mt-4 h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.category_stock} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8DDCC" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#7C7268' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="category" tick={{ fontSize: 10, fill: '#7C7268' }} axisLine={false} tickLine={false} width={82} />
                <Tooltip
                  formatter={(value: number) => [value, 'Disponibles']}
                  contentStyle={{ borderRadius: 12, border: '1px solid #E8DDCC', fontSize: 11, background: '#FCF8F1' }}
                />
                <Bar dataKey="available" radius={[0, 6, 6, 0]} maxBarSize={16}>
                  {data.category_stock.map((entry, index) => (
                    <Cell key={entry.category} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted">{label}</span>
      <span className={accent ? 'font-semibold text-sage' : 'font-medium text-ink'}>{value}</span>
    </div>
  )
}
