import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, KeyRound, Lock } from 'lucide-react'
import { api } from '../lib/api'
import { useToast } from '../context/ToastContext'
import { Field, Spinner } from '../components/ui'

interface MessageResponse {
  message: string
}

export function ResetPasswordPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [token, setToken] = useState(params.get('token') ?? '')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const response = await api.post<MessageResponse>('/auth/reset-password', {
        token: token.trim(),
        new_password: password,
      })
      setDone(true)
      toast(response.message, 'success')
      window.setTimeout(() => navigate('/login', { replace: true }), 1800)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos restablecer la contraseña.')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="container-wide flex justify-center py-20">
        <div className="w-full max-w-md rounded-3xl border border-sand bg-white/60 px-8 py-12 text-center shadow-card">
          <CheckCircle2 size={40} className="mx-auto text-sage" />
          <h1 className="mt-5 font-display text-3xl text-ink">Contraseña actualizada</h1>
          <p className="mt-2 text-sm text-muted">Te estamos redirigiendo al inicio de sesión…</p>
          <Link to="/login" className="btn-primary mt-6">
            Ir a ingresar
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container-wide flex justify-center py-16">
      <div className="w-full max-w-md">
        <p className="eyebrow mb-2">Nueva contraseña</p>
        <h1 className="font-display text-4xl text-ink">Restablecer acceso</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Pegá el token que te generamos y elegí una contraseña nueva de al menos 8 caracteres con letras y números.
        </p>

        <form onSubmit={submit} className="mt-8 space-y-4">
          <Field label="Token de recuperación">
            <div className="relative">
              <KeyRound size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
              <input
                required
                minLength={10}
                value={token}
                onChange={(event) => setToken(event.target.value)}
                className="input pl-11 font-mono text-xs"
                placeholder="Pegá el token aquí"
              />
            </div>
          </Field>

          <Field label="Nueva contraseña" hint="Mínimo 8 caracteres, con letras y números.">
            <div className="relative">
              <Lock size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="input pl-11"
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </div>
          </Field>

          <Field label="Repetir contraseña">
            <div className="relative">
              <Lock size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="password"
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

          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs leading-relaxed text-red-800">
              {error}
            </p>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? <Spinner size={16} /> : <KeyRound size={15} />}
            {loading ? 'Actualizando…' : 'Cambiar contraseña'}
          </button>
        </form>

        <Link to="/login" className="mt-6 inline-flex items-center gap-1 text-[11px] text-muted transition hover:text-clay">
          <ArrowLeft size={12} /> Volver a iniciar sesión
        </Link>
      </div>
    </div>
  )
}
