import { Link } from 'react-router-dom'
import { ArrowLeft, Search } from 'lucide-react'

export function NotFoundPage() {
  return (
    <div className="container-wide flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <p className="font-display text-[7rem] leading-none text-sand">404</p>
      <h1 className="mt-2 font-display text-4xl text-ink">Esta página no existe</h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
        Puede que la prenda se haya vendido o que el enlace esté roto. Volvé al catálogo: siempre
        hay algo nuevo para encontrar.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Link to="/tienda" className="btn-primary">
          <Search size={15} /> Explorar catálogo
        </Link>
        <Link to="/" className="btn-secondary">
          <ArrowLeft size={15} /> Volver al inicio
        </Link>
      </div>
    </div>
  )
}
