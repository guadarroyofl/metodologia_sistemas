import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { cn } from '../lib/format'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: string
  message: string
  type: ToastType
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((item) => item.id !== id))
  }, [])

  const toast = useCallback(
    (message: string, type: ToastType = 'success') => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
      setToasts((current) => [...current, { id, message, type }])
      window.setTimeout(() => dismiss(id), 4500)
    },
    [dismiss],
  )

  const value = useMemo(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2">
        {toasts.map((item) => {
          const Icon = item.type === 'success' ? CheckCircle2 : item.type === 'error' ? XCircle : Info
          return (
            <div
              key={item.id}
              className={cn(
                'pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-soft backdrop-blur',
                item.type === 'success' && 'border-sage/30 bg-[#f3f5ef] text-ink',
                item.type === 'error' && 'border-red-200 bg-red-50 text-red-900',
                item.type === 'info' && 'border-sand bg-paper text-ink',
              )}
            >
              <Icon
                size={18}
                className={cn(
                  'mt-0.5 shrink-0',
                  item.type === 'success' && 'text-sage',
                  item.type === 'error' && 'text-red-600',
                  item.type === 'info' && 'text-clay',
                )}
              />
              <span className="flex-1 leading-snug">{item.message}</span>
              <button
                onClick={() => dismiss(item.id)}
                className="shrink-0 rounded-full p-0.5 text-muted transition hover:bg-black/5 hover:text-ink"
                aria-label="Cerrar notificación"
              >
                <X size={14} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast debe usarse dentro de ToastProvider')
  return context
}
