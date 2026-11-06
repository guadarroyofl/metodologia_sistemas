import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Leaf,
  Package,
  RefreshCcw,
  Ruler,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
} from 'lucide-react'
import { api } from '../lib/api'
import { CONDITION_LABELS, formatCurrency, handleImageError } from '../lib/format'
import type { Page, Product } from '../types'
import { useCart } from '../context/CartContext'
import { useToast } from '../context/ToastContext'
import { ProductCard } from '../components/ProductCard'
import { ConditionBadge, ProductStatusBadge } from '../components/StatusBadges'
import { ErrorState, LoadingState } from '../components/ui'

export function ProductDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { addItem, hasItem } = useCart()
  const { toast } = useToast()
  const [product, setProduct] = useState<Product | null>(null)
  const [related, setRelated] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const inCart = product ? hasItem(product.id) : false

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    api
      .get<Product>(`/products/${id}`)
      .then(async (data) => {
        if (!active) return
        setProduct(data)
        try {
          const page = await api.get<Page<Product>>(
            `/products?category_id=${data.category.id}&page_size=5&sort=newest`,
          )
          if (active) setRelated(page.items.filter((item) => item.id !== data.id).slice(0, 4))
        } catch {
          // las relacionadas son opcionales
        }
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'No pudimos cargar la prenda.')
      })
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [id])

  const handleAdd = () => {
    if (!product) return
    if (!product.available) {
      toast('Esta prenda ya fue vendida. El stock es unitario.', 'info')
      return
    }
    if (inCart) {
      toast('Esta prenda ya está en tu bolsa.', 'info')
      return
    }
    addItem(product)
    toast(`“${product.name}” se agregó a tu bolsa.`)
  }

  const handleBuyNow = () => {
    if (!product || !product.available) return
    if (!inCart) addItem(product)
    navigate('/carrito')
  }

  if (loading) return <LoadingState label="Abriendo la ficha de la prenda…" />
  if (error || !product) {
    return (
      <div className="container-wide py-16">
        <ErrorState message={error ?? 'La prenda no existe o fue dada de baja.'} />
        <div className="mt-6 text-center">
          <Link to="/tienda" className="btn-secondary">
            <ArrowLeft size={15} /> Volver al catálogo
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container-wide py-6 lg:py-10">
      <div className="flex items-center gap-2 text-[11px] text-muted">
        <Link to="/tienda" className="inline-flex items-center gap-1 transition hover:text-clay">
          <ArrowLeft size={13} /> Catálogo
        </Link>
        <span className="text-sand">/</span>
        <Link to={`/tienda?category=${product.category.id}`} className="transition hover:text-clay">
          {product.category.name}
        </Link>
        <span className="text-sand">/</span>
        <span className="truncate text-ink/70">{product.name}</span>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
        <div>
          <div className="relative aspect-[4/5] overflow-hidden rounded-[1.75rem] bg-sand">
            <img
              src={product.image_url || ''}
              alt={product.name}
              onError={handleImageError}
              className="h-full w-full object-cover"
            />
            <div className="absolute left-4 top-4 flex flex-col gap-2">
              <ConditionBadge condition={product.condition} />
              {product.is_featured && (
                <span className="inline-flex items-center gap-1 rounded-full bg-ink/85 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-cream backdrop-blur">
                  <Sparkles size={10} /> Curaduría
                </span>
              )}
            </div>
            {!product.available && (
              <div className="absolute inset-0 flex items-center justify-center bg-ink/40 backdrop-blur-[1px]">
                <span className="rotate-[-6deg] border border-cream/60 px-6 py-2.5 font-display text-2xl tracking-[0.24em] text-cream">
                  VENDIDA
                </span>
              </div>
            )}
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            {[
              { icon: Package, title: 'Pieza única', text: '1 unidad real' },
              { icon: ShieldCheck, title: 'Curada', text: 'Revisada a mano' },
              { icon: RefreshCcw, title: 'Circular', text: 'Segunda vida' },
            ].map((item) => {
              const Icon = item.icon
              return (
                <div key={item.title} className="rounded-xl border border-sand bg-white/50 px-2 py-3">
                  <Icon size={15} className="mx-auto text-clay" />
                  <p className="mt-1.5 text-[10px] font-semibold text-ink">{item.title}</p>
                  <p className="text-[9px] text-muted">{item.text}</p>
                </div>
              )
            })}
          </div>
        </div>

        <div className="lg:py-2">
          <div className="flex flex-wrap items-center gap-2">
            <ProductStatusBadge status={product.status} />
            <span className="text-[10px] uppercase tracking-[0.16em] text-muted">SKU {product.sku}</span>
          </div>
          <h1 className="mt-4 font-display text-4xl leading-tight text-ink sm:text-5xl">{product.name}</h1>
          <p className="mt-3 text-sm text-muted">
            {product.category.name}
            {product.brand ? ` · ${product.brand}` : ''}
            {product.size ? ` · Talle ${product.size}` : ''}
          </p>

          <div className="mt-6 flex flex-wrap items-end gap-3 border-y border-sand py-5">
            <p className="font-display text-4xl text-ink">{formatCurrency(product.price)}</p>
            <p className="pb-1 text-[11px] text-muted">Precio final · envío calculado al comprar</p>
          </div>

          <p className="mt-6 text-sm leading-relaxed text-muted">{product.description}</p>

          <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-sand pt-5 text-sm">
            <Detail label="Estado" value={CONDITION_LABELS[product.condition]} />
            <Detail label="Talle" value={product.size ?? 'Único'} />
            <Detail label="Marca" value={product.brand ?? 'Sin marca'} />
            <Detail label="Color" value={product.color ?? '—'} />
          </div>

          {product.styles.length > 0 && (
            <div className="mt-5">
              <p className="label">Estilos</p>
              <div className="flex flex-wrap gap-1.5">
                {product.styles.map((style) => (
                  <Link key={style.id} to={`/tienda?style=${style.slug}`} className="chip transition hover:border-clay hover:text-clay">
                    {style.name}
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <button
              onClick={handleAdd}
              disabled={!product.available}
              className="btn-primary flex-1 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ShoppingBag size={17} />
              {inCart ? 'Ya está en tu bolsa' : product.available ? 'Agregar a la bolsa' : 'Prenda vendida'}
            </button>
            <button
              onClick={handleBuyNow}
              disabled={!product.available}
              className="btn-secondary flex-1 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Comprar ahora <ArrowRight size={15} />
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[10px] font-medium text-muted">
            <span className="flex items-center gap-1.5"><BadgeCheck size={13} className="text-sage" /> Pago seguro</span>
            <span className="flex items-center gap-1.5"><Ruler size={13} className="text-sage" /> Medidas verificadas</span>
            <span className="flex items-center gap-1.5"><Leaf size={13} className="text-sage" /> Moda circular</span>
          </div>

          <div className="mt-7 rounded-2xl bg-ink p-5 text-cream">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-clay/25 text-clay-light">
                <Sparkles size={16} />
              </span>
              <div>
                <p className="font-display text-lg leading-snug">¿Cómo lo combinarías?</p>
                <p className="mt-1 text-[11px] leading-relaxed text-cream/55">
                  Pedile al Personal Shopper IA un look completo con esta prenda y otras piezas disponibles.
                </p>
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent('caos:open-chat'))}
                  className="mt-3 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-clay-light transition hover:text-cream"
                >
                  Abrir el chat de estilo <ArrowRight size={12} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-16 border-t border-sand pt-10">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow mb-2">Misma categoría</p>
              <h2 className="font-display text-3xl text-ink">También te puede gustar</h2>
            </div>
            <Link to={`/tienda?category=${product.category.id}`} className="link-underline hidden text-sm sm:inline-flex">
              Ver todo <ArrowRight size={14} />
            </Link>
          </div>
          <div className="mt-7 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
            {related.map((item, index) => (
              <ProductCard key={item.id} product={item} index={index} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-0.5 text-ink">{value}</p>
    </div>
  )
}
