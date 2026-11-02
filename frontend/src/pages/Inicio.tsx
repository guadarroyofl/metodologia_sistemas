import { Link } from "react-router";

export default function Inicio() {
  return (
    <section className="hero">
      <h1>Ropa vintage de feria, una sola de cada una</h1>
      <p>
        Prendas elegidas a mano. Si te gusta, es tuya antes de que se la lleve
        otra persona.
      </p>
      <Link to="/catalogo" className="boton">
        Ver catálogo
      </Link>
    </section>
  );
}
