import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  Archive,
  Check,
  ChevronDown,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Shirt,
  Sparkles,
  Tags,
  Trash2,
  X,
} from 'lucide-react'
import { api } from '../../lib/api'
import { CONDITION_LABELS, formatCurrency, handleImageError } from '../../lib/format'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import type { AdminProduct, Category, Page, ProductCondition, ProductStatus, Style } from '../../types'
import { useToast } from '../../context/ToastContext'
import {
  Badge,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Field,
  LoadingState,
  Modal,
  Pagination,
  SearchField,
  Spinner,
} from '../../components/ui'
import { ProductStatusBadge, ConditionBadge } from '../../components/StatusBadges'
import { cn } from '../../lib/format'

const CONDITIONS: ProductCondition[] = ['nuevo', 'excelente', 'muy_bueno', 'bueno', 'regular']
const STATUSES: ProductStatus[] = ['available', 'reserved', 'sold', 'archived']

interface ProductForm {
  name: string
  description: string
  category_id: string
  brand: string
  size: string
  color: string
  condition: ProductCondition
  status: ProductStatus
  purchase_cost: string
  price: string
  image_url: string
  is_featured: boolean
  is_active: boolean
  style_ids: number[]
}

const EMPTY_FORM: ProductForm = {
  name: '',
  description: '',
  category_id: '',
  brand: '',
  size: '',
  color: '',
  condition: 'muy_bueno',
  status: 'available',
  purchase_cost: '',
  price: '',
  image_url: '',
  is_featured: false,
  is_active: true,
  style_ids: [],
}

