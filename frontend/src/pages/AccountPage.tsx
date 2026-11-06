import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  ChevronDown,
  LogOut,
  Package,
  Receipt,
  Settings,
  ShieldCheck,
  ShoppingBag,
  UserRound,
} from 'lucide-react'
import { api } from '../lib/api'
import { formatCurrency, formatDate, formatDateTime, PAYMENT_LABELS, ROLE_LABELS } from '../lib/format'
import type { Page, Sale, User } from '../types'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useCart } from '../context/CartContext'
import { SaleStatusBadge } from '../components/StatusBadges'
import { Badge, EmptyState, Field, Spinner, StatCard } from '../components/ui'
import { cn } from '../lib/format'

type Tab = 'compras' | 'datos' | 'seguridad'

const TABS: { id: Tab; label: string; icon: typeof Receipt }[] = [
  { id: 'compras', label: 'Mis compras', icon: Receipt },
  { id: 'datos', label: 'Mis datos', icon: UserRound },
  { id: 'seguridad', label: 'Seguridad', icon: ShieldCheck },
]

export function AccountPage() {
  const { user, isAdmin, logout, updateUser } = useAuth()
  const { toast } = useToast()
  const { count } = useCart()
  const [tab, setTab] = useState<Tab>('compras')
  const [sales, setSales] = useState<Sale[]>([])
  const [salesLoading, setSalesLoading] = useState(true)
  const [salesError, setSalesError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<number | null>(null)

  const [name, setName] = useState(user?.name ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [savingProfile, setSavingProfile] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  useEffect(() => {
    if (!user) return
    setName(user.name)
    setPhone(user.phone ?? '')
  }, [user])

  useEffect(() => {
    let active = true
    setSalesLoading(true)
    api
      .get<Page<Sale>>('/sales/mine?page_size=50')
      .then((result) => active && setSales(result.items))
      .catch((error: unknown) => {
        if (active) setSalesError(error instanceof Error ? error.message : 'No pudimos cargar tus compras.')
      })
      .finally(() => active && setSalesLoading(false))
    return () => {
      active = false
    }
  }, [])

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault()
    setSavingProfile(true)
    try {
      const updated = await api.patch<User>('/auth/me', { name: name.trim(), phone: phone.trim() || null })
      if (updated) updateUser(updated)
      toast('Datos actualizados.', 'success')
    } catch (error) {
      toast(error instanceof Error ? error.message : 'No pudimos actualizar tus datos.', 'error')
    } finally {
      setSavingProfile(false)
    }
  }

  const savePassword = async (event: FormEvent) => {
    event.preventDefault()
    if (newPassword !== confirmPassword) {
      toast('Las contraseñas nuevas no coinciden.', 'error')
      return
    }
    setSavingPassword(true)
    try {
      const response = await api.post<{ message: string }>('/auth/me/password', {
        current_password: currentPassword,
        new_password: newPassword,
      })
      toast(response.message, 'success')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      toast(error instanceof Error ? error.message : 'No pudimos cambiar la contraseña.', 'error')
    } finally {
      setSavingPassword(false)
    }
  }

  if (!user) return null

  const totalSpent = sales
    .filter((sale) => sale.status === 'completed')
    .reduce((sum, sale) => sum + Number(sale.total), 0)

  return (
    <div className="container-wide py-10">
      <div className="relative overflow-hidden rounded-3xl bg-ink px-6 py-8 text-cream sm:px-9">
        <div className="paper-texture absolute inset-0 opacity-[0.07]" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-clay/25 font-display text-2xl text-cream">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-cream/45">Mi cuenta</p>
              <h1 className="mt-0.5 font-display text-3xl leading-tight">{user.name}</h1>
              <p className="mt-1 text-xs text-cream/55">{user.email}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="ochre">{ROLE_LABELS[user.role]}</Badge>
            {isAdmin && (
              <Link to="/admin" className="inline-flex items-center gap-1.5 rounded-full border border-cream/20 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-cream transition hover:border-cream/50">
                Backoffice <ArrowRight size={12} />
              </Link>
            )}
            <button
              onClick={() => {
                logout()
                toast('Sesión cerrada.', 'info')
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-cream/20 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-cream/70 transition hover:border-red-400/40 hover:text-red-200"
            >
              <LogOut size={12} /> Salir
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Compras realizadas" value={String(sales.filter((sale) => sale.status === 'completed').length)} icon={<Receipt size={16} />} tone="clay" />
        <StatCard label="Total invertido" value={formatCurrency(totalSpent)} detail="Compras completadas" icon={<ShoppingBag size={16} />} tone="sage" />
        <StatCard label="Piezas en la bolsa" value={String(count)} detail={count > 0 ? 'Listas para comprar' : 'Todavía no agregaste prendas'} icon={<Package size={16} />} />
      </div>

      <div className="mt-8 flex gap-1 overflow-x-auto border-b border-sand pb-px no-scrollbar">
        {TABS.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={cn(
                'flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] transition',
                tab === item.id ? 'border-clay text-clay' : 'border-transparent text-muted hover:text-ink',
              )}
            >
              <Icon size={14} /> {item.label}
            </button>
          )
        })}
      </div>

      <div className="mt-6">
        {tab === 'compras' && (
          <div>
            {salesLoading ? (
              <div className="flex items-center gap-2 py-16 text-sm text-muted">
                <Spinner size={16} className="text-clay" /> Cargando tus compras…
              </div>
            ) : salesError ? (
              <ErrorBox message={salesError} />
            ) : sales.length === 0 ? (
              <EmptyState
                icon={<ShoppingBag size={24} />}
                title="Todavía no compraste nada"
                description="Cuando confirmes tu primera compra, vas a verla acá con todo el detalle y la trazabilidad de la pieza."
                action={
                  <Link to="/tienda" className="btn-primary">
                    Explorar catálogo <ArrowRight size={15} />
                  </Link>
                }
              />
            ) : (
              <div className="space-y-3">
                {sales.map((sale) => {
                  const open = expanded === sale.id
                  return (
                    <div key={sale.id} className="overflow-hidden rounded-2xl border border-sand bg-white/60">
                      <button
                        onClick={() => setExpanded(open ? null : sale.id)}
                        className="flex w-full flex-wrap items-center gap-3 px-5 py-4 text-left transition hover:bg-cream/50"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-display text-lg text-ink">{sale.code}</p>
                            <SaleStatusBadge status={sale.status} />
                          </div>
                          <p className="mt-1 text-[11px] text-muted">
                            {formatDateTime(sale.created_at)} · {sale.total_items} {sale.total_items === 1 ? 'prenda' : 'prendas'} · {PAYMENT_LABELS[sale.payment_method]}
                          </p>
                        </div>
                        <p className="font-display text-xl text-ink">{formatCurrency(sale.total)}</p>
                        <ChevronDown size={16} className={cn('text-muted transition', open && 'rotate-180')} />
                      </button>
                      {open && (
                        <div className="border-t border-sand bg-cream/30 px-5 py-4">
                          <div className="space-y-2">
                            {sale.items.map((item) => (
                              <div key={item.id} className="flex items-center justify-between gap-3 text-xs">
                                <div className="min-w-0">
                                  <Link to={`/producto/${item.product_id}`} className="font-medium text-ink transition hover:text-clay">
                                    {item.product_name}
                                  </Link>
                                  <p className="text-[10px] text-muted">Cantidad {item.quantity} · Unitario {formatCurrency(item.unit_price)}</p>
                                </div>
                                <span className="shrink-0 font-medium text-ink">{formatCurrency(item.line_total)}</span>
                              </div>
                            ))}
                          </div>
                          <div className="mt-4 grid gap-2 border-t border-sand pt-3 text-[11px] text-muted sm:grid-cols-3">
                            <p>Compra: {formatDate(sale.created_at)}</p>
                            <p>Subtotal: {formatCurrency(sale.subtotal)}</p>
                            <p>Descuento: {formatCurrency(sale.discount)}</p>
                          </div>
                          {sale.notes && <p className="mt-2 text-[11px] text-muted">Notas: {sale.notes}</p>}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {tab === 'datos' && (
          <form onSubmit={saveProfile} className="card max-w-xl p-6">
            <div className="flex items-center gap-2">
              <Settings size={17} className="text-clay" />
              <h2 className="font-display text-2xl text-ink">Datos personales</h2>
            </div>
            <p className="mt-1 text-xs text-muted">El email de la cuenta no se puede modificar desde el perfil.</p>
            <div className="mt-6 space-y-4">
              <Field label="Nombre completo">
                <input value={name} onChange={(event) => setName(event.target.value)} required minLength={2} className="input" />
              </Field>
              <Field label="Email">
                <input value={user.email} disabled className="input bg-cream/60" />
              </Field>
              <Field label="Teléfono">
                <input value={phone} onChange={(event) => setPhone(event.target.value)} className="input" placeholder="+54 9 11 0000 0000" />
              </Field>
            </div>
            <button type="submit" disabled={savingProfile} className="btn-primary mt-6">
              {savingProfile && <Spinner size={15} />}
              Guardar cambios
            </button>
          </form>
        )}

        {tab === 'seguridad' && (
          <form onSubmit={savePassword} className="card max-w-xl p-6">
            <div className="flex items-center gap-2">
              <ShieldCheck size={17} className="text-clay" />
              <h2 className="font-display text-2xl text-ink">Cambiar contraseña</h2>
            </div>
            <p className="mt-1 text-xs text-muted">
              Usá al menos 8 caracteres, combinando letras y números. La sesión actual se mantiene activa.
            </p>
            <div className="mt-6 space-y-4">
              <Field label="Contraseña actual">
                <input type="password" required value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="input" autoComplete="current-password" />
              </Field>
              <Field label="Nueva contraseña" hint="Mínimo 8 caracteres, con letras y números.">
                <input type="password" required minLength={8} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="input" autoComplete="new-password" />
              </Field>
              <Field label="Repetir nueva contraseña">
                <input type="password" required minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="input" autoComplete="new-password" />
              </Field>
            </div>
            <button type="submit" disabled={savingPassword} className="btn-primary mt-6">
              {savingPassword && <Spinner size={15} />}
              Actualizar contraseña
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

function ErrorBox({ message }: { message: string }) {
  return (
    <p className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">{message}</p>
  )
}
