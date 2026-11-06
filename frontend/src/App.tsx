import { Navigate, Route, Routes } from 'react-router-dom'
import { AdminLayout } from './components/AdminLayout'
import { RequireAdmin, RequireAuth } from './components/ProtectedRoute'
import { PublicLayout, ScrollToTop } from './components/PublicLayout'
import { AccountPage } from './pages/AccountPage'
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage'
import { AdminPricingPage } from './pages/admin/AdminPricingPage'
import { AdminProductsPage } from './pages/admin/AdminProductsPage'
import { AdminReportsPage } from './pages/admin/AdminReportsPage'
import { AdminSalesPage } from './pages/admin/AdminSalesPage'
import { AdminUsersPage } from './pages/admin/AdminUsersPage'
import { CartPage } from './pages/CartPage'
import { CatalogPage } from './pages/CatalogPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { ProductDetailPage } from './pages/ProductDetailPage'
import { RegisterPage } from './pages/RegisterPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<HomePage />} />
          <Route path="tienda" element={<CatalogPage />} />
          <Route path="producto/:id" element={<ProductDetailPage />} />
          <Route path="carrito" element={<CartPage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="registro" element={<RegisterPage />} />
          <Route path="recuperar" element={<ForgotPasswordPage />} />
          <Route path="restablecer" element={<ResetPasswordPage />} />
          <Route
            path="cuenta"
            element={
              <RequireAuth>
                <AccountPage />
              </RequireAuth>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <AdminLayout />
            </RequireAdmin>
          }
        >
          <Route index element={<AdminDashboardPage />} />
          <Route path="prendas" element={<AdminProductsPage />} />
          <Route path="ventas" element={<AdminSalesPage />} />
          <Route path="usuarios" element={<AdminUsersPage />} />
          <Route path="reportes" element={<AdminReportsPage />} />
          <Route path="precios" element={<AdminPricingPage />} />
        </Route>

        <Route path="/admin/*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </>
  )
}
