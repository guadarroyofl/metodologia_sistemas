import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, Eye, EyeOff, Lock, Mail, Sparkles } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { Field, Spinner } from '../components/ui'
import { AuthAside } from './AuthAside'

interface LocationState {
  from?: string
}

export function LoginPage() {
  const { user, login } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as LocationState | null)?.from
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user) navigate(user.role === 'admin' ? '/admin' : (from || '/cuenta'), { replace: true })
  }, [user, from, navigate])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const logged = await login(email.trim(), password)
      toast(`Bienvenida, ${logged.name.split(' ')[0]}.`, 'success')
      navigate(logged.role === 'admin' ? '/admin' : (from || '/cuenta'), { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos iniciar sesión.')
    } finally {
      setLoading(false)
    }
  }

  const useDemo = (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail)
    setPassword(demoPassword)
    setError(null)
  }

  return (
    <div className="grid min-h-[calc(100vh-113px)] lg:grid-cols-[1fr_1.05fr]">
      <div className="flex items-center justify-center px-5 py-14 sm:px-10">
        <div className="w-full max-w-md">
          <p className="eyebrow mb-2">Mi cuenta</p>
          <h1 className="font-display text-4xl text-ink sm:text-5xl">Hola de nuevo</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Ingresá para ver tus compras, gestionar tus datos o acceder al backoffice si sos administradora.
          </p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <Field label="Email">
              <div className="relative">
                <Mail size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="input pl-11"
                  placeholder="tu@email.com"
                />
              </div>
            </Field>

            <Field label="Contraseña">
              <div className="relative">
                <Lock size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="input px-11"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted transition hover:text-ink"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </Field>

            <div className="flex justify-end">
              <Link to="/recuperar" className="text-[11px] font-medium text-clay transition hover:text-clay-dark">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            {error && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs leading-relaxed text-red-800">
                {error}
              </p>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? <Spinner size={16} /> : <Lock size={15} />}
              {loading ? 'Ingresando…' : 'Ingresar'}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-muted">
            ¿Todavía no tenés cuenta?{' '}
            <Link to="/registro" className="font-semibold text-clay transition hover:text-clay-dark">
              Crear una cuenta
            </Link>
          </p>

          <div className="mt-8 rounded-2xl border border-sand bg-cream/60 p-4">
            <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
              <Sparkles size={12} className="text-clay" /> Acceso de demostración
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => useDemo('admin@caosvintage.com', 'CaosAdmin2026!')}
                className="rounded-xl border border-sand bg-white/70 px-3 py-2.5 text-left transition hover:border-clay"
              >
                <span className="block text-[11px] font-semibold text-ink">Administradora</span>
                <span className="block text-[9px] text-muted">admin@caosvintage.com</span>
              </button>
              <button
                type="button"
                onClick={() => useDemo('cliente@caosvintage.com', 'Cliente2026!')}
                className="rounded-xl border border-sand bg-white/70 px-3 py-2.5 text-left transition hover:border-clay"
              >
                <span className="block text-[11px] font-semibold text-ink">Cliente</span>
                <span className="block text-[9px] text-muted">cliente@caosvintage.com</span>
              </button>
            </div>
            <p className="mt-2 text-[9px] leading-relaxed text-muted">
              Tocá un perfil para completar el formulario. Contraseñas incluidas en el README.
            </p>
          </div>

          <Link to="/" className="mt-6 inline-flex items-center gap-1 text-[11px] text-muted transition hover:text-clay">
            <ArrowRight size={12} className="rotate-180" /> Volver a la tienda
          </Link>
        </div>
      </div>

      <AuthAside
        title="Tu guardarropa, tu historia."
        text="Cada compra queda registrada con trazabilidad completa: sabés qué pieza es tuya y de dónde viene. Sin reposiciones infinitas."
      />
    </div>
  )
}
