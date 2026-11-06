import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CreditCard,
  Lock,
  Package,
  ShoppingBag,
  Trash2,
  Truck,
} from 'lucide-react'
import { api } from '../lib/api'
import { formatCurrency, handleImageError, PAYMENT_LABELS } from '../lib/format'
import type { PaymentMethod, Sale } from '../types'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { useToast } from '../context/ToastContext'
import { EmptyState } from '../components/ui'
import { cn } from '../lib/format'

const PAYMENT_OPTIONS: { value: PaymentMethod; hint: string }[] = [
  { value: 'transfer', hint: 'Transferencia bancaria o Mercado Pago' },
  { value: 'mercadopago', hint: 'Checkout con Mercado Pago' },
  { value: 'card', hint: 'Tarjeta de débito o crédito' },
  { value: 'cash', hint: 'Efectivo al retirar en el showroom' },
]

export function CartPage() {
  const { items, total, count, removeItem, clear } = useCart()
  const { user, isAdmin } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [payment, setPayment] = useState<PaymentMethod>('transfer')
  const [customerName, setCustomerName] = useState(user?.name ?? '')
  const [customerEmail, setCustomerEmail] = useState(user?.email ?? '')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [confirmed, setConfirmed] = useState<Sale | null>(null)

  const canCheckout = Boolean(user) && !isAdmin && items.length > 0

  const handleCheckout = async (event: FormEvent) => {
    event.preventDefault()
    if (!user) {
      navigate('/login', { state: { from: '/carrito' } })
      return
    }
    if (items.length === 0) return
    setSubmitting(true)
    try {
      const sale = await api.post<Sale>('/sales', {
        items: items.map((item) => ({ product_id: item.product.id })),
        payment_method: payment,
        customer_name: customerName.trim() || user.name,
        customer_email: customerEmail.trim() || user.email,
        notes: notes.trim() || null,
      })
      setConfirmed(sale)
      clear()
      toast('¡Compra confirmada! Te enviamos el detalle por correo.', 'success')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No pudimos confirmar la compra.'
      toast(message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (confirmed) {
    return (
      <div className="container-wide py-16">
        <div className="mx-auto max-w-xl rounded-3xl border border-sand bg-white/60 px-6 py-12 text-center shadow-card sm:px-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-sage/15 text-sage">
            <Check size={28} />
          </div>
          <p className="eyebrow mt-6">Compra confirmada</p>
          <h1 className="mt-2 font-display text-4xl text-ink">Tu pieza es tuya</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Registramos la venta <strong className="text-ink">{confirmed.code}</strong> por{' '}
            {formatCurrency(confirmed.total)}. Como el stock es unitario, la prenda ya quedó reservada
            para vos.
          </p>
          <div className="mt-6 rounded-2xl bg-cream px-5 py-4 text-left text-xs text-muted">
            <p className="flex justify-between gap-4 py-1">
              <span>Medio de pago</span>
              <span className="font-medium text-ink">{PAYMENT_LABELS[confirmed.payment_method]}</span>
            </p>
            <p className="flex justify-between gap-4 py-1">
              <span>Prendas</span>
              <span className="font-medium text-ink">{confirmed.total_items}</span>
            </p>
            <p className="flex justify-between gap-4 py-1">
              <span>Total</span>
              <span className="font-display text-base text-ink">{formatCurrency(confirmed.total)}</span>
            </p>
          </div>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link to="/cuenta" className="btn-primary">
              Ver mis compras <ArrowRight size={15} />
            </Link>
            <Link to="/tienda" className="btn-secondary">
              Seguir explorando
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (count === 0) {
    return (
      <div className="container-wide py-16">
        <EmptyState
          icon={<ShoppingBag size={24} />}
          title="Tu bolsa está vacía"
          description="Cada prenda existe una sola vez. Si algo te gusta, agregalo antes de que otra persona lo encuentre."
          action={
            <Link to="/tienda" className="btn-primary">
              Explorar catálogo <ArrowRight size={15} />
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <div className="container-wide py-8 lg:py-12">
      <div className="flex items-end justify-between gap-4 border-b border-sand pb-6">
        <div>
          <p className="eyebrow mb-2">Tu selección</p>
          <h1 className="font-display text-4xl text-ink">Bolsa ({count})</h1>
        </div>
        <Link to="/tienda" className="link-underline text-sm">
          <ArrowLeft size={14} /> Seguir comprando
        </Link>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.35fr_0.85fr] lg:gap-12">
        <div className="space-y-4">
          {items.map(({ product }) => (
            <div key={product.id} className="flex gap-4 rounded-2xl border border-sand bg-white/60 p-3 sm:p-4">
              <Link to={`/producto/${product.id}`} className="h-28 w-24 shrink-0 overflow-hidden rounded-xl bg-sand sm:h-32 sm:w-28">
                <img
                  src={product.image_url || ''}
                  alt={product.name}
                  onError={handleImageError}
                  className="h-full w-full object-cover transition duration-500 hover:scale-105"
                />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link to={`/producto/${product.id}`} className="font-display text-lg leading-snug text-ink transition hover:text-clay">
                      {product.name}
                    </Link>
                    <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-muted">
                      {product.category.name}
                      {product.size ? ` · Talle ${product.size}` : ''}
                      {product.brand ? ` · ${product.brand}` : ''}
                    </p>
                    <p className="mt-2 inline-flex items-center gap-1 text-[10px] font-medium text-sage">
                      <Package size={12} /> Pieza única reservada en tu bolsa
                    </p>
                  </div>
                  <p className="shrink-0 font-display text-lg text-ink">{formatCurrency(product.price)}</p>
                </div>
                <div className="mt-auto flex items-center justify-between pt-3">
                  <span className="text-[10px] uppercase tracking-[0.14em] text-muted">Cantidad 1</span>
                  <button
                    onClick={() => {
                      removeItem(product.id)
                      toast('Prenda quitada de la bolsa.', 'info')
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-muted transition hover:text-red-700"
                  >
                    <Trash2 size={13} /> Quitar
                  </button>
                </div>
              </div>
            </div>
          ))}

          <div className="rounded-2xl border border-sand bg-cream/50 px-5 py-4">
            <div className="flex items-start gap-3 text-xs text-muted">
              <Truck size={16} className="mt-0.5 shrink-0 text-clay" />
              <p className="leading-relaxed">
                Envíos a todo el país en 3 a 7 días hábiles. El costo se coordina según la localidad.
                También podés retirar sin cargo en nuestro showroom de Buenos Aires.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleCheckout} className="card h-fit p-5 sm:p-6">
          <h2 className="font-display text-2xl text-ink">Resumen de compra</h2>

          <div className="mt-5 space-y-2 border-b border-sand pb-5 text-sm">
            <div className="flex justify-between text-muted">
              <span>Subtotal ({count} {count === 1 ? 'prenda' : 'prendas'})</span>
              <span>{formatCurrency(total)}</span>
            </div>
            <div className="flex justify-between text-muted">
              <span>Envío</span>
              <span className="text-[11px]">A coordinar</span>
            </div>
            <div className="flex items-end justify-between pt-2">
              <span className="font-medium text-ink">Total</span>
              <span className="font-display text-3xl text-ink">{formatCurrency(total)}</span>
            </div>
          </div>

          <div className="mt-5">
            <p className="label">Medio de pago</p>
            <div className="space-y-2">
              {PAYMENT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setPayment(option.value)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition',
                    payment === option.value
                      ? 'border-clay bg-clay/5'
                      : 'border-sand bg-white/50 hover:border-clay/40',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
                      payment === option.value ? 'border-clay bg-clay text-white' : 'border-sand',
                    )}
                  >
                    {payment === option.value && <Check size={10} />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs font-semibold text-ink">{PAYMENT_LABELS[option.value]}</span>
                    <span className="block text-[10px] text-muted">{option.hint}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <label className="block">
              <span className="label">Nombre de contacto</span>
              <input
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                required
                className="input py-2.5 text-xs"
                placeholder="Tu nombre"
              />
            </label>
            <label className="block">
              <span className="label">Email</span>
              <input
                type="email"
                value={customerEmail}
                onChange={(event) => setCustomerEmail(event.target.value)}
                required
                className="input py-2.5 text-xs"
                placeholder="tu@email.com"
              />
            </label>
            <label className="block">
              <span className="label">Notas (opcional)</span>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={2}
                className="input resize-none py-2.5 text-xs"
                placeholder="Retiro en showroom, horario, etc."
              />
            </label>
          </div>

          {!user ? (
            <div className="mt-5 rounded-xl border border-ochre/25 bg-ochre/10 px-4 py-3 text-[11px] leading-relaxed text-[#8a6b20]">
              Necesitás iniciar sesión para confirmar la compra.{' '}
              <Link
                to="/login"
                state={{ from: '/carrito' }}
                className="font-semibold underline underline-offset-2"
              >
                Ingresar o crear cuenta
              </Link>
            </div>
          ) : isAdmin ? (
            <div className="mt-5 rounded-xl border border-sand bg-cream px-4 py-3 text-[11px] leading-relaxed text-muted">
              Estás con una cuenta administradora. Para comprar, ingresá con una cuenta de cliente.
            </div>
          ) : null}

          <button
            type="submit"
            disabled={!canCheckout || submitting}
            className="btn-primary mt-5 w-full disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? 'Confirmando…' : 'Confirmar compra'}
            {!submitting && <ArrowRight size={15} />}
          </button>

          <p className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-muted">
            <Lock size={11} /> Checkout protegido con autenticación JWT
          </p>
          <p className="mt-1 flex items-center justify-center gap-1.5 text-[10px] text-muted">
            <CreditCard size={11} /> No almacenamos datos de tarjetas
          </p>
        </form>
      </div>
    </div>
  )
}
