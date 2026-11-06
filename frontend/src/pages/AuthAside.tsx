import { Sparkles } from 'lucide-react'
import { handleImageError } from '../lib/format'

export function AuthAside({ title, text }: { title: string; text: string }) {
  return (
    <aside className="relative hidden overflow-hidden bg-ink lg:block">
      <img
        src="https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1400&q=80"
        alt="Percheros con ropa vintage"
        onError={handleImageError}
        className="absolute inset-0 h-full w-full object-cover opacity-45"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/50 to-transparent" />
      <div className="relative flex h-full flex-col justify-end p-12 text-cream">
        <Sparkles size={22} className="text-clay-light" />
        <h2 className="mt-5 max-w-md font-display text-5xl leading-[1.05]">{title}</h2>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-cream/65">{text}</p>
        <div className="mt-8 flex gap-6 border-t border-cream/15 pt-5 text-[10px] uppercase tracking-[0.16em] text-cream/40">
          <span>Stock unitario</span>
          <span>Curaduría real</span>
          <span>Moda circular</span>
        </div>
      </div>
    </aside>
  )
}
