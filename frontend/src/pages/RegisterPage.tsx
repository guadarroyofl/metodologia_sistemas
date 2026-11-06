import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, Eye, EyeOff, Lock, Mail, Phone, User } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { Field, Spinner } from '../components/ui'
import { AuthAside } from './AuthAside'

interface LocationState {
  from?: string
}

export function RegisterPage() {
  const { user, register } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as LocationState | null)?.from

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user) navigate(user.role === 'admin' ? '/admin' : (from || '/cuenta'), { replace: true })
  }, [user, from, navigate])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const created = await register({
        name: name.trim(),
        email: email.trim(),
        password,
        phone: phone.trim() || undefined,
      })
      toast(`¡Bienvenida a CAOS, ${created.name.split(' ')[0]}!`, 'success')
      navigate(from || '/cuenta', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos crear tu cuenta.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid min-h-[calc(100vh-113px)] lg:grid-cols-[1fr_1.05fr]">
      <div className="flex items-center justify-center px-5 py-14 sm:px-10">
        <div className="w-full max-w-md">
          <p className="eyebrow mb-2">Nueva cuenta</p>
          <h1 className="font-display text-4xl text-ink sm:text-5xl">Sumate a CAOS</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Creá tu cuenta de cliente para comprar piezas únicas y seguir el historial de tus compras.
          </p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <Field label="Nombre completo">
              <div className="relative">
                <User size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="input pl-11"
                  placeholder="Tu nombre y apellido"
                  autoComplete="name"
                />
              </div>
            </Field>

            <Field label="Email">
              <div className="relative">
                <Mail size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="input pl-11"
                  placeholder="tu@email.com"
                  autoComplete="email"
                />
              </div>
            </Field>

            <Field label="Teléfono (opcional)">
              <div className="relative">
                <Phone size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  className="input pl-11"
                  placeholder="+54 9 11 0000 0000"
                  autoComplete="tel"
                />
              </div>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Contraseña" hint="Mínimo 8 caracteres, con letras y números.">
                <div className="relative">
                  <Lock size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="input px-11"
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted transition hover:text-ink"
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </Field>
              <Field label="Repetir contraseña">
                <div className="relative">
                  <Lock size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={confirm}
                    onChange={(event) => setConfirm(event.target.value)}
                    className="input pl-11"
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                </div>
              </Field>
            </div>

            {error && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs leading-relaxed text-red-800">
                {error}
              </p>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? <Spinner size={16} /> : <ArrowRight size={15} />}
              {loading ? 'Creando cuenta…' : 'Crear mi cuenta'}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-muted">
            ¿Ya tenés cuenta?{' '}
            <Link to="/login" className="font-semibold text-clay transition hover:text-clay-dark">
              Iniciar sesión
            </Link>
          </p>
        </div>
      </div>

      <AuthAside
        title="Menos volumen. Más intención."
        text="No vendemos tendencias efímeras ni reposiciones infinitas. Vendemos piezas únicas, con una trazabilidad clara y una segunda oportunidad."
      />
    </div>
  )
}
