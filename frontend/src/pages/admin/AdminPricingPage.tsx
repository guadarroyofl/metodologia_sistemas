import { useEffect, useState, type FormEvent } from 'react'
import {
  ArrowRight,
  Calculator,
  CheckCircle2,
  History,
  Info,
  Sparkles,
  TrendingUp,
} from 'lucide-react'
import { api } from '../../lib/api'
import {
  CONDITION_LABELS,
  formatCurrency,
  formatDateTime,
  STRATEGY_LABELS,
} from '../../lib/format'
import type {
  Category,
  PricingHistoryItem,
  PricingResult,
  PricingStrategy,
  ProductCondition,
  Style,
} from '../../types'
import { useToast } from '../../context/ToastContext'
import { Badge, ErrorState, Field, LoadingState, Spinner } from '../../components/ui'
import { cn } from '../../lib/format'

const CONDITIONS: ProductCondition[] = ['nuevo', 'excelente', 'muy_bueno', 'bueno', 'regular']
const STRATEGIES: { value: PricingStrategy; label: string; hint: string }[] = [
  { value: 'conservador', label: 'Conservador', hint: 'Rotación rápida, margen moderado' },
  { value: 'balanceado', label: 'Balanceado', hint: 'Equilibrio entre margen y venta' },
  { value: 'agresivo', label: 'Agresivo', hint: 'Máximo margen, más tiempo en stock' },
]

