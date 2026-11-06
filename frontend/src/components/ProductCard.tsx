import { Link } from 'react-router-dom'
import type { MouseEvent } from 'react'
import { ShoppingBag, Sparkles } from 'lucide-react'
import type { Product } from '../types'
import { formatCurrency, handleImageError } from '../lib/format'
import { useCart } from '../context/CartContext'
import { useToast } from '../context/ToastContext'
import { ConditionBadge } from './StatusBadges'

export function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const { addItem, hasItem } = useCart()
  const { toast } = useToast()
  const inCart = hasItem(product.id)

  const quickAdd = (event: MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
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

  return (
    <Link
      to={`/producto/${product.id}`}
      className="group block animate-fade-up"
      style={{ animationDelay: `${Math.min(index, 8) * 55}ms` }}
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-sand">
        <img
          src={product.image_url || ''}
          alt={product.name}
          loading="lazy"
          onError={handleImageError}
          className="h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.04]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/25 via-transparent to-transparent opacity-0 transition duration-500 group-hover:opacity-100" />

        <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
          <ConditionBadge condition={product.condition} />
          {product.is_featured && (
            <span className="inline-flex items-center gap-1 rounded-full bg-ink/85 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-cream backdrop-blur">
              <Sparkles size={10} /> Curaduría
            </span>
          )}
        </div>

        {!product.available && (
          <div className="absolute inset-0 flex items-center justify-center bg-ink/45 backdrop-blur-[1px]">
            <span className="rotate-[-6deg] border border-cream/60 px-4 py-2 font-display text-lg tracking-[0.2em] text-cream">
              VENDIDA
            </span>
          </div>
        )}

        {product.available && (
          <button
            onClick={quickAdd}
            aria-label="Agregar a la bolsa"
            className="absolute bottom-3 right-3 flex h-10 w-10 translate-y-2 items-center justify-center rounded-full bg-paper/95 text-ink opacity-0 shadow-soft transition duration-300 hover:bg-clay hover:text-white group-hover:translate-y-0 group-hover:opacity-100"
          >
            <ShoppingBag size={16} />
          </button>
        )}

        <span className="absolute bottom-3 left-3 rounded-full bg-paper/90 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-ink opacity-0 backdrop-blur transition group-hover:opacity-100">
          Pieza única
        </span>
      </div>

      <div className="mt-3.5 space-y-1">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-[17px] leading-snug text-ink transition group-hover:text-clay">
            {product.name}
          </h3>
          <p className="shrink-0 pt-0.5 text-sm font-semibold text-ink">{formatCurrency(product.price)}</p>
        </div>
        <p className="text-[11px] uppercase tracking-[0.12em] text-muted">
          {product.category.name}
          {product.brand ? ` · ${product.brand}` : ''}
          {product.size ? ` · Talle ${product.size}` : ''}
        </p>
        {product.styles.length > 0 && (
          <p className="truncate text-[11px] text-clay/80">{product.styles.map((style) => style.name).join(' · ')}</p>
        )}
      </div>
    </Link>
  )
}
