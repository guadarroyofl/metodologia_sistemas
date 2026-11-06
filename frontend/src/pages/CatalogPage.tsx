import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowRight, Filter, Shirt, SlidersHorizontal, Sparkles, X } from 'lucide-react'
import { api } from '../lib/api'
import { cn } from '../lib/format'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import type { Category, Page, Product, Style } from '../types'
import { ProductCard } from '../components/ProductCard'
import { EmptyState, ErrorState, LoadingState, Pagination, SearchField } from '../components/ui'

const SORT_OPTIONS = [
  { value: 'newest', label: 'Novedades' },
  { value: 'price_asc', label: 'Menor precio' },
  { value: 'price_desc', label: 'Mayor precio' },
  { value: 'name', label: 'Nombre A-Z' },
]

const CONDITION_OPTIONS = [
  { value: '', label: 'Cualquier estado' },
  { value: 'nuevo', label: 'Nuevo' },
  { value: 'excelente', label: 'Excelente' },
  { value: 'muy_bueno', label: 'Muy bueno' },
  { value: 'bueno', label: 'Bueno' },
  { value: 'regular', label: 'Regular' },
]

const STYLE_TONES = [
  'bg-[#efe4d3]',
  'bg-[#e6e7de]',
  'bg-[#ead9d0]',
  'bg-[#efe8d6]',
  'bg-[#e2e6e2]',
  'bg-[#eadfd6]',
]

