import { Link } from "react-router";

export default function NoEncontrada() {
  return (
    <section>
      <h1>404</h1>
      <p>Esta página no existe.</p>
      <Link to="/" className="boton">
        Volver al inicio
      </Link>
    </section>
  );
}
