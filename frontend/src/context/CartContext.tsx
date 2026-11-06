import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { CartItem, Product } from '../types'

const CART_KEY = 'caos_cart'

interface CartContextValue {
  items: CartItem[]
  count: number
  total: number
  addItem: (product: Product) => boolean
  removeItem: (productId: number) => void
  clear: () => void
  hasItem: (productId: number) => boolean
}

const CartContext = createContext<CartContextValue | null>(null)

function readCart(): CartItem[] {
  try {
    const stored = localStorage.getItem(CART_KEY)
    if (!stored) return []
    const parsed = JSON.parse(stored) as CartItem[]
    return Array.isArray(parsed) ? parsed.filter((item) => item?.product?.id) : []
  } catch {
    return []
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(readCart)

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(items))
  }, [items])

  const addItem = useCallback((product: Product) => {
    let added = false
    setItems((current) => {
      if (current.some((item) => item.product.id === product.id)) return current
      added = true
      return [...current, { product }]
    })
    return added
  }, [])

  const removeItem = useCallback((productId: number) => {
    setItems((current) => current.filter((item) => item.product.id !== productId))
  }, [])

  const clear = useCallback(() => setItems([]), [])

  const value = useMemo<CartContextValue>(() => {
    const total = items.reduce((sum, item) => sum + Number(item.product.price), 0)
    return {
      items,
      count: items.length,
      total,
      addItem,
      removeItem,
      clear,
      hasItem: (productId: number) => items.some((item) => item.product.id === productId),
    }
  }, [items, addItem, removeItem, clear])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext)
  if (!context) throw new Error('useCart debe usarse dentro de CartProvider')
  return context
}