export function CatalogPage() {
  const [params, setParams] = useSearchParams()
  const view = params.get('view')
  const isStylesView = view === 'styles'

  const [categories, setCategories] = useState<Category[]>([])
  const [styles, setStyles] = useState<Style[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [pageData, setPageData] = useState({ total: 0, pages: 1, page: 1 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [search, setSearch] = useState(params.get('q') ?? '')
  const debouncedSearch = useDebouncedValue(search, 350)

  const activeStyle = params.get('style') ?? ''
  const activeCategory = params.get('category') ?? ''
  const activeCondition = params.get('condition') ?? ''
  const activeSize = params.get('size') ?? ''
  const sort = params.get('sort') ?? 'newest'
  const page = Number(params.get('page') ?? '1')

  const updateParam = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params)
      if (value) next.set(key, value)
      else next.delete(key)
      if (key !== 'page') next.delete('page')
      setParams(next, { replace: true })
    },
    [params, setParams],
  )

  useEffect(() => {
    Promise.all([api.get<Category[]>('/categories'), api.get<Style[]>('/styles')])
      .then(([categoryData, styleData]) => {
        setCategories(categoryData)
        setStyles(styleData)
      })
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    if (debouncedSearch !== (params.get('q') ?? '')) {
      updateParam('q', debouncedSearch)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch])

  useEffect(() => {
    if (isStylesView) {
      setLoading(false)
      return
    }
    let active = true
    setLoading(true)
    setError(null)
    const query = new URLSearchParams()
    query.set('page', String(page))
    query.set('page_size', '12')
    query.set('sort', sort)
    if (debouncedSearch) query.set('q', debouncedSearch)
    if (activeStyle) query.set('style', activeStyle)
    if (activeCategory) query.set('category_id', activeCategory)
    if (activeCondition) query.set('condition', activeCondition)
    if (activeSize) query.set('size', activeSize)

    api
      .get<Page<Product>>(`/products?${query.toString()}`)
      .then((result) => {
        if (!active) return
        setProducts(result.items)
        setPageData({ total: result.total, pages: result.pages, page: result.page })
      })
      .catch((err: unknown) => {
        if (!active) return
        setError(err instanceof Error ? err.message : 'No pudimos cargar el catálogo.')
      })
      .finally(() => active && setLoading(false))

    return () => {
      active = false
    }
  }, [debouncedSearch, activeStyle, activeCategory, activeCondition, activeSize, sort, page, isStylesView])

  const activeFilters = useMemo(() => {
    const filters: { key: string; label: string; value: string }[] = []
    if (activeStyle) filters.push({ key: 'style', label: 'Estilo', value: styles.find((s) => s.slug === activeStyle)?.name ?? activeStyle })
    if (activeCategory) filters.push({ key: 'category', label: 'Categoría', value: categories.find((c) => String(c.id) === activeCategory)?.name ?? activeCategory })
    if (activeCondition) filters.push({ key: 'condition', label: 'Estado', value: CONDITION_OPTIONS.find((c) => c.value === activeCondition)?.label ?? activeCondition })
    if (activeSize) filters.push({ key: 'size', label: 'Talle', value: activeSize })
    return filters
  }, [activeStyle, activeCategory, activeCondition, activeSize, styles, categories])

  const clearFilters = () => {
    const next = new URLSearchParams()
    if (view) next.set('view', view)
    setParams(next, { replace: true })
    setSearch('')
  }

  if (isStylesView) {
    return (
      <div className="container-wide py-10 lg:py-14">
        <div className="flex flex-col gap-4 border-b border-sand pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow mb-2">Universos de estilo</p>
            <h1 className="font-display text-4xl text-ink sm:text-5xl">Encontrá tu lenguaje</h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
              Cada prenda se etiqueta con los estilos que la describen. Elegí uno y descubrí todas
              las piezas disponibles dentro de ese universo.
            </p>
          </div>
          <Link to="/tienda" className="btn-secondary self-start">
            Ver todo el catálogo <ArrowRight size={15} />
          </Link>
        </div>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {styles.map((style, index) => (
            <Link
              key={style.id}
              to={`/tienda?style=${style.slug}`}
              className={cn(
                'group relative overflow-hidden rounded-2xl border border-ink/5 p-6 transition hover:-translate-y-0.5 hover:shadow-card',
                STYLE_TONES[index % STYLE_TONES.length],
              )}
            >
              <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-ink/40">
                {String(index + 1).padStart(2, '0')}
              </p>
              <h2 className="mt-8 font-display text-3xl text-ink">{style.name}</h2>
              <p className="mt-2 max-w-xs text-xs leading-relaxed text-ink/55">{style.description}</p>
              <span className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full border border-ink/10 text-ink transition group-hover:bg-ink group-hover:text-cream">
                <ArrowRight size={15} />
              </span>
            </Link>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="container-wide py-8 lg:py-12">
      <div className="flex flex-col gap-3 border-b border-sand pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow mb-2">Catálogo</p>
          <h1 className="font-display text-4xl text-ink sm:text-5xl">Piezas disponibles</h1>
          <p className="mt-2 text-sm text-muted">
            {pageData.total} {pageData.total === 1 ? 'prenda única' : 'prendas únicas'} · sin reposición
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters((current) => !current)}
            className="btn-secondary px-4 py-2.5 text-xs lg:hidden"
          >
            <Filter size={14} /> Filtros
          </button>
          <label className="flex items-center gap-2 text-[11px] text-muted">
            <SlidersHorizontal size={14} />
            <select
              value={sort}
              onChange={(event) => updateParam('sort', event.target.value)}
              className="select w-auto py-2 text-xs"
              aria-label="Ordenar catálogo"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[250px_1fr]">
        <aside className={cn('space-y-5', !showFilters && 'hidden lg:block')}>
          <SearchField value={search} onChange={setSearch} placeholder="Buscar prenda, marca…" />

          <div className="card p-5">
            <div className="flex items-center justify-between">
              <p className="label mb-0">Filtros</p>
              {(activeFilters.length > 0 || search) && (
                <button onClick={clearFilters} className="text-[10px] font-semibold uppercase tracking-[0.12em] text-clay">
                  Limpiar
                </button>
              )}
            </div>

            <div className="mt-5 space-y-5">
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted/80">Categoría</p>
                <div className="max-h-52 space-y-1 overflow-y-auto pr-1">
                  <FilterButton active={!activeCategory} onClick={() => updateParam('category', '')}>
                    Todas
                  </FilterButton>
                  {categories.map((category) => (
                    <FilterButton
                      key={category.id}
                      active={activeCategory === String(category.id)}
                      onClick={() => updateParam('category', String(category.id))}
                    >
                      {category.name}
                    </FilterButton>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted/80">Estilo</p>
                <div className="flex flex-wrap gap-1.5">
                  {styles.map((style) => (
                    <button
                      key={style.id}
                      onClick={() => updateParam('style', activeStyle === style.slug ? '' : style.slug)}
                      className={cn(
                        'rounded-full border px-2.5 py-1 text-[10px] font-medium transition',
                        activeStyle === style.slug
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
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted/80">Estado</p>
                <select
                  value={activeCondition}
                  onChange={(event) => updateParam('condition', event.target.value)}
                  className="select text-xs"
                >
                  {CONDITION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted/80">Talle</p>
                <input
                  value={activeSize}
                  onChange={(event) => updateParam('size', event.target.value)}
                  placeholder="Ej: M, 38, 42"
                  className="input py-2.5 text-xs"
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-ink p-5 text-cream">
            <Sparkles size={18} className="text-clay-light" />
            <p className="mt-3 font-display text-xl leading-snug">¿No sabés qué elegir?</p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-cream/55">
              El Personal Shopper IA arma un look completo con tu presupuesto y talle.
            </p>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('caos:open-chat'))}
              className="mt-4 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-clay-light transition hover:text-cream"
            >
              Abrir el chat <ArrowRight size={12} />
            </button>
          </div>
        </aside>

        <section>
          {activeFilters.length > 0 && (
            <div className="mb-5 flex flex-wrap items-center gap-2">
              {activeFilters.map((filter) => (
                <span key={filter.key} className="chip">
                  {filter.label}: {filter.value}
                  <button
                    onClick={() => updateParam(filter.key, '')}
                    className="rounded-full p-0.5 text-muted transition hover:bg-black/5 hover:text-ink"
                    aria-label={`Quitar filtro ${filter.label}`}
                  >
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
          )}

          {loading ? (
            <LoadingState label="Buscando piezas en la curaduría…" />
          ) : error ? (
            <ErrorState message={error} onRetry={() => updateParam('sort', sort)} />
          ) : products.length === 0 ? (
            <EmptyState
              icon={<Shirt size={24} />}
              title="No encontramos prendas"
              description="Probá quitando algún filtro o explorando otra categoría. El stock es unitario y cambia todos los días."
              action={
                <button onClick={clearFilters} className="btn-secondary px-5 py-2 text-xs">
                  Ver todo el catálogo
                </button>
              }
            />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-x-4 gap-y-9 md:grid-cols-3 lg:gap-x-6">
                {products.map((product, index) => (
                  <ProductCard key={product.id} product={product} index={index} />
                ))}
              </div>
              <Pagination
                page={pageData.page}
                pages={pageData.pages}
                onChange={(next) => updateParam('page', String(next))}
              />
            </>
          )}
        </section>
      </div>
    </div>
  )
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'block w-full rounded-lg px-2.5 py-1.5 text-left text-[12px] transition',
        active ? 'bg-cream font-semibold text-ink' : 'text-muted hover:bg-cream/60 hover:text-ink',
      )}
    >
      {children}
    </button>
  )
}
