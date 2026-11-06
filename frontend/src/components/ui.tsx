import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, Loader2, X } from 'lucide-react'
import { cn } from '../lib/format'

// ── Estados de carga y error ─────────────────────────────────────────
export function Spinner({ size = 18, className }: { size?: number; className?: string }) {
  return <Loader2 size={size} className={cn('animate-spin', className)} />
}

export function LoadingState({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center gap-4 text-muted">
      <Spinner size={28} className="text-clay" />
      <p className="text-sm">{label}</p>
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center gap-4 rounded-2xl border border-red-100 bg-red-50/50 px-6 py-10 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-100 text-red-700">
        <AlertTriangle size={20} />
      </div>
      <div>
        <p className="font-medium text-ink">Algo no salió como esperábamos</p>
        <p className="mt-1 max-w-md text-sm text-muted">{message}</p>
      </div>
      {onRetry && (
        <button onClick={onRetry} className="btn-secondary px-5 py-2 text-xs">
          Reintentar
        </button>
      )}
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-sand px-6 py-16 text-center">
      {icon && (
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-cream text-clay">
          {icon}
        </div>
      )}
      <div>
        <h3 className="font-display text-2xl text-ink">{title}</h3>
        {description && <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">{description}</p>}
      </div>
      {action}
    </div>
  )
}

// ── Badges ───────────────────────────────────────────────────────────
type BadgeTone = 'neutral' | 'clay' | 'sage' | 'sand' | 'danger' | 'dark' | 'ochre'

const BADGE_TONES: Record<BadgeTone, string> = {
  neutral: 'border-sand bg-white/70 text-muted',
  clay: 'border-clay/20 bg-clay/10 text-clay-dark',
  sage: 'border-sage/25 bg-sage/10 text-[#5c6552]',
  sand: 'border-sand bg-cream text-ink/70',
  danger: 'border-red-200 bg-red-50 text-red-700',
  dark: 'border-ink bg-ink text-cream',
  ochre: 'border-ochre/25 bg-ochre/10 text-[#8a6b20]',
}

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode
  tone?: BadgeTone
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em]',
        BADGE_TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

// ── Formularios ──────────────────────────────────────────────────────
export function Field({
  label,
  error,
  hint,
  children,
  className,
}: {
  label?: string
  error?: string | null
  hint?: string
  children: ReactNode
  className?: string
}) {
  return (
    <label className={cn('block', className)}>
      {label && <span className="label">{label}</span>}
      {children}
      {hint && !error && <span className="mt-1.5 block text-[11px] text-muted/80">{hint}</span>}
      {error && <span className="mt-1.5 block text-[11px] font-medium text-red-700">{error}</span>}
    </label>
  )
}

// ── Modal ────────────────────────────────────────────────────────────
const MODAL_SIZES = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  size?: keyof typeof MODAL_SIZES
}) {
  useEffect(() => {
    if (!open) return
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = previous
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-end justify-center p-0 sm:items-center sm:p-6">
      <button
        aria-label="Cerrar modal"
        className="absolute inset-0 bg-ink/45 backdrop-blur-[3px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative z-10 flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-paper shadow-soft sm:rounded-2xl',
          MODAL_SIZES[size],
        )}
      >
        <div className="flex items-start justify-between gap-6 border-b border-sand px-6 py-5">
          <div>
            {title && <h2 className="font-display text-2xl text-ink">{title}</h2>}
            {description && <p className="mt-1 text-sm text-muted">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-muted transition hover:bg-cream hover:text-ink"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && (
          <div className="flex flex-wrap justify-end gap-3 border-t border-sand bg-cream/40 px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  loading = false,
  danger = false,
  onConfirm,
  onClose,
}: {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  loading?: boolean
  danger?: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <button className="btn-secondary px-5 py-2 text-xs" onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          <button
            className={cn(
              'inline-flex items-center gap-2 rounded-full px-5 py-2 text-xs font-semibold text-white transition disabled:opacity-60',
              danger ? 'bg-red-700 hover:bg-red-800' : 'bg-clay hover:bg-clay-dark',
            )}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading && <Spinner size={14} />}
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-sm leading-relaxed text-muted">{description}</p>
    </Modal>
  )
}

// ── Paginación ───────────────────────────────────────────────────────
export function Pagination({
  page,
  pages,
  onChange,
}: {
  page: number
  pages: number
  onChange: (page: number) => void
}) {
  if (pages <= 1) return null
  const visible = new Set<number>([1, pages, page - 1, page, page + 1])
  const numbers = [...visible].filter((item) => item >= 1 && item <= pages).sort((a, b) => a - b)

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 pt-8">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        className="rounded-full border border-sand px-4 py-2 text-xs font-medium text-muted transition hover:border-ink hover:text-ink disabled:opacity-40"
      >
        Anterior
      </button>
      {numbers.map((number, index) => {
        const previous = numbers[index - 1]
        return (
          <span key={number} className="flex items-center gap-2">
            {previous && number - previous > 1 && <span className="text-xs text-muted">…</span>}
            <button
              onClick={() => onChange(number)}
              className={cn(
                'h-9 w-9 rounded-full text-xs font-semibold transition',
                number === page
                  ? 'bg-ink text-cream'
                  : 'border border-sand text-muted hover:border-ink hover:text-ink',
              )}
            >
              {number}
            </button>
          </span>
        )
      })}
      <button
        onClick={() => onChange(page + 1)}
        disabled={page >= pages}
        className="rounded-full border border-sand px-4 py-2 text-xs font-medium text-muted transition hover:border-ink hover:text-ink disabled:opacity-40"
      >
        Siguiente
      </button>
    </div>
  )
}

// ── Encabezados y métricas ───────────────────────────────────────────
export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  align = 'left',
}: {
  eyebrow?: string
  title: string
  description?: string
  action?: ReactNode
  align?: 'left' | 'center'
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between',
        align === 'center' && 'sm:flex-col sm:items-center',
      )}
    >
      <div className={cn('max-w-2xl', align === 'center' && 'text-center')}>
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h2 className="font-display text-3xl leading-tight text-ink sm:text-4xl">{title}</h2>
        {description && <p className="mt-2 text-sm leading-relaxed text-muted">{description}</p>}
      </div>
      {action}
    </div>
  )
}

export function StatCard({
  label,
  value,
  detail,
  icon,
  tone = 'neutral',
}: {
  label: string
  value: string
  detail?: string
  icon?: ReactNode
  tone?: 'neutral' | 'clay' | 'sage'
}) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">{label}</p>
        {icon && (
          <span
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-full',
              tone === 'clay' && 'bg-clay/10 text-clay',
              tone === 'sage' && 'bg-sage/10 text-sage',
              tone === 'neutral' && 'bg-cream text-muted',
            )}
          >
            {icon}
          </span>
        )}
      </div>
      <p className="mt-3 font-display text-3xl leading-none text-ink">{value}</p>
      {detail && <p className="mt-2 text-xs text-muted">{detail}</p>}
    </div>
  )
}

export function SearchField({
  value,
  onChange,
  placeholder = 'Buscar…',
  className,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}) {
  return (
    <div className={cn('relative', className)}>
      <svg
        className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="input pl-11"
      />
    </div>
  )
}
