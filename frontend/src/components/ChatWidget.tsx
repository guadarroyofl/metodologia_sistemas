import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Bot, Send, Sparkles, X } from 'lucide-react'
import { api } from '../lib/api'
import { formatCurrency, handleImageError } from '../lib/format'
import type { StylistResponse } from '../types'
import { Spinner } from './ui'

interface ChatMessage {
  id: string
  role: 'assistant' | 'user'
  text: string
  data?: StylistResponse
}

const QUICK_PROMPTS = [
  'Un look Y2K para un recital',
  'Algo vintage y elegante para cenar',
  'Denim total look con talle M',
]

const GREETING: ChatMessage = {
  id: 'initial',
  role: 'assistant',
  text:
    '¡Hola! Soy el Personal Shopper de CAOS. Contame qué plan tenés, qué estilos te gustan y tu presupuesto: te armo un look con prendas únicas disponibles.',
  data: {
    reply: '',
    detected_styles: [],
    suggestions: [],
    outfits: [],
    tips: ['Cada prenda es única: si te gusta, reservala a tiempo.'],
  },
}

export function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
    }
  }, [messages, open, loading])

  useEffect(() => {
    const openChat = () => setOpen(true)
    window.addEventListener('caos:open-chat', openChat)
    return () => window.removeEventListener('caos:open-chat', openChat)
  }, [])

  const send = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || loading) return
    const userMessage: ChatMessage = {
      id: `${Date.now()}-user`,
      role: 'user',
      text: trimmed,
    }
    setMessages((current) => [...current, userMessage])
    setInput('')
    setLoading(true)
    try {
      const response = await api.post<StylistResponse>('/ai/stylist', {
        message: trimmed,
        limit: 4,
      })
      setMessages((current) => [
        ...current,
        {
          id: `${Date.now()}-assistant`,
          role: 'assistant',
          text: response.reply,
          data: response,
        },
      ])
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'No pude conectarme con el stylist. Intentá nuevamente.'
      setMessages((current) => [
        ...current,
        { id: `${Date.now()}-error`, role: 'assistant', text: message },
      ])
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    void send(input)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="group fixed bottom-5 right-5 z-50 flex items-center gap-2.5 rounded-full bg-ink py-3 pl-4 pr-5 text-cream shadow-soft transition hover:bg-clay sm:bottom-7 sm:right-7"
        aria-label="Abrir Personal Shopper IA"
      >
        <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-clay text-white transition group-hover:bg-cream group-hover:text-clay">
          <Sparkles size={16} />
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 animate-pulse rounded-full bg-ochre" />
        </span>
        <span className="text-left leading-tight">
          <span className="block text-[9px] font-semibold uppercase tracking-[0.16em] text-cream/60">
            Asistente IA
          </span>
          <span className="block text-xs font-semibold">Personal Shopper</span>
        </span>
      </button>

      {open && (
        <div className="fixed inset-x-3 bottom-3 z-[60] flex max-h-[88vh] flex-col overflow-hidden rounded-3xl border border-sand bg-paper shadow-soft sm:inset-x-auto sm:bottom-7 sm:right-7 sm:h-[620px] sm:w-[400px]">
          <div className="flex items-center justify-between bg-ink px-5 py-4 text-cream">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-clay/20 text-clay-light">
                <Bot size={20} />
              </div>
              <div>
                <p className="font-display text-lg leading-none">Personal Shopper</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-cream/50">
                  IA de estilo · CAOS
                </p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded-full p-2 text-cream/60 transition hover:bg-cream/10 hover:text-cream"
              aria-label="Cerrar chat"
            >
              <X size={18} />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto bg-cream/40 px-4 py-5">
            {messages.map((message) => (
              <div key={message.id} className={message.role === 'user' ? 'flex justify-end' : 'space-y-3'}>
                <div
                  className={
                    message.role === 'user'
                      ? 'max-w-[85%] rounded-2xl rounded-br-sm bg-ink px-4 py-2.5 text-sm leading-relaxed text-cream'
                      : 'max-w-[92%] rounded-2xl rounded-bl-sm border border-sand bg-paper px-4 py-3 text-sm leading-relaxed text-ink shadow-sm'
                  }
                >
                  {message.text}
                </div>

                {message.data && message.data.suggestions.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <p className="px-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-muted">
                      Prendas sugeridas
                    </p>
                    <div className="flex snap-x gap-2 overflow-x-auto pb-1">
                      {message.data.suggestions.map((suggestion) => (
                        <Link
                          key={suggestion.product.id}
                          to={`/producto/${suggestion.product.id}`}
                          onClick={() => setOpen(false)}
                          className="group w-[128px] shrink-0 snap-start overflow-hidden rounded-xl border border-sand bg-paper transition hover:border-clay/40"
                        >
                          <div className="h-24 overflow-hidden bg-sand">
                            <img
                              src={suggestion.product.image_url || ''}
                              alt={suggestion.product.name}
                              onError={handleImageError}
                              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                            />
                          </div>
                          <div className="p-2">
                            <p className="line-clamp-2 text-[11px] font-semibold leading-snug text-ink">
                              {suggestion.product.name}
                            </p>
                            <p className="mt-1 text-[10px] font-semibold text-clay">
                              {formatCurrency(suggestion.product.price)}
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                    {message.data.outfits[0] && (
                      <div className="rounded-xl border border-sage/25 bg-sage/10 px-3 py-2.5">
                        <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-sage">
                          {message.data.outfits[0].title}
                        </p>
                        <p className="mt-1 text-[11px] leading-relaxed text-ink/75">
                          {message.data.outfits[0].description}
                        </p>
                      </div>
                    )}
                    {message.data.tips[0] && (
                      <p className="flex items-start gap-1.5 px-1 text-[10px] leading-relaxed text-muted">
                        <Sparkles size={11} className="mt-0.5 shrink-0 text-ochre" />
                        {message.data.tips[0]}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm border border-sand bg-paper px-4 py-3 text-xs text-muted shadow-sm">
                <Spinner size={14} className="text-clay" />
                Buscando piezas en el catálogo…
              </div>
            )}
          </div>

          {messages.length <= 1 && (
            <div className="flex gap-2 overflow-x-auto border-t border-sand/60 bg-paper px-4 py-3 no-scrollbar">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => void send(prompt)}
                  className="shrink-0 rounded-full border border-sand bg-cream/60 px-3 py-1.5 text-[10px] font-medium text-ink/70 transition hover:border-clay hover:text-clay"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={onSubmit} className="flex items-center gap-2 border-t border-sand bg-paper px-3 py-3">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ej: busco un look grunge talle M…"
              className="min-w-0 flex-1 rounded-full border border-sand bg-white/70 px-4 py-2.5 text-xs outline-none transition placeholder:text-muted/60 focus:border-clay"
              maxLength={600}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-clay text-white transition hover:bg-clay-dark disabled:opacity-40"
              aria-label="Enviar mensaje"
            >
              <Send size={15} />
            </button>
          </form>

          <div className="flex items-center justify-center gap-1 border-t border-sand/60 bg-cream/60 py-2 text-[9px] text-muted">
            Recomendaciones generadas por IA
            <ArrowUpRight size={10} />
          </div>
        </div>
      )}
    </>
  )
}
