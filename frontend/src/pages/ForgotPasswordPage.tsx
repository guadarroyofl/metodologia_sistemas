import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, KeyRound, Mail } from 'lucide-react'
import { api } from '../lib/api'
import { useToast } from '../context/ToastContext'
import { Field, Spinner } from '../components/ui'

interface ForgotResponse {
  message: string
  reset_token: string | null
}

export function ForgotPasswordPage() {
  const { toast } = useToast()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ForgotResponse | null>(null)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const response = await api.post<ForgotResponse>('/auth/forgot-password', { email: email.trim() })
      setResult(response)
      toast('Solicitud procesada.', 'success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos procesar la solicitud.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container-wide flex justify-center py-16">
      <div className="w-full max-w-md">
        <p className="eyebrow mb-2">Recuperación</p>
        <h1 className="font-display text-4xl text-ink">¿Olvidaste tu contraseña?</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Ingresá el email de tu cuenta y te generaremos un token para restablecerla.
        </p>

        {!result ? (
          <form onSubmit={submit} className="mt-8 space-y-4">
            <Field label="Email de la cuenta">
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
            {error && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs leading-relaxed text-red-800">
                {error}
              </p>
            )}
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? <Spinner size={16} /> : <KeyRound size={15} />}
              {loading ? 'Generando token…' : 'Solicitar recuperación'}
            </button>
          </form>
        ) : (
          <div className="mt-8 space-y-4">
            <div className="rounded-2xl border border-sage/30 bg-sage/10 px-5 py-4 text-sm leading-relaxed text-ink">
              {result.message}
            </div>
            {result.reset_token && (
              <div className="rounded-2xl border border-ochre/30 bg-ochre/10 p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a6b20]">
                  Entorno de desarrollo · sin servicio de correo
                </p>
                <p className="mt-2 text-xs leading-relaxed text-ink/70">
                  Copiá este token y usalo en la pantalla de restablecimiento:
                </p>
                <code className="mt-3 block break-all rounded-xl bg-white/70 px-3 py-2.5 text-[11px] text-ink">
                  {result.reset_token}
                </code>
                <Link
                  to={`/restablecer?token=${encodeURIComponent(result.reset_token)}`}
                  className="btn-primary mt-4 w-full"
                >
                  Restablecer contraseña <ArrowRight size={15} />
                </Link>
              </div>
            )}
            <button onClick={() => setResult(null)} className="btn-secondary w-full">
              Usar otro email
            </button>
          </div>
        )}

        <Link to="/login" className="mt-6 inline-flex items-center gap-1 text-[11px] text-muted transition hover:text-clay">
          <ArrowLeft size={12} /> Volver a iniciar sesión
        </Link>
      </div>
    </div>
  )
}
