import { useEffect, useState, type FormEvent } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  ArrowRight,
  Instagram,
  Mail,
  Menu,
  Search,
  ShoppingBag,
  User as UserIcon,
  X,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { ChatWidget } from './ChatWidget'
import { cn } from '../lib/format'

function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link to="/" className="group flex flex-col leading-none" aria-label="CAOS Vintage — Inicio">
      <span
        className={cn(
          'font-display text-[26px] font-bold tracking-[0.16em] transition group-hover:text-clay',
          light ? 'text-cream' : 'text-ink',
        )}
      >
        CAOS
      </span>
      <span className="mt-1 text-[8px] font-semibold uppercase tracking-[0.52em] text-clay">Vintage</span>
    </Link>
  )
}

export function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    if (!window.location.hash) window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [pathname])
  return null
}

const NAV_LINKS = [
  { label: 'Tienda', to: '/tienda' },
  { label: 'Estilos', to: '/tienda?view=styles' },
  { label: 'Nosotras', to: '/#nosotras' },
]

export function PublicLayout() {
  const { user, isAdmin } = useAuth()
  const { count } = useCart()
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname, location.search])

  return (
    <div className="min-h-screen bg-paper">
      <div className="bg-ink text-cream">
        <div className="container-wide flex h-9 items-center justify-center gap-2 text-[9px] font-medium uppercase tracking-[0.22em] sm:text-[10px]">
          <span className="hidden sm:inline">Curaduría de ropa única</span>
          <span className="hidden text-cream/30 sm:inline">·</span>
          <span>Stock unitario</span>
          <span className="text-cream/30">·</span>
          <span>Envíos a todo el país</span>
        </div>
      </div>

      <header className="sticky top-0 z-40 border-b border-sand/70 bg-paper/90 backdrop-blur-md">
        <div className="container-wide flex h-[74px] items-center justify-between gap-5">
          <div className="flex items-center gap-8">
            <Logo />
            <nav className="hidden items-center gap-7 lg:flex">
              {NAV_LINKS.map((link) => (
                <NavLink
                  key={link.label}
                  to={link.to}
                  className={({ isActive }) =>
                    cn(
                      'text-[11px] font-semibold uppercase tracking-[0.18em] transition hover:text-clay',
                      isActive ? 'text-clay' : 'text-ink/70',
                    )
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-0.5 sm:gap-1">
            <Link
              to="/tienda"
              className="hidden h-10 w-10 items-center justify-center rounded-full text-ink/70 transition hover:bg-cream hover:text-ink sm:flex"
              aria-label="Buscar prendas"
            >
              <Search size={18} />
            </Link>
            <Link
              to={user ? (isAdmin ? '/admin' : '/cuenta') : '/login'}
              className="flex h-10 w-10 items-center justify-center rounded-full text-ink/70 transition hover:bg-cream hover:text-ink"
              aria-label={user ? 'Mi cuenta' : 'Iniciar sesión'}
            >
              <UserIcon size={18} />
            </Link>
            <Link
              to="/carrito"
              className="relative flex h-10 items-center gap-2 rounded-full px-3 text-ink/80 transition hover:bg-cream hover:text-ink"
              aria-label="Ver bolsa"
            >
              <ShoppingBag size={18} />
              <span className="hidden text-[11px] font-semibold uppercase tracking-[0.14em] sm:inline">
                Bolsa
              </span>
              {count > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-clay px-1 text-[10px] font-bold text-white">
                  {count}
                </span>
              )}
            </Link>
            <button
              onClick={() => setMobileOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-full text-ink transition hover:bg-cream lg:hidden"
              aria-label="Abrir menú"
            >
              <Menu size={20} />
            </button>
          </div>
        </div>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-label="Cerrar menú"
          />
          <div className="absolute right-0 top-0 flex h-full w-[82%] max-w-sm flex-col bg-paper p-6 shadow-soft">
            <div className="flex items-center justify-between">
              <Logo />
              <button
                onClick={() => setMobileOpen(false)}
                className="rounded-full p-2 text-muted hover:bg-cream hover:text-ink"
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>
            <nav className="mt-10 flex flex-col gap-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.label}
                  to={link.to}
                  className="border-b border-sand/70 py-4 font-display text-2xl text-ink transition hover:text-clay"
                >
                  {link.label}
                </Link>
              ))}
              <Link
                to={user ? (isAdmin ? '/admin' : '/cuenta') : '/login'}
                className="border-b border-sand/70 py-4 font-display text-2xl text-ink transition hover:text-clay"
              >
                {user ? 'Mi cuenta' : 'Ingresar'}
              </Link>
            </nav>
            <div className="mt-auto rounded-2xl bg-cream p-5">
              <p className="eyebrow mb-2">Asesoría gratuita</p>
              <p className="text-sm leading-relaxed text-muted">
                Nuestro Personal Shopper IA te ayuda a armar un look con prendas disponibles.
              </p>
              <p className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-clay">
                Tocá la burbuja <ArrowRight size={13} /> abajo a la derecha
              </p>
            </div>
          </div>
        </div>
      )}

      <main>
        <Outlet />
      </main>

      <footer className="border-t border-sand bg-cream/70">
        <div className="container-wide py-14">
          <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.3fr]">
            <div>
              <Logo />
              <p className="mt-5 max-w-xs text-sm leading-relaxed text-muted">
                Curaduría de ropa vintage y de segunda mano. Cada prenda tiene historia, y solo
                existe una unidad.
              </p>
              <div className="mt-5 flex gap-2">
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-sand text-muted transition hover:border-clay hover:text-clay"
                  aria-label="Instagram"
                >
                  <Instagram size={15} />
                </a>
                <a
                  href="mailto:hola@caosvintage.com"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-sand text-muted transition hover:border-clay hover:text-clay"
                  aria-label="Email"
                >
                  <Mail size={15} />
                </a>
              </div>
            </div>

            <div>
              <p className="label">Tienda</p>
              <ul className="space-y-2.5 text-sm text-muted">
                <li><Link className="transition hover:text-clay" to="/tienda">Todo el catálogo</Link></li>
                <li><Link className="transition hover:text-clay" to="/tienda?style=denim">Denim</Link></li>
                <li><Link className="transition hover:text-clay" to="/tienda?style=vintage">Vintage</Link></li>
                <li><Link className="transition hover:text-clay" to="/tienda?style=y2k">Y2K</Link></li>
                <li><Link className="transition hover:text-clay" to="/tienda?style=band-tee">Band Tee</Link></li>
              </ul>
            </div>

            <div>
              <p className="label">Ayuda</p>
              <ul className="space-y-2.5 text-sm text-muted">
                <li><Link className="transition hover:text-clay" to="/#nosotras">Sobre CAOS</Link></li>
                <li><Link className="transition hover:text-clay" to="/cuenta">Mis compras</Link></li>
                <li><Link className="transition hover:text-clay" to="/login">Mi cuenta</Link></li>
                <li><a className="transition hover:text-clay" href="mailto:hola@caosvintage.com">Contacto</a></li>
              </ul>
            </div>

            <div>
              <p className="label">Newsletter</p>
              <p className="text-sm leading-relaxed text-muted">
                Nuevos ingresos y drops de curaduría. Sin spam, solo prendas con historia.
              </p>
              <form
                onSubmit={(event: FormEvent<HTMLFormElement>) => event.preventDefault()}
                className="mt-4 flex overflow-hidden rounded-full border border-sand bg-paper"
              >
                <input
                  type="email"
                  required
                  placeholder="tu@email.com"
                  className="min-w-0 flex-1 bg-transparent px-4 py-2.5 text-xs outline-none placeholder:text-muted/60"
                />
                <button
                  type="submit"
                  className="flex items-center gap-1 bg-ink px-4 text-[10px] font-semibold uppercase tracking-[0.1em] text-cream transition hover:bg-clay"
                >
                  Sumarme <ArrowRight size={12} />
                </button>
              </form>
            </div>
          </div>

          <div className="mt-12 flex flex-col gap-2 border-t border-sand pt-6 text-[10px] uppercase tracking-[0.14em] text-muted sm:flex-row sm:items-center sm:justify-between">
            <p>© 2026 CAOS Vintage · Buenos Aires, Argentina</p>
            <p>Metodología de Sistemas · Proyecto académico</p>
          </div>
        </div>
      </footer>

      <ChatWidget />
    </div>
  )
}