export function AdminProductsPage() {
  const { toast } = useToast()
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [styles, setStyles] = useState<Style[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 350)
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<AdminProduct | null>(null)
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<AdminProduct | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [taxonomyOpen, setTaxonomyOpen] = useState(false)

  useEffect(() => {
    Promise.all([api.get<Category[]>('/categories'), api.get<Style[]>('/styles')])
      .then(([categoryData, styleData]) => {
        setCategories(categoryData)
        setStyles(styleData)
      })
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    const query = new URLSearchParams({ page: String(page), page_size: '20' })
    if (debouncedSearch) query.set('q', debouncedSearch)
    if (categoryFilter) query.set('category_id', categoryFilter)
    if (statusFilter) query.set('status', statusFilter)

    api
      .get<Page<AdminProduct>>(`/products/admin/all?${query.toString()}`)
      .then((result) => {
        if (!active) return
        setProducts(result.items)
        setPages(result.pages)
        setTotal(result.total)
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'No pudimos cargar las prendas.')
      })
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [debouncedSearch, categoryFilter, statusFilter, page, reloadKey])

  const openCreate = () => {
    setEditing(null)
    setForm({ ...EMPTY_FORM, category_id: categories[0] ? String(categories[0].id) : '' })
    setEditorOpen(true)
  }

  const openEdit = (product: AdminProduct) => {
    setEditing(product)
    setForm({
      name: product.name,
      description: product.description,
      category_id: String(product.category.id),
      brand: product.brand ?? '',
      size: product.size ?? '',
      color: product.color ?? '',
      condition: product.condition,
      status: product.status,
      purchase_cost: String(product.purchase_cost),
      price: String(product.price),
      image_url: product.image_url ?? '',
      is_featured: product.is_featured,
      is_active: product.is_active,
      style_ids: product.styles.map((style) => style.id),
    })
    setEditorOpen(true)
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const cost = Number(form.purchase_cost)
    const price = Number(form.price)
    if (!form.category_id) {
      toast('Elegí una categoría para la prenda.', 'error')
      return
    }
    if (!Number.isFinite(cost) || cost <= 0 || !Number.isFinite(price) || price <= 0) {
      toast('Costo y precio deben ser mayores a cero.', 'error')
      return
    }
    if (price <= cost) {
      toast('El precio de venta debe ser mayor al costo de compra.', 'error')
      return
    }
    setSaving(true)
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      category_id: Number(form.category_id),
      brand: form.brand.trim() || null,
      size: form.size.trim() || null,
      color: form.color.trim() || null,
      condition: form.condition,
      status: form.status,
      purchase_cost: cost,
      price,
      image_url: form.image_url.trim() || null,
      is_featured: form.is_featured,
      style_ids: form.style_ids,
      ...(editing ? { is_active: form.is_active } : {}),
    }
    try {
      if (editing) {
        await api.patch<AdminProduct>(`/products/${editing.id}`, payload)
        toast('Prenda actualizada correctamente.')
      } else {
        await api.post<AdminProduct>('/products', payload)
        toast('Prenda creada y sumada al catálogo.')
      }
      setEditorOpen(false)
      setReloadKey((key) => key + 1)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'No pudimos guardar la prenda.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const deactivate = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.delete<{ message: string }>(`/products/${deleteTarget.id}`)
      toast('Prenda dada de baja. El historial de ventas se conserva.')
      setDeleteTarget(null)
      setReloadKey((key) => key + 1)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'No pudimos dar de baja la prenda.', 'error')
    } finally {
      setDeleting(false)
    }
  }

  const toggleFeatured = async (product: AdminProduct) => {
    try {
      await api.patch<AdminProduct>(`/products/${product.id}`, { is_featured: !product.is_featured })
      setReloadKey((key) => key + 1)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'No pudimos actualizar la prenda.', 'error')
    }
  }

  const toggleStyle = (styleId: number) => {
    setForm((current) => ({
      ...current,
      style_ids: current.style_ids.includes(styleId)
        ? current.style_ids.filter((id) => id !== styleId)
        : [...current.style_ids, styleId],
    }))
  }

  const lowMargin = useMemo(
    () => products.filter((product) => product.margin_percent < 35 && product.status === 'available').length,
    [products],
  )

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">Catálogo</p>
          <h1 className="mt-1 font-display text-3xl leading-tight text-ink sm:text-4xl">Gestión de prendas</h1>
          <p className="mt-1.5 text-sm text-muted">
            {total} prendas en el sistema{lowMargin > 0 ? ` · ${lowMargin} con margen bajo en esta página` : ''}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setTaxonomyOpen(true)} className="btn-secondary px-4 py-2 text-xs">
            <Tags size={13} /> Categorías y estilos
          </button>
          <button onClick={openCreate} className="btn-primary px-4 py-2 text-xs">
            <Plus size={14} /> Nueva prenda
          </button>
        </div>
      </div>

      <div className="card p-4">
        <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr_1fr]">
          <SearchField value={search} onChange={(value) => { setSearch(value); setPage(1) }} placeholder="Buscar por nombre, marca o SKU…" />
          <select
            value={categoryFilter}
            onChange={(event) => { setCategoryFilter(event.target.value); setPage(1) }}
            className="select py-3 text-xs"
          >
            <option value="">Todas las categorías</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(event) => { setStatusFilter(event.target.value); setPage(1) }}
            className="select py-3 text-xs"
          >
            <option value="">Todos los estados</option>
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status === 'available' ? 'Disponible' : status === 'sold' ? 'Vendida' : status === 'reserved' ? 'Reservada' : 'Archivada'}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <LoadingState label="Cargando inventario…" />
      ) : error ? (
        <ErrorState message={error} onRetry={() => setReloadKey((key) => key + 1)} />
      ) : products.length === 0 ? (
        <EmptyState
          icon={<Shirt size={24} />}
          title="No hay prendas con estos filtros"
          description="Probá limpiar la búsqueda o cargar una prenda nueva al catálogo."
          action={<button onClick={openCreate} className="btn-primary px-5 py-2 text-xs"><Plus size={13} /> Nueva prenda</button>}
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table-base min-w-[940px]">
              <thead>
                <tr>
                  <th>Prenda</th>
                  <th>Categoría</th>
                  <th>Estado</th>
                  <th className="text-right">Costo</th>
                  <th className="text-right">Precio</th>
                  <th className="text-right">Margen</th>
                  <th>Curaduría</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} className={!product.is_active ? 'opacity-55' : undefined}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-10 shrink-0 overflow-hidden rounded-lg bg-sand">
                          <img src={product.image_url || ''} alt={product.name} onError={handleImageError} className="h-full w-full object-cover" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-ink">{product.name}</p>
                          <p className="text-[10px] text-muted">{product.sku} · {product.size ?? 'único'} · {product.brand ?? 'sin marca'}</p>
                          {!product.is_active && <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-red-700">Dada de baja</span>}
                        </div>
                      </div>
                    </td>
                    <td className="text-xs text-muted">{product.category.name}</td>
                    <td>
                      <div className="flex flex-col items-start gap-1">
                        <ProductStatusBadge status={product.status} />
                        <ConditionBadge condition={product.condition} />
                      </div>
                    </td>
                    <td className="text-right text-xs text-muted">{formatCurrency(product.purchase_cost)}</td>
                    <td className="text-right text-xs font-semibold text-ink">{formatCurrency(product.price)}</td>
                    <td className="text-right">
                      <p className={cn('text-xs font-semibold', product.margin_percent < 35 ? 'text-red-700' : 'text-sage')}>
                        {product.margin_percent.toFixed(1)}%
                      </p>
                      <p className="text-[10px] text-muted">{formatCurrency(product.margin_amount)}</p>
                    </td>
                    <td>
                      <button onClick={() => toggleFeatured(product)} title="Alternar curaduría" className="rounded-full p-1.5 transition hover:bg-cream">
                        <Sparkles size={16} className={product.is_featured ? 'text-ochre' : 'text-sand'} />
                      </button>
                    </td>
                    <td>
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEdit(product)} className="rounded-lg p-2 text-muted transition hover:bg-cream hover:text-ink" title="Editar">
                          <Pencil size={14} />
                        </button>
                        {product.is_active ? (
                          <button onClick={() => setDeleteTarget(product)} className="rounded-lg p-2 text-muted transition hover:bg-red-50 hover:text-red-700" title="Dar de baja">
                            <Archive size={14} />
                          </button>
                        ) : (
                          <button
                            onClick={async () => {
                              try {
                                await api.patch<AdminProduct>(`/products/${product.id}`, { is_active: true })
                                toast('Prenda reactivada.')
                                setReloadKey((key) => key + 1)
                              } catch (err) {
                                toast(err instanceof Error ? err.message : 'No pudimos reactivar la prenda.', 'error')
                              }
                            }}
                            className="rounded-lg p-2 text-muted transition hover:bg-sage/10 hover:text-sage"
                            title="Reactivar"
                          >
                            <RotateCcw size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Pagination page={page} pages={pages} onChange={setPage} />

      <Modal
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        title={editing ? 'Editar prenda' : 'Nueva prenda'}
        description="El stock es unitario: cada fila representa una pieza física real."
        size="xl"
        footer={
          <>
            <button onClick={() => setEditorOpen(false)} className="btn-secondary px-5 py-2 text-xs">Cancelar</button>
            <button onClick={() => document.getElementById('product-form-submit')?.click()} disabled={saving} className="btn-primary px-5 py-2 text-xs">
              {saving && <Spinner size={14} />}
              {editing ? 'Guardar cambios' : 'Crear prenda'}
            </button>
          </>
        }
      >
        <form onSubmit={submit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre de la prenda" className="sm:col-span-2">
              <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required minLength={3} className="input" placeholder="Ej: Campera de cuero oversized" />
            </Field>
            <Field label="Descripción" className="sm:col-span-2">
              <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={3} className="input resize-none" placeholder="Detalles, medidas, estado real de la pieza…" />
            </Field>
            <Field label="Categoría">
              <select value={form.category_id} onChange={(event) => setForm({ ...form, category_id: event.target.value })} required className="select">
                <option value="">Elegir categoría</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Marca">
              <input value={form.brand} onChange={(event) => setForm({ ...form, brand: event.target.value })} className="input" placeholder="Levi's, Zara, sin marca…" />
            </Field>
            <Field label="Talle">
              <input value={form.size} onChange={(event) => setForm({ ...form, size: event.target.value })} className="input" placeholder="M, 38, único…" />
            </Field>
            <Field label="Color">
              <input value={form.color} onChange={(event) => setForm({ ...form, color: event.target.value })} className="input" placeholder="Negro, azul…" />
            </Field>
            <Field label="Estado de la prenda">
              <select value={form.condition} onChange={(event) => setForm({ ...form, condition: event.target.value as ProductCondition })} className="select">
                {CONDITIONS.map((condition) => (
                  <option key={condition} value={condition}>{CONDITION_LABELS[condition]}</option>
                ))}
              </select>
            </Field>
            <Field label="Disponibilidad">
              <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as ProductStatus })} className="select">
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status === 'available' ? 'Disponible' : status === 'sold' ? 'Vendida' : status === 'reserved' ? 'Reservada' : 'Archivada'}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Costo de compra (ARS)">
              <input type="number" min={1} step="0.01" value={form.purchase_cost} onChange={(event) => setForm({ ...form, purchase_cost: event.target.value })} required className="input" />
            </Field>
            <Field label="Precio de venta (ARS)" hint={form.purchase_cost && form.price && Number(form.price) > Number(form.purchase_cost) ? `Margen estimado ${(((Number(form.price) - Number(form.purchase_cost)) / Number(form.price)) * 100).toFixed(1)}%` : 'Debe ser mayor al costo.'}>
              <input type="number" min={1} step="0.01" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} required className="input" />
            </Field>
            <Field label="URL de imagen" className="sm:col-span-2">
              <input value={form.image_url} onChange={(event) => setForm({ ...form, image_url: event.target.value })} className="input" placeholder="https://…" />
            </Field>
          </div>

          <div>
            <p className="label">Estilos</p>
            <div className="flex flex-wrap gap-1.5">
              {styles.map((style) => (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => toggleStyle(style.id)}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-[10px] font-medium transition',
                    form.style_ids.includes(style.id)
                      ? 'border-ink bg-ink text-cream'
                      : 'border-sand bg-white/60 text-muted hover:border-clay hover:text-clay',
                  )}
                >
                  {style.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-5 border-t border-sand pt-4">
            <label className="flex cursor-pointer items-center gap-2 text-xs text-ink">
              <input type="checkbox" checked={form.is_featured} onChange={(event) => setForm({ ...form, is_featured: event.target.checked })} className="h-4 w-4 accent-[#B4552D]" />
              Destacar en la home
            </label>
            {editing && (
              <label className="flex cursor-pointer items-center gap-2 text-xs text-ink">
                <input type="checkbox" checked={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} className="h-4 w-4 accent-[#B4552D]" />
                Prenda activa en el sistema
              </label>
            )}
          </div>

          <button id="product-form-submit" type="submit" className="hidden" />
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Dar de baja la prenda"
        description={`“${deleteTarget?.name ?? ''}” dejará de mostrarse en el catálogo. La baja es lógica: el historial de ventas y el stock se conservan.`}
        confirmLabel="Dar de baja"
        danger
        loading={deleting}
        onConfirm={deactivate}
        onClose={() => setDeleteTarget(null)}
      />

      <Modal
        open={taxonomyOpen}
        onClose={() => setTaxonomyOpen(false)}
        title="Categorías y estilos"
        description="Administrá la taxonomía del catálogo. No se pueden borrar etiquetas con prendas asociadas."
        size="xl"
      >
        <div className="grid gap-6 sm:grid-cols-2">
          <TaxonomyManager
            title="Categorías"
            endpoint="/categories"
            items={categories}
            onRefresh={() => {
              api.get<Category[]>('/categories').then(setCategories).catch(() => undefined)
              setReloadKey((key) => key + 1)
            }}
          />
          <TaxonomyManager
            title="Estilos"
            endpoint="/styles"
            items={styles}
            onRefresh={() => {
              api.get<Style[]>('/styles').then(setStyles).catch(() => undefined)
              setReloadKey((key) => key + 1)
            }}
          />
        </div>
      </Modal>
    </div>
  )
}

