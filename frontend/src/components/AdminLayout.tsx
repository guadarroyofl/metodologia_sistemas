import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowUpRight,
  BarChart3,
  LayoutDashboard,
  LogOut,
  Menu,
  Receipt,
  Shirt,
  Sparkles,
  Users,
  X,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { cn } from '../lib/format'
import { ScrollToTop } from './PublicLayout'

const NAVIGATION = [
  { to: '/admin', label: 'Resumen', icon: LayoutDashboard, end: true },
  { to: '/admin/prendas', label: 'Prendas', icon: Shirt },
  { to: '/admin/ventas', label: 'Ventas', icon: Receipt },
  { to: '/admin/usuarios', label: 'Usuarios', icon: Users },
  { to: '/admin/reportes', label: 'Reportes', icon: BarChart3 },
  { to: '/admin/precios', label: 'Precios IA', icon: Sparkles },
]

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    toast('Sesión cerrada. ¡Hasta pronto!', 'info')
    navigate('/')
  }

  return (
    <div className="flex h-full flex-col">
      <div className="px-6 pb-8 pt-7">
        <Link to="/" className="flex flex-col leading-none" onClick={onNavigate}>
          <span className="font-display text-[25px] font-bold tracking-[0.16em] text-cream">CAOS</span>
          <span className="mt-1 text-[8px] font-semibold uppercase tracking-[0.5em] text-clay-light">
            Backoffice
          </span>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {NAVIGATION.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[12px] font-medium transition',
                  isActive
                    ? 'bg-cream/10 text-cream'
                    : 'text-cream/55 hover:bg-cream/5 hover:text-cream',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={17} className={isActive ? 'text-clay-light' : ''} />
                  <span>{item.label}</span>
                  {isActive && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-clay-light" />}
                </>
              )}
            </NavLink>
          )
        })}
      </nav>

      <div className="space-y-3 px-4 pb-5">
        <Link
          to="/"
          onClick={onNavigate}
          className="flex items-center justify-between rounded-xl border border-cream/10 px-3.5 py-2.5 text-[11px] font-medium text-cream/60 transition hover:border-cream/25 hover:text-cream"
        >
          Ver tienda
          <ArrowUpRight size={13} />
        </Link>
        <div className="rounded-xl bg-cream/5 p-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-clay/25 font-display text-sm text-cream">
              {user?.name?.charAt(0) ?? 'A'}
            </div>
            <div className="min-w-0">
              <p className="truncate text-[11px] font-semibold text-cream">{user?.name}</p>
              <p className="truncate text-[9px] text-cream/45">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-cream/10 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-cream/55 transition hover:border-red-400/40 hover:text-red-200"
          >
            <LogOut size={12} /> Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  )
}

export function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const current = NAVIGATION.find((item) =>
    item.end ? location.pathname === item.to : location.pathname.startsWith(item.to),
  )

  return (
    <div className="min-h-screen admin-surface">
      <ScrollToTop />
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[252px] bg-ink lg:block">
        <SidebarContent />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-label="Cerrar menú"
          />
          <aside className="absolute inset-y-0 left-0 w-[272px] bg-ink shadow-soft">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute right-4 top-6 rounded-full p-2 text-cream/60 hover:bg-cream/10 hover:text-cream"
              aria-label="Cerrar"
            >
              <X size={18} />
            </button>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-[252px]">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-sand/70 bg-[#f8f4ec]/90 px-4 backdrop-blur-md sm:px-7">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-sand text-ink lg:hidden"
              aria-label="Abrir menú"
            >
              <Menu size={18} />
            </button>
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-muted">Panel</p>
              <p className="font-display text-lg leading-tight text-ink">{current?.label ?? 'Administración'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-1.5 rounded-full border border-sage/25 bg-sage/10 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-sage sm:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-sage" /> Sistema operativo
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-clay/15 font-display text-sm text-clay-dark">
              <Shirt size={16} />
            </div>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-7 sm:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
