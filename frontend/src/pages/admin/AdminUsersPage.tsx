import { useEffect, useState, type FormEvent } from 'react'
import {
  Mail,
  Pencil,
  Plus,
  RotateCcw,
  ShieldCheck,
  UserCheck,
  UserRound,
  Users,
  UserX,
} from 'lucide-react'
import { api } from '../../lib/api'
import { formatDate, ROLE_LABELS } from '../../lib/format'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import type { Page, Role, User } from '../../types'
import { useAuth } from '../../context/AuthContext'
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
  StatCard,
} from '../../components/ui'

interface UserForm {
  name: string
  email: string
  phone: string
  role: Role
  password: string
  is_active: boolean
}

const EMPTY_FORM: UserForm = {
  name: '',
  email: '',
  phone: '',
  role: 'client',
  password: '',
  is_active: true,
}

export function AdminUsersPage() {
  const { user: currentUser, updateUser } = useAuth()
  const { toast } = useToast()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 350)
  const [roleFilter, setRoleFilter] = useState('')
  const [activeFilter, setActiveFilter] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [form, setForm] = useState<UserForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deactivateTarget, setDeactivateTarget] = useState<User | null>(null)
  const [deactivating, setDeactivating] = useState(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    const query = new URLSearchParams({ page: String(page), page_size: '20' })
    if (debouncedSearch) query.set('search', debouncedSearch)
    if (roleFilter) query.set('role', roleFilter)
    if (activeFilter) query.set('is_active', activeFilter)

    api
      .get<Page<User>>(`/users?${query.toString()}`)
      .then((result) => {
        if (!active) return
        setUsers(result.items)
        setPages(result.pages)
        setTotal(result.total)
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'No pudimos cargar los usuarios.')
      })
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [debouncedSearch, roleFilter, activeFilter, page, reloadKey])

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setEditorOpen(true)
  }

  const openEdit = (user: User) => {
    setEditing(user)
    setForm({
      name: user.name,
      email: user.email,
      phone: user.phone ?? '',
      role: user.role,
      password: '',
      is_active: user.is_active,
    })
    setEditorOpen(true)
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!editing && form.password.length < 8) {
      toast('La contraseña debe tener al menos 8 caracteres.', 'error')
      return
    }
    setSaving(true)
    try {
      if (editing) {
        const payload: Record<string, unknown> = {
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || null,
          role: form.role,
          is_active: form.is_active,
        }
        if (form.password) payload.password = form.password
        const updated = await api.patch<User>(`/users/${editing.id}`, payload)
        if (currentUser && updated.id === currentUser.id) updateUser(updated)
        toast('Usuario actualizado correctamente.')
      } else {
        await api.post<User>('/users', {
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || null,
          role: form.role,
          password: form.password,
        })
        toast('Usuario creado correctamente.')
      }
      setEditorOpen(false)
      setReloadKey((key) => key + 1)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'No pudimos guardar el usuario.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const deactivate = async () => {
    if (!deactivateTarget) return
    setDeactivating(true)
    try {
      await api.delete<User>(`/users/${deactivateTarget.id}`)
      toast('Usuario dado de baja. No podrá volver a iniciar sesión.')
      setDeactivateTarget(null)
      setReloadKey((key) => key + 1)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'No pudimos dar de baja el usuario.', 'error')
    } finally {
      setDeactivating(false)
    }
  }

  const activate = async (user: User) => {
    try {
      await api.patch<User>(`/users/${user.id}`, { is_active: true })
      toast('Usuario reactivado.')
      setReloadKey((key) => key + 1)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'No pudimos reactivar el usuario.', 'error')
    }
  }

  const pageAdmins = users.filter((user) => user.role === 'admin').length
  const pageActive = users.filter((user) => user.is_active).length

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">Accesos</p>
          <h1 className="mt-1 font-display text-3xl leading-tight text-ink sm:text-4xl">Usuarios</h1>
          <p className="mt-1.5 text-sm text-muted">{total} cuentas registradas · roles y estado de acceso.</p>
        </div>
        <button onClick={openCreate} className="btn-primary self-start px-4 py-2 text-xs">
          <Plus size={14} /> Nuevo usuario
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Usuarios en esta página" value={String(users.length)} icon={<Users size={16} />} tone="clay" />
        <StatCard label="Administradoras" value={String(pageAdmins)} detail={`${pageActive} cuentas activas`} icon={<ShieldCheck size={16} />} tone="sage" />
        <StatCard label="Clientes" value={String(users.length - pageAdmins)} icon={<UserRound size={16} />} />
      </div>

      <div className="card p-4">
        <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr_1fr]">
          <SearchField value={search} onChange={(value) => { setSearch(value); setPage(1) }} placeholder="Buscar por nombre o email…" />
          <select value={roleFilter} onChange={(event) => { setRoleFilter(event.target.value); setPage(1) }} className="select py-3 text-xs">
            <option value="">Todos los roles</option>
            <option value="admin">Administradoras</option>
            <option value="client">Clientes</option>
          </select>
          <select value={activeFilter} onChange={(event) => { setActiveFilter(event.target.value); setPage(1) }} className="select py-3 text-xs">
            <option value="">Todos los estados</option>
            <option value="true">Activos</option>
            <option value="false">Dados de baja</option>
          </select>
        </div>
      </div>

      {loading ? (
        <LoadingState label="Cargando usuarios…" />
      ) : error ? (
        <ErrorState message={error} onRetry={() => setReloadKey((key) => key + 1)} />
      ) : users.length === 0 ? (
        <EmptyState icon={<Users size={24} />} title="No hay usuarios con estos filtros" description="Probá limpiar la búsqueda o crear una cuenta nueva." />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table-base min-w-[820px]">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Rol</th>
                  <th>Teléfono</th>
                  <th>Alta</th>
                  <th>Estado</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className={!user.is_active ? 'opacity-55' : undefined}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-clay/10 font-display text-sm text-clay-dark">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-ink">
                            {user.name}
                            {currentUser?.id === user.id && <span className="ml-1.5 text-[9px] font-medium uppercase tracking-[0.1em] text-clay">(vos)</span>}
                          </p>
                          <p className="truncate text-[10px] text-muted">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <Badge tone={user.role === 'admin' ? 'dark' : 'sand'}>{ROLE_LABELS[user.role]}</Badge>
                    </td>
                    <td className="text-xs text-muted">{user.phone || '—'}</td>
                    <td className="text-xs text-muted">{formatDate(user.created_at)}</td>
                    <td>
                      <Badge tone={user.is_active ? 'sage' : 'danger'}>
                        {user.is_active ? <><UserCheck size={10} /> Activo</> : <><UserX size={10} /> Inactivo</>}
                      </Badge>
                    </td>
                    <td>
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEdit(user)} className="rounded-lg p-2 text-muted transition hover:bg-cream hover:text-ink" title="Editar">
                          <Pencil size={14} />
                        </button>
                        {user.is_active ? (
                          <button
                            onClick={() => setDeactivateTarget(user)}
                            disabled={currentUser?.id === user.id}
                            className="rounded-lg p-2 text-muted transition hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-30"
                            title={currentUser?.id === user.id ? 'No podés darte de baja a vos misma' : 'Dar de baja'}
                          >
                            <UserX size={14} />
                          </button>
                        ) : (
                          <button onClick={() => activate(user)} className="rounded-lg p-2 text-muted transition hover:bg-sage/10 hover:text-sage" title="Reactivar">
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
        title={editing ? 'Editar usuario' : 'Nuevo usuario'}
        description="Las contraseñas se almacenan con PBKDF2 y nunca se muestran en texto plano."
        size="md"
        footer={
          <>
            <button onClick={() => setEditorOpen(false)} className="btn-secondary px-5 py-2 text-xs">Cancelar</button>
            <button onClick={() => document.getElementById('user-form-submit')?.click()} disabled={saving} className="btn-primary px-5 py-2 text-xs">
              {saving && <Spinner size={14} />}
              {editing ? 'Guardar cambios' : 'Crear usuario'}
            </button>
          </>
        }
      >
        <form onSubmit={submit} className="space-y-4">
          <Field label="Nombre completo">
            <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required minLength={2} className="input" />
          </Field>
          <Field label="Email">
            <div className="relative">
              <Mail size={15} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
              <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required className="input pl-10" />
            </div>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Teléfono">
              <input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} className="input" />
            </Field>
            <Field label="Rol">
              <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as Role })} className="select">
                <option value="client">Cliente</option>
                <option value="admin">Administradora</option>
              </select>
            </Field>
          </div>
          <Field
            label={editing ? 'Nueva contraseña (opcional)' : 'Contraseña'}
            hint={editing ? 'Dejá vacío para conservar la contraseña actual.' : 'Mínimo 8 caracteres, con letras y números.'}
          >
            <input
              type="password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              required={!editing}
              minLength={form.password ? 8 : undefined}
              className="input"
              autoComplete="new-password"
            />
          </Field>
          {editing && (
            <label className="flex cursor-pointer items-center gap-2 text-xs text-ink">
              <input type="checkbox" checked={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} className="h-4 w-4 accent-[#B4552D]" />
              Cuenta activa
            </label>
          )}
          <button id="user-form-submit" type="submit" className="hidden" />
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deactivateTarget)}
        title="Dar de baja al usuario"
        description={`${deactivateTarget?.name ?? ''} no podrá iniciar sesión ni operar en el sistema. La baja es lógica y conserva su historial de ventas.`}
        confirmLabel="Dar de baja"
        danger
        loading={deactivating}
        onConfirm={deactivate}
        onClose={() => setDeactivateTarget(null)}
      />
    </div>
  )
}