export function AdminPricingPage() {
  const { toast } = useToast()
  const [categories, setCategories] = useState<Category[]>([])
  const [styles, setStyles] = useState<Style[]>([])
  const [purchaseCost, setPurchaseCost] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [condition, setCondition] = useState<ProductCondition>('muy_bueno')
  const [brand, setBrand] = useState('')
  const [selectedStyles, setSelectedStyles] = useState<number[]>([])
  const [strategy, setStrategy] = useState<PricingStrategy>('balanceado')
  const [result, setResult] = useState<PricingResult | null>(null)
  const [evaluating, setEvaluating] = useState(false)
  const [history, setHistory] = useState<PricingHistoryItem[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    Promise.all([api.get<Category[]>('/categories'), api.get<Style[]>('/styles')])
      .then(([categoryData, styleData]) => {
        setCategories(categoryData)
        setStyles(styleData)
        if (categoryData[0]) setCategoryId(String(categoryData[0].id))
      })
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    let active = true
    setHistoryLoading(true)
    setHistoryError(null)
    api
      .get<PricingHistoryItem[]>('/ai/pricing/history')
      .then((items) => active && setHistory(items))
      .catch((err: unknown) => active && setHistoryError(err instanceof Error ? err.message : 'No pudimos cargar el historial.'))
      .finally(() => active && setHistoryLoading(false))
    return () => {
      active = false
    }
  }, [reloadKey])

  const toggleStyle = (id: number) => {
    setSelectedStyles((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const cost = Number(purchaseCost)
    if (!categoryId || !Number.isFinite(cost) || cost <= 0) {
      toast('Ingresá un costo válido y elegí una categoría.', 'error')
      return
    }
    setEvaluating(true)
    try {
      const evaluation = await api.post<PricingResult>('/ai/pricing', {
        purchase_cost: cost,
        category_id: Number(categoryId),
        condition,
        brand: brand.trim() || null,
        style_ids: selectedStyles,
        strategy,
      })
      setResult(evaluation)
      setReloadKey((key) => key + 1)
      toast('Precio sugerido calculado y guardado en el historial.')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'No pudimos evaluar el precio.', 'error')
    } finally {
      setEvaluating(false)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">Módulo IA</p>
        <h1 className="mt-1 font-display text-3xl leading-tight text-ink sm:text-4xl">Evaluador de precios</h1>
        <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-muted">
          Motor experto que combina costo, categoría, estado, marca, estilos y rotación histórica para
          sugerir un precio con explicación y rango competitivo. Cada evaluación queda auditada.
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <form onSubmit={submit} className="card h-fit p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <Calculator size={17} className="text-clay" />
            <h2 className="font-display text-2xl text-ink">Datos de la prenda</h2>
          </div>

          <div className="mt-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Costo de compra (ARS)">
                <input
                  type="number"
                  min={1}
                  step="0.01"
                  required
                  value={purchaseCost}
                  onChange={(event) => setPurchaseCost(event.target.value)}
                  className="input"
                  placeholder="Ej: 15000"
                />
              </Field>
              <Field label="Categoría">
                <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} required className="select">
                  <option value="">Elegir categoría</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Estado de la prenda">
                <select value={condition} onChange={(event) => setCondition(event.target.value as ProductCondition)} className="select">
                  {CONDITIONS.map((item) => (
                    <option key={item} value={item}>{CONDITION_LABELS[item]}</option>
                  ))}
                </select>
              </Field>
              <Field label="Marca">
                <input value={brand} onChange={(event) => setBrand(event.target.value)} className="input" placeholder="Levi's, Zara, sin marca…" />
              </Field>
            </div>

            <div>
              <p className="label">Estilos</p>
              <div className="flex flex-wrap gap-1.5">
                {styles.map((style) => (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => toggleStyle(style.id)}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-[10px] font-medium transition',
                      selectedStyles.includes(style.id)
                        ? 'border-ink bg-ink text-cream'
                        : 'border-sand bg-white/60 text-muted hover:border-clay hover:text-clay',
                    )}
                  >
                    {style.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="label">Estrategia comercial</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {STRATEGIES.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setStrategy(item.value)}
                    className={cn(
                      'rounded-xl border px-3 py-2.5 text-left transition',
                      strategy === item.value ? 'border-clay bg-clay/5' : 'border-sand bg-white/60 hover:border-clay/40',
                    )}
                  >
                    <span className="block text-[11px] font-semibold text-ink">{item.label}</span>
                    <span className="mt-0.5 block text-[9px] leading-snug text-muted">{item.hint}</span>
                  </button>
                ))}
              </div>
            </div>

            <button type="submit" disabled={evaluating} className="btn-primary w-full">
              {evaluating ? <Spinner size={16} /> : <Sparkles size={15} />}
              {evaluating ? 'Evaluando…' : 'Calcular precio sugerido'}
            </button>
            <p className="flex items-start gap-1.5 text-[10px] leading-relaxed text-muted">
              <Info size={12} className="mt-0.5 shrink-0" />
              La sugerencia es una herramienta de apoyo. La decisión final de precio siempre queda en manos del equipo.
            </p>
          </div>
        </form>

        <div className="space-y-4">
          {result ? (
            <div className="overflow-hidden rounded-2xl bg-ink p-6 text-cream">
              <div className="relative">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="ochre">{STRATEGY_LABELS[result.strategy]}</Badge>
                  <span className="chip border-cream/15 bg-cream/10 text-cream/70">{result.category_name}</span>
                  <span className="ml-auto text-[10px] uppercase tracking-[0.14em] text-cream/40">
                    Confianza {(result.confidence * 100).toFixed(0)}%
                  </span>
                </div>

                <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.22em] text-cream/45">Precio sugerido</p>
                <p className="mt-1 font-display text-6xl leading-none text-cream">{formatCurrency(result.suggested_price)}</p>
                <p className="mt-2 text-xs text-cream/55">
                  Rango competitivo {formatCurrency(result.min_price)} — {formatCurrency(result.max_price)}
                </p>

                <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-cream/10">
                  <div className="h-full rounded-full bg-clay-light" style={{ width: `${Math.min(100, Math.max(4, result.confidence * 100))}%` }} />
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Metric label="Ganancia est." value={formatCurrency(result.estimated_profit)} />
                  <Metric label="Margen" value={`${result.margin_percent.toFixed(1)}%`} />
                  <Metric label="Markup" value={`${result.markup.toFixed(1)}x`} />
                  <Metric label="Costo base" value={formatCurrency(Number(purchaseCost))} />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[260px] flex-col items-center justify-center rounded-2xl border border-dashed border-sand bg-cream/30 px-6 py-10 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-clay/10 text-clay">
                <Sparkles size={24} />
              </div>
              <p className="mt-4 font-display text-2xl text-ink">Tu evaluación aparecerá acá</p>
              <p className="mt-2 max-w-sm text-xs leading-relaxed text-muted">
                Completá el costo y la categoría. El motor analiza márgenes objetivo, rotación por
                categoría, estado y marca para proponer un precio defendible.
              </p>
            </div>
          )}

          {result && (
            <div className="card p-5">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-sage" />
                <h3 className="font-display text-xl text-ink">Por qué este precio</h3>
              </div>
              <ul className="mt-3 space-y-2">
                {result.rationale.map((reason) => (
                  <li key={reason} className="flex items-start gap-2 text-xs leading-relaxed text-muted">
                    <ArrowRight size={12} className="mt-0.5 shrink-0 text-clay" />
                    {reason}
                  </li>
                ))}
              </ul>
              <p className="mt-4 rounded-xl bg-cream/60 px-4 py-3 text-[10px] leading-relaxed text-muted">{result.disclaimer}</p>
            </div>
          )}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sand px-5 py-4">
          <div className="flex items-center gap-2">
            <History size={16} className="text-clay" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">Auditoría</p>
              <h2 className="font-display text-xl text-ink">Historial de sugerencias</h2>
            </div>
          </div>
          <span className="chip">{history.length} evaluaciones</span>
        </div>

        {historyLoading ? (
          <div className="p-6"><LoadingState label="Cargando historial…" /></div>
        ) : historyError ? (
          <div className="p-5"><ErrorState message={historyError} onRetry={() => setReloadKey((key) => key + 1)} /></div>
        ) : history.length === 0 ? (
          <p className="px-5 py-10 text-center text-xs text-muted">Todavía no hay evaluaciones registradas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base min-w-[820px]">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Categoría</th>
                  <th>Estado</th>
                  <th>Estrategia</th>
                  <th className="text-right">Costo</th>
                  <th className="text-right">Sugerido</th>
                  <th className="text-right">Margen</th>
                  <th className="text-right">Confianza</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => (
                  <tr key={item.id}>
                    <td className="text-[10px] text-muted">{formatDateTime(item.created_at)}</td>
                    <td className="text-xs text-ink">{item.category_name}</td>
                    <td className="text-xs text-muted">{CONDITION_LABELS[item.condition]}</td>
                    <td>
                      <Badge tone={item.strategy === 'agresivo' ? 'clay' : item.strategy === 'conservador' ? 'sage' : 'ochre'}>
                        {item.strategy}
                      </Badge>
                    </td>
                    <td className="text-right text-xs text-muted">{formatCurrency(item.purchase_cost)}</td>
                    <td className="text-right text-xs font-semibold text-ink">{formatCurrency(item.suggested_price)}</td>
                    <td className="text-right text-xs text-sage">{item.margin_percent.toFixed(1)}%</td>
                    <td className="text-right text-xs text-muted">{(item.confidence * 100).toFixed(0)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-sage/25 bg-sage/10 px-5 py-4">
        <TrendingUp size={17} className="mt-0.5 shrink-0 text-sage" />
        <p className="text-xs leading-relaxed text-ink/70">
          El evaluador funciona 100% offline con reglas expertas auditables. Puede extenderse a un
          modelo de lenguaje o a un servicio de precios de mercado sin cambiar la interfaz del módulo.
        </p>
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-cream/10 bg-cream/5 px-3 py-2.5">
      <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-cream/40">{label}</p>
      <p className="mt-1 text-sm font-semibold text-cream">{value}</p>
    </div>
  )
}
