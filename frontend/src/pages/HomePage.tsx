import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Leaf,
  MessageCircle,
  Package,
  RefreshCcw,
  Sparkles,
  Star,
} from 'lucide-react'
import { api } from '../lib/api'
import { formatCurrency, handleImageError } from '../lib/format'
import type { Product, Style } from '../types'
import { ProductCard } from '../components/ProductCard'
import { SectionHeading } from '../components/ui'

const STYLE_TONES = [
  'bg-[#efe4d3]',
  'bg-[#e6e7de]',
  'bg-[#ead9d0]',
  'bg-[#efe8d6]',
  'bg-[#e2e6e2]',
  'bg-[#eadfd6]',
]

const MARQUEE = ['VINTAGE', 'Y2K', 'DENIM', 'BAND TEE', 'GRUNGE', 'STREETWEAR', 'PREPPY', 'BOHO']

export function HomePage() {
  const [featured, setFeatured] = useState<Product[]>([])
  const [styles, setStyles] = useState<Style[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    Promise.all([
      api.get<Product[]>('/products/featured?limit=6'),
      api.get<Style[]>('/styles'),
      api.get<{ total: number }>('/products?page_size=1'),
    ])
      .then(([featuredData, stylesData, productsPage]) => {
        if (!active) return
        setFeatured(featuredData)
        setStyles(stylesData)
        setTotal(productsPage.total)
      })
      .catch(() => undefined)
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [])

  const openChat = () => {
    window.dispatchEvent(new CustomEvent('caos:open-chat'))
  }

  return (
    <div>
      {/* Hero */}
      <section className="hero-wash relative overflow-hidden">
        <div className="container-wide grid items-center gap-12 py-14 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:py-20">
          <div className="relative z-10 animate-fade-up">
            <p className="eyebrow mb-5">Curaduría circular · Buenos Aires</p>
            <h1 className="display-title max-w-xl">
              Ropa con historia.
              <br />
              <em className="font-normal italic text-clay">Una sola unidad.</em>
            </h1>
            <p className="mt-6 max-w-md text-[15px] leading-relaxed text-muted">
              Seleccionamos prendas vintage y de segunda mano en ferias americanas. Cada pieza se
              fotografía, se mide y se describe con honestidad. Cuando se vende, se vende para
              siempre.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/tienda" className="btn-primary">
                Explorar catálogo <ArrowRight size={16} />
              </Link>
              <button onClick={openChat} className="btn-secondary">
                <Sparkles size={15} /> Hablar con el stylist
              </button>
            </div>
            <div className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-3 text-[11px] font-medium text-muted">
              <span className="flex items-center gap-1.5">
                <BadgeCheck size={14} className="text-sage" /> Stock unitario real
              </span>
              <span className="flex items-center gap-1.5">
                <Leaf size={14} className="text-sage" /> Moda circular
              </span>
              <span className="flex items-center gap-1.5">
                <Package size={14} className="text-sage" /> Envíos a todo el país
              </span>
            </div>
          </div>

          <div className="relative mx-auto grid w-full max-w-[540px] grid-cols-[1.1fr_0.9fr] gap-4">
            <div className="mt-10 overflow-hidden rounded-[2rem] rounded-tl-[5rem] bg-sand shadow-soft">
              <img
                src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=900&q=80"
                alt="Selección de ropa vintage"
                onError={handleImageError}
                className="h-[420px] w-full object-cover sm:h-[500px]"
              />
            </div>
            <div className="flex flex-col gap-4">
              <div className="overflow-hidden rounded-[1.6rem] bg-sand shadow-card">
                <img
                  src="https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=700&q=80"
                  alt="Look editorial de CAOS Vintage"
                  onError={handleImageError}
                  className="h-[250px] w-full object-cover"
                />
              </div>
              <div className="rounded-[1.6rem] bg-ink p-5 text-cream shadow-card">
                <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-cream/45">
                  Drop actual
                </p>
                <p className="mt-2 font-display text-2xl leading-tight">
                  {total > 0 ? `${total} piezas` : 'Curaduría'}
                  <br />
                  <span className="text-clay-light">disponibles</span>
                </p>
                <p className="mt-3 text-[11px] leading-relaxed text-cream/55">
                  Sin reposición. Cuando una pieza se va, deja lugar a otra historia.
                </p>
                <Link
                  to="/tienda"
                  className="mt-4 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-cream transition hover:text-clay-light"
                >
                  Ver todas <ArrowUpRight size={12} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Marquee */}
      <div className="overflow-hidden border-y border-sand bg-cream/60 py-4">
        <div className="flex w-max animate-marquee items-center gap-8">
          {[...MARQUEE, ...MARQUEE, ...MARQUEE, ...MARQUEE].map((item, index) => (
            <span key={`${item}-${index}`} className="flex items-center gap-8">
              <span className="text-[10px] font-semibold tracking-[0.32em] text-ink/45">{item}</span>
              <span className="h-1 w-1 rotate-45 bg-clay/50" />
            </span>
          ))}
        </div>
      </div>

      {/* Featured */}
      <section className="container-wide py-16 lg:py-24">
        <SectionHeading
          eyebrow="Selección de la semana"
          title="Piezas que no se repiten"
          description="Una vitrina curada por nosotras: texturas, épocas y siluetas que conviven en un mismo guardarropa."
          action={
            <Link to="/tienda" className="link-underline text-sm">
              Ver catálogo completo <ArrowRight size={14} />
            </Link>
          }
        />
        <div className="mt-10 grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 lg:gap-x-7">
          {loading
            ? Array.from({ length: 6 }).map((_, index) => (
                <div key={index}>
                  <div className="skeleton aspect-[4/5] rounded-2xl" />
                  <div className="skeleton mt-4 h-4 w-2/3" />
                  <div className="skeleton mt-2 h-3 w-1/3" />
                </div>
              ))
            : featured.map((product, index) => (
                <ProductCard key={product.id} product={product} index={index} />
              ))}
        </div>
        {!loading && featured.length === 0 && (
          <p className="mt-8 rounded-2xl border border-dashed border-sand px-6 py-10 text-center text-sm text-muted">
            Estamos preparando el próximo drop. Volvé pronto.
          </p>
        )}
      </section>

      {/* Styles */}
      <section id="estilos" className="border-y border-sand bg-cream/50 py-16 lg:py-24">
        <div className="container-wide">
          <SectionHeading
            eyebrow="Encontrá tu lenguaje"
            title="Un guardarropa, muchos estilos"
            description="Filtrá por las etiquetas que nos ayudan a describir cada prenda. Mezclalas sin miedo."
          />
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {styles.slice(0, 6).map((style, index) => (
              <Link
                key={style.id}
                to={`/tienda?style=${style.slug}`}
                className={`group relative overflow-hidden rounded-2xl border border-ink/5 p-6 transition hover:-translate-y-0.5 hover:shadow-card ${STYLE_TONES[index % STYLE_TONES.length]}`}
              >
                <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-ink/40">
                  0{index + 1}
                </p>
                <h3 className="mt-8 font-display text-3xl text-ink">{style.name}</h3>
                <p className="mt-2 max-w-xs text-xs leading-relaxed text-ink/55">
                  {style.description}
                </p>
                <span className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full border border-ink/10 text-ink transition group-hover:bg-ink group-hover:text-cream">
                  <ArrowUpRight size={15} />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* AI */}
      <section className="container-wide py-16 lg:py-24">
        <div className="relative overflow-hidden rounded-[2rem] bg-ink px-6 py-12 text-cream sm:px-12 lg:grid lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-14 lg:px-16 lg:py-16">
          <div className="paper-texture absolute inset-0 opacity-[0.06]" />
          <div className="relative">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-clay-light">
              Personal Shopper IA
            </p>
            <h2 className="mt-4 max-w-lg font-display text-4xl leading-[1.08] text-cream sm:text-5xl">
              No sabés qué ponerte.
              <br />
              <span className="text-clay-light">Nosotras sí.</span>
            </h2>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-cream/60">
              Contale a nuestro asistente el plan, tu talle, tus estilos favoritos y tu presupuesto.
              Te devuelve combinaciones reales con las prendas únicas que hoy están disponibles.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <button onClick={openChat} className="btn-clay">
                <MessageCircle size={16} /> Abrir el chat de estilo
              </button>
              <Link
                to="/tienda"
                className="inline-flex items-center gap-2 rounded-full border border-cream/20 px-6 py-3 text-sm font-semibold text-cream transition hover:border-cream/50"
              >
                Inspirarme <ArrowRight size={15} />
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[10px] uppercase tracking-[0.14em] text-cream/35">
              <span>· Recomendaciones explicadas</span>
              <span>· Sin registro</span>
              <span>· Stock real</span>
            </div>
          </div>

          <div className="relative mt-10 lg:mt-0">
            <div className="mx-auto max-w-sm rounded-3xl border border-cream/10 bg-cream/5 p-4 backdrop-blur">
              <div className="flex items-center gap-2.5 border-b border-cream/10 pb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-clay/25 text-clay-light">
                  <Sparkles size={15} />
                </div>
                <div>
                  <p className="text-xs font-semibold">Personal Shopper</p>
                  <p className="text-[9px] uppercase tracking-[0.16em] text-cream/40">En línea</p>
                </div>
                <span className="ml-auto flex h-2 w-2 rounded-full bg-sage" />
              </div>
              <div className="space-y-3 py-4">
                <p className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-clay px-3.5 py-2 text-[11px] leading-relaxed text-white">
                  Busco algo Y2K para un recital, talle M, hasta $60.000.
                </p>
                <div className="max-w-[92%] rounded-2xl rounded-bl-sm bg-cream/10 px-3.5 py-2.5 text-[11px] leading-relaxed text-cream/80">
                  ¡Hola! Encontré una campera denim con bordado y una falda mini que funcionan
                  perfecto juntas. ¿Te armo el look completo?
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="overflow-hidden rounded-xl border border-cream/10">
                    <img
                      src="https://images.unsplash.com/photo-1544022613-e87ca75a784a?auto=format&fit=crop&w=400&q=80"
                      alt="Campera denim"
                      onError={handleImageError}
                      className="h-24 w-full object-cover"
                    />
                    <p className="px-2 py-1.5 text-[9px] text-cream/60">Campera denim · $45.990</p>
                  </div>
                  <div className="overflow-hidden rounded-xl border border-cream/10">
                    <img
                      src="https://images.unsplash.com/photo-1582142306909-195724d33ffc?auto=format&fit=crop&w=400&q=80"
                      alt="Falda denim"
                      onError={handleImageError}
                      className="h-24 w-full object-cover"
                    />
                    <p className="px-2 py-1.5 text-[9px] text-cream/60">Falda denim · $36.990</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-cream/10 px-3 py-2 text-[10px] text-cream/30">
                Escribí tu consulta…
                <ArrowUpRight size={12} className="ml-auto" />
              </div>
            </div>
            <div className="absolute -right-2 -top-4 rotate-6 rounded-xl bg-ochre px-3 py-2 text-[9px] font-bold uppercase tracking-[0.12em] text-ink shadow-card">
              IA + curaduría
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-sand bg-cream/40 py-16 lg:py-20">
        <div className="container-wide">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
            <div>
              <p className="eyebrow mb-3">Cómo funciona</p>
              <h2 className="font-display text-4xl leading-tight text-ink">
                Menos volumen.
                <br />
                Más intención.
              </h2>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">
                El stock unitario nos obliga a trabajar distinto: cada prenda se piensa, se cuida
                y se vende una sola vez.
              </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-3">
              {[
                {
                  icon: Star,
                  step: '01',
                  title: 'Curamos',
                  text: 'Recorremos ferias y seleccionamos piezas por calidad, historia y potencial de estilo.',
                },
                {
                  icon: RefreshCcw,
                  step: '02',
                  title: 'Documentamos',
                  text: 'Medidas, marcas, estado y detalles reales. Lo que ves es lo que llega.',
                },
                {
                  icon: Package,
                  step: '03',
                  title: 'Entregamos',
                  text: 'Preparamos tu pieza con cuidado y la enviamos a cualquier punto del país.',
                },
              ].map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.step} className="border-t border-ink/15 pt-5">
                    <div className="flex items-center justify-between">
                      <Icon size={18} className="text-clay" />
                      <span className="font-display text-sm text-muted/60">{item.step}</span>
                    </div>
                    <h3 className="mt-5 font-display text-xl text-ink">{item.title}</h3>
                    <p className="mt-2 text-xs leading-relaxed text-muted">{item.text}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* About */}
      <section id="nosotras" className="container-wide py-16 lg:py-24">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="relative">
            <div className="overflow-hidden rounded-[2rem] rounded-br-[5rem] bg-sand">
              <img
                src="https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1100&q=80"
                alt="Percheros con ropa vintage"
                onError={handleImageError}
                className="h-[380px] w-full object-cover sm:h-[460px]"
              />
            </div>
            <div className="absolute -bottom-5 right-5 max-w-[220px] rounded-2xl bg-paper p-5 shadow-soft sm:right-10">
              <p className="font-display text-3xl text-clay">+2.400</p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-muted">
                prendas con segunda oportunidad
              </p>
            </div>
          </div>
          <div>
            <p className="eyebrow mb-3">Sobre CAOS</p>
            <h2 className="font-display text-4xl leading-tight text-ink sm:text-5xl">
              Creemos que la ropa
              <br />
              <em className="font-normal italic text-clay">puede tener otra vida.</em>
            </h2>
            <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted">
              <p>
                CAOS nació de una obsesión simple: encontrar esa prenda que no sabías que estabas
                buscando. Recorremos ferias americanas, revisamos cada costura y elegimos solo lo
                que volveríamos a usar.
              </p>
              <p>
                No vendemos tendencias efímeras ni reposiciones infinitas. Vendemos piezas únicas
                con una trazabilidad clara: sabés cuánto costó, de dónde viene y por qué vale lo
                que vale.
              </p>
            </div>
            <div className="mt-8 flex flex-wrap gap-5">
              <div className="rounded-xl border border-sand bg-white/60 px-5 py-4">
                <p className="font-display text-2xl text-ink">{total || 14}</p>
                <p className="text-[9px] uppercase tracking-[0.16em] text-muted">Piezas disponibles</p>
              </div>
              <div className="rounded-xl border border-sand bg-white/60 px-5 py-4">
                <p className="font-display text-2xl text-ink">1</p>
                <p className="text-[9px] uppercase tracking-[0.16em] text-muted">Unidad por prenda</p>
              </div>
              <div className="rounded-xl border border-sand bg-white/60 px-5 py-4">
                <p className="font-display text-2xl text-ink">100%</p>
                <p className="text-[9px] uppercase tracking-[0.16em] text-muted">Moda circular</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="container-wide pb-20">
        <div className="flex flex-col items-center gap-6 rounded-[2rem] border border-sand bg-cream px-6 py-14 text-center">
          <Sparkles size={22} className="text-clay" />
          <h2 className="max-w-xl font-display text-4xl leading-tight text-ink">
            Tu próxima pieza favorita ya existe.
            <br />
            <span className="text-clay">Solo hay que encontrarla.</span>
          </h2>
          <p className="max-w-md text-sm text-muted">
            Explorá el catálogo completo o dejate guiar por el Personal Shopper IA.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/tienda" className="btn-primary">
              Ver catálogo <ArrowRight size={16} />
            </Link>
            <button onClick={openChat} className="btn-secondary">
              <Sparkles size={15} /> Quiero asesoría
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