function TaxonomyManager({
  title,
  endpoint,
  items,
  onRefresh,
}: {
  title: string
  endpoint: string
  items: { id: number; name: string; description: string | null }[]
  onRefresh: () => void
}) {
  const { toast } = useToast()
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingName, setEditingName] = useState('')

  const create = async (event: FormEvent) => {
    event.preventDefault()
    if (!newName.trim()) return
    try {
      await api.post(endpoint, { name: newName.trim() })
      setNewName('')
      onRefresh()
      toast(`${title.slice(0, -1)} creada.`)
    } catch (error) {
      toast(error instanceof Error ? error.message : 'No pudimos crear el registro.', 'error')
    }
  }

  const save = async (id: number) => {
    try {
      await api.patch(`${endpoint}/${id}`, { name: editingName.trim() })
      setEditingId(null)
      onRefresh()
      toast('Cambios guardados.')
    } catch (error) {
      toast(error instanceof Error ? error.message : 'No pudimos guardar el cambio.', 'error')
    }
  }

  const remove = async (id: number, name: string) => {
    try {
      await api.delete(`${endpoint}/${id}`)
      onRefresh()
      toast(`“${name}” eliminada.`)
    } catch (error) {
      toast(error instanceof Error ? error.message : 'No pudimos eliminar el registro.', 'error')
    }
  }

  return (
    <div className="rounded-2xl border border-sand bg-cream/30 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">{title}</p>
      <form onSubmit={create} className="mt-3 flex gap-2">
        <input value={newName} onChange={(event) => setNewName(event.target.value)} placeholder={`Nueva ${title.slice(0, -1).toLowerCase()}`} className="input py-2 text-xs" />
        <button type="submit" className="btn-primary shrink-0 px-3 py-2 text-xs"><Plus size={13} /></button>
      </form>
      <div className="mt-3 max-h-72 space-y-1 overflow-y-auto pr-1">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-2 rounded-lg border border-sand/60 bg-white/60 px-2.5 py-2">
            {editingId === item.id ? (
              <>
                <input value={editingName} onChange={(event) => setEditingName(event.target.value)} className="input py-1 text-xs" autoFocus />
                <button onClick={() => save(item.id)} className="rounded p-1 text-sage hover:bg-sage/10" title="Guardar"><Check size={14} /></button>
                <button onClick={() => setEditingId(null)} className="rounded p-1 text-muted hover:bg-cream" title="Cancelar"><X size={14} /></button>
              </>
            ) : (
              <>
                <span className="min-w-0 flex-1 truncate text-xs text-ink">{item.name}</span>
                <button
                  onClick={() => { setEditingId(item.id); setEditingName(item.name) }}
                  className="rounded p-1 text-muted hover:bg-cream hover:text-ink"
                  title="Editar"
                >
                  <Pencil size={13} />
                </button>
                <button onClick={() => remove(item.id, item.name)} className="rounded p-1 text-muted hover:bg-red-50 hover:text-red-700" title="Eliminar">
                  <Trash2 size={13} />
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
