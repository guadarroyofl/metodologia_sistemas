import { NavLink, Outlet } from "react-router";

export default function Layout() {
  return (
    <div className="layout">
      <header className="navbar">
        <NavLink to="/" className="logo">
          CAOS
        </NavLink>
        <nav className="navbar-links">
          <NavLink to="/catalogo">Catálogo</NavLink>
        </nav>
      </header>

      <main className="contenido">
        <Outlet />
      </main>

      <footer className="footer">CAOS Vintage · cada prenda es única</footer>
    </div>
  );
}
